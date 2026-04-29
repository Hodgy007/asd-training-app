import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import { buildScormExport, type ExportLesson } from '../export-builder'
import { parseScormManifest } from '../manifest'

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function lesson(overrides: Partial<ExportLesson> = {}): ExportLesson {
  return {
    id: 'lesson-1',
    title: 'Lesson 1',
    type: 'TEXT',
    content: '<p>Hello</p>',
    videoUrl: null,
    transcript: null,
    interactiveBlocks: [],
    attachments: [],
    quizQuestions: [],
    ...overrides,
  }
}

describe('buildScormExport', () => {
  it('produces a SCORM 1.2 zip with manifest, shared assets, and one lesson per SCO', async () => {
    const result = await buildScormExport({
      moduleId: 'm1',
      moduleTitle: 'My Module',
      lessons: [lesson({ id: 'l1', title: 'L1' }), lesson({ id: 'l2', title: 'L2' })],
      fetchAsset: async () => ({ buffer: Buffer.alloc(0), contentType: 'application/octet-stream' }),
    })

    const zip = await JSZip.loadAsync(result.zip)
    expect(zip.file('imsmanifest.xml')).not.toBeNull()
    expect(zip.file('shared/style.css')).not.toBeNull()
    expect(zip.file('shared/scorm-api.js')).not.toBeNull()
    expect(zip.file('lessons/l1/index.html')).not.toBeNull()
    expect(zip.file('lessons/l2/index.html')).not.toBeNull()

    const manifestXml = await zip.file('imsmanifest.xml')!.async('string')
    const parsed = parseScormManifest(manifestXml)
    expect(parsed.entryPath).toBe('lessons/l1/index.html')
    expect(parsed.toc).toHaveLength(2)
  })

  it('skips SCORM-typed lessons and reports them in the result', async () => {
    const result = await buildScormExport({
      moduleId: 'm1',
      moduleTitle: 'M',
      lessons: [
        lesson({ id: 'text-l', title: 'Text', type: 'TEXT' }),
        lesson({ id: 'scorm-l', title: 'Scorm', type: 'SCORM' }),
      ],
      fetchAsset: async () => ({ buffer: Buffer.alloc(0), contentType: 'application/octet-stream' }),
    })

    expect(result.skipped).toEqual([
      expect.objectContaining({ lessonId: 'scorm-l', lessonTitle: 'Scorm' }),
    ])
    const zip = await JSZip.loadAsync(result.zip)
    expect(zip.file('lessons/text-l/index.html')).not.toBeNull()
    expect(zip.file('lessons/scorm-l/index.html')).toBeNull()
  })

  it('exports linked SURVEY lessons as survey SCOs without narrating placeholder copy', async () => {
    const ttsCalls: string[] = []
    const result = await buildScormExport({
      moduleId: 'm1',
      moduleTitle: 'M',
      lessons: [
        lesson({ id: 'text-l', title: 'What is autism?', type: 'TEXT', content: '<p>Actual training lesson.</p>' }),
        lesson({
          id: 'survey-l',
          title: 'Pre-training survey',
          type: 'SURVEY',
          content: '<p>Please carry out our survey.</p>',
          survey: {
            id: 'survey-1',
            title: 'Learner confidence',
            description: 'Tell us how confident you feel before training.',
            questions: [
              {
                id: 'sq-1',
                type: 'MULTIPLE_CHOICE',
                question: 'How confident are you?',
                options: JSON.stringify(['Not confident', 'Quite confident']),
                required: true,
              },
              {
                id: 'sq-2',
                type: 'FREE_TEXT',
                question: 'Anything else?',
                options: null,
                required: false,
              },
            ],
          },
        }),
      ],
      fetchAsset: async () => ({ buffer: Buffer.alloc(0), contentType: 'application/octet-stream' }),
      resolveTts: async (text) => {
        ttsCalls.push(text)
        return Buffer.from([0xff, 0xfb, 0x90, 0x44])
      },
    })

    expect(result.skipped).toEqual([])
    expect(ttsCalls.join(' ')).not.toContain('Please carry out our survey')
    const zip = await JSZip.loadAsync(result.zip)
    expect(zip.file('lessons/text-l/index.html')).not.toBeNull()
    expect(zip.file('lessons/survey-l/index.html')).not.toBeNull()
    const surveyHtml = await zip.file('lessons/survey-l/index.html')!.async('string')
    expect(surveyHtml).toContain('Tell us how confident you feel before training.')
    expect(surveyHtml).toContain('How confident are you?')
    expect(surveyHtml).toContain('Not confident')
    expect(surveyHtml).toContain('id="survey-data"')
    expect(surveyHtml).toContain('cmi.core.lesson_status')
    expect(surveyHtml).toContain('cmi.suspend_data')
    expect(surveyHtml).not.toContain('Please carry out our survey')
    const manifestXml = await zip.file('imsmanifest.xml')!.async('string')
    expect(manifestXml).toContain('What is autism?')
    expect(manifestXml).toContain('Pre-training survey')
  })

  it('throws when no lessons are exportable', async () => {
    await expect(
      buildScormExport({
        moduleId: 'm1',
        moduleTitle: 'M',
        lessons: [lesson({ type: 'SCORM' }), lesson({ id: 'survey-l', type: 'SURVEY' })],
        fetchAsset: async () => ({ buffer: Buffer.alloc(0), contentType: '' }),
      }),
    ).rejects.toThrow(/no exportable lessons/i)
  })

  it('downloads images referenced in prose and rewrites src to a relative path', async () => {
    const fetchCalls: string[] = []
    const result = await buildScormExport({
      moduleId: 'm1',
      moduleTitle: 'M',
      lessons: [
        lesson({
          id: 'l1',
          content: '<p>Hi</p><img src="https://blob.example.com/foo.png" />',
        }),
      ],
      fetchAsset: async (url) => {
        fetchCalls.push(url)
        return { buffer: PNG_HEADER, contentType: 'image/png' }
      },
    })

    expect(fetchCalls).toEqual(['https://blob.example.com/foo.png'])
    const zip = await JSZip.loadAsync(result.zip)
    const html = await zip.file('lessons/l1/index.html')!.async('string')
    expect(html).not.toContain('https://blob.example.com/foo.png')
    expect(html).toContain('assets/asset-1.png')
    expect(zip.file('lessons/l1/assets/asset-1.png')).not.toBeNull()
  })

  it('bundles lesson attachments and lists them in the resources block', async () => {
    const result = await buildScormExport({
      moduleId: 'm1',
      moduleTitle: 'M',
      lessons: [
        lesson({
          id: 'l1',
          attachments: [
            { id: 'a1', fileName: 'guide.pdf', url: 'https://blob.example.com/guide.pdf' },
          ],
        }),
      ],
      fetchAsset: async () => ({
        buffer: Buffer.from('%PDF-1.4'),
        contentType: 'application/pdf',
      }),
    })

    const zip = await JSZip.loadAsync(result.zip)
    expect(zip.file('lessons/l1/assets/guide.pdf')).not.toBeNull()
    const html = await zip.file('lessons/l1/index.html')!.async('string')
    expect(html).toContain('href="assets/guide.pdf"')
    expect(html).toContain('guide.pdf')
  })

  it('embeds quiz JSON when a lesson has quiz questions', async () => {
    const result = await buildScormExport({
      moduleId: 'm1',
      moduleTitle: 'M',
      lessons: [
        lesson({
          id: 'l1',
          quizQuestions: [
            {
              id: 'q1',
              question: 'What is 2+2?',
              options: JSON.stringify(['3', '4', '5']),
              correctAnswer: '4',
              explanation: 'Basic arithmetic.',
            },
          ],
        }),
      ],
      fetchAsset: async () => ({ buffer: Buffer.alloc(0), contentType: '' }),
    })

    const zip = await JSZip.loadAsync(result.zip)
    const html = await zip.file('lessons/l1/index.html')!.async('string')
    expect(html).toContain('id="quiz-data"')
    expect(html).toContain('"What is 2+2?"')
    expect(html).toContain('"correctAnswer":"4"')
  })

  it('renders interactive blocks instead of leaving [INTERACTIVE:…] markers in the output', async () => {
    const carouselBlock = {
      id: 'blk-1',
      type: 'carousel',
      title: 'Four areas of difference',
      instructions: 'Tap the slides to learn more.',
      order: 0,
      data: {
        slides: [
          {
            id: 's1',
            title: 'Communication',
            imageUrl: 'https://blob.example.com/communication.png',
            body: 'Autistic people may communicate differently.',
          },
          {
            id: 's2',
            title: 'Social interaction',
            imageUrl: 'https://blob.example.com/social.png',
            body: 'Social cues can be processed differently.',
          },
        ],
      },
    }
    const result = await buildScormExport({
      moduleId: 'm1',
      moduleTitle: 'Autism in the workplace',
      lessons: [
        lesson({
          id: 'l1',
          title: 'What is autism?',
          content:
            '<p>Intro</p><p>[INTERACTIVE:blk-1]</p><p>Closing line.</p>',
          interactiveBlocks: [carouselBlock],
        }),
      ],
      fetchAsset: async () => ({
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
        contentType: 'image/png',
      }),
    })

    const zip = await JSZip.loadAsync(result.zip)
    const html = await zip.file('lessons/l1/index.html')!.async('string')

    // Marker is gone. Block is rendered.
    expect(html).not.toContain('[INTERACTIVE:blk-1]')
    expect(html).toContain('Four areas of difference')
    expect(html).toContain('Communication')
    expect(html).toContain('Social interaction')
    // Carousel JS hooks are present.
    expect(html).toMatch(/data-carousel/i)
    // Interactive-block CSS class is on the section.
    expect(html).toContain('ib-carousel')
  })

  it('downloads interactive-block media into the lesson asset folder', async () => {
    const fetched: string[] = []
    const result = await buildScormExport({
      moduleId: 'm1',
      moduleTitle: 'M',
      lessons: [
        lesson({
          id: 'l1',
          content: '<p>[INTERACTIVE:blk-1]</p>',
          interactiveBlocks: [
            {
              id: 'blk-1',
              type: 'hotspot',
              title: 'Brain regions',
              instructions: 'Click each dot.',
              order: 0,
              data: {
                variant: 'image-hotspot',
                imageUrl: 'https://blob.example.com/brain.png',
                hotspots: [
                  { id: 'h1', x: 25, y: 30, radius: 18, title: 'Frontal', content: 'Decision making.' },
                ],
              },
            },
          ],
        }),
      ],
      fetchAsset: async (url) => {
        fetched.push(url)
        return { buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]), contentType: 'image/png' }
      },
    })

    expect(fetched).toContain('https://blob.example.com/brain.png')
    const zip = await JSZip.loadAsync(result.zip)
    // The brain image lands under lessons/l1/assets/.
    const assetFiles = Object.keys(zip.files).filter((f) =>
      f.startsWith('lessons/l1/assets/'),
    )
    expect(assetFiles.length).toBeGreaterThan(0)
    const html = await zip.file('lessons/l1/index.html')!.async('string')
    expect(html).not.toContain('https://blob.example.com/brain.png')
    expect(html).toMatch(/src="assets\/asset-\d+\.png"/)
    // Hotspot dot uses the hotspot id, not the absolute URL.
    expect(html).toContain('data-hotspot-target="h1"')
    expect(html).toContain('Frontal')
    expect(html).toContain('Decision making.')
  })

  it('bundles the shared scorm-blocks.js runtime', async () => {
    const result = await buildScormExport({
      moduleId: 'm1',
      moduleTitle: 'M',
      lessons: [lesson({ id: 'l1' })],
      fetchAsset: async () => ({ buffer: Buffer.alloc(0), contentType: '' }),
    })
    const zip = await JSZip.loadAsync(result.zip)
    expect(zip.file('shared/scorm-blocks.js')).not.toBeNull()
    const blocksJs = await zip.file('shared/scorm-blocks.js')!.async('string')
    expect(blocksJs).toContain('data-carousel')
    expect(blocksJs).toContain('ib-card')
  })

  it('renders carousel slide body as HTML, not as escaped text', async () => {
    const carouselBlock = {
      id: 'blk-1',
      type: 'carousel',
      title: 'C',
      instructions: '',
      order: 0,
      data: {
        slides: [
          { id: 's1', title: 'Slide 1', imageUrl: '', body: '<p>This is <strong>important</strong> text.</p>' },
        ],
      },
    }
    const result = await buildScormExport({
      moduleId: 'm1',
      moduleTitle: 'M',
      lessons: [
        lesson({ id: 'l1', content: '<p>[INTERACTIVE:blk-1]</p>', interactiveBlocks: [carouselBlock] }),
      ],
      fetchAsset: async () => ({ buffer: Buffer.alloc(0), contentType: '' }),
    })
    const zip = await JSZip.loadAsync(result.zip)
    const html = await zip.file('lessons/l1/index.html')!.async('string')
    expect(html).toContain('<strong>important</strong>')
    expect(html).not.toContain('&lt;strong&gt;')
  })

  it('renders hotspots as popovers anchored at each dot, not as a list below the image', async () => {
    const result = await buildScormExport({
      moduleId: 'm1',
      moduleTitle: 'M',
      lessons: [
        lesson({
          id: 'l1',
          content: '<p>[INTERACTIVE:blk-1]</p>',
          interactiveBlocks: [
            {
              id: 'blk-1',
              type: 'hotspot',
              title: 'B',
              instructions: '',
              order: 0,
              data: {
                variant: 'image-hotspot',
                imageUrl: 'https://blob.example.com/brain.png',
                hotspots: [
                  { id: 'h1', x: 10, y: 20, radius: 16, title: 'P1', content: '<p>Body 1</p>' },
                  { id: 'h2', x: 50, y: 60, radius: 16, title: 'P2', content: '<p>Body 2</p>' },
                ],
              },
            },
          ],
        }),
      ],
      fetchAsset: async () => ({
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
        contentType: 'image/png',
      }),
    })
    const zip = await JSZip.loadAsync(result.zip)
    const html = await zip.file('lessons/l1/index.html')!.async('string')
    expect(html).toContain('class="ib-hotspot-popover"')
    expect(html).toContain('id="hp-blk-1-h1"')
    expect(html).toContain('id="hp-blk-1-h2"')
    expect(html).toContain('Body 1')
    expect(html).not.toContain('&lt;p&gt;Body 1')
    expect(html).not.toContain('Show all points')
    expect(html).not.toContain('class="ib-hotspot-list"')
  })

  it('bundles TTS audio when a resolver is provided and references it from the lesson', async () => {
    const ttsCalls: string[] = []
    const result = await buildScormExport({
      moduleId: 'm1',
      moduleTitle: 'M',
      lessons: [
        lesson({
          id: 'l1',
          content: '<p>This is the lesson body.</p><p>[INTERACTIVE:blk-1]</p>',
          interactiveBlocks: [
            {
              id: 'blk-1',
              type: 'carousel',
              title: 'C',
              instructions: '',
              order: 0,
              data: {
                slides: [
                  { id: 's1', title: 'Slide 1', imageUrl: '', body: '<p>Slide one body.</p>' },
                ],
              },
            },
          ],
        }),
      ],
      fetchAsset: async () => ({ buffer: Buffer.alloc(0), contentType: '' }),
      resolveTts: async (text) => {
        ttsCalls.push(text)
        return Buffer.from([0xff, 0xfb, 0x90, 0x44])
      },
    })

    expect(ttsCalls.length).toBeGreaterThanOrEqual(2)
    const zip = await JSZip.loadAsync(result.zip)
    const audioFiles = Object.keys(zip.files).filter((f) => f.startsWith('lessons/l1/audio/'))
    expect(audioFiles.length).toBeGreaterThan(0)
    const html = await zip.file('lessons/l1/index.html')!.async('string')
    expect(html).toMatch(/class="scorm-lesson-audio"/)
    expect(html).toMatch(/class="ib-audio"/)
  })

  it('omits audio entirely when no resolver is provided', async () => {
    const result = await buildScormExport({
      moduleId: 'm1',
      moduleTitle: 'M',
      lessons: [lesson({ id: 'l1', content: '<p>Body</p>' })],
      fetchAsset: async () => ({ buffer: Buffer.alloc(0), contentType: '' }),
    })
    const zip = await JSZip.loadAsync(result.zip)
    expect(Object.keys(zip.files).filter((f) => f.startsWith('lessons/l1/audio/'))).toHaveLength(0)
    const html = await zip.file('lessons/l1/index.html')!.async('string')
    expect(html).not.toContain('class="scorm-lesson-audio"')
  })

  it('respects maxBundleBytes to avoid runaway exports', async () => {
    const result = await buildScormExport({
      moduleId: 'm1',
      moduleTitle: 'M',
      maxBundleBytes: 5_000, // tiny — most assets won't fit
      lessons: [
        lesson({
          id: 'l1',
          content: `<img src="https://example.com/big.png" />`,
        }),
      ],
      fetchAsset: async () => ({
        buffer: Buffer.alloc(10_000), // 10KB > 5KB budget
        contentType: 'image/png',
      }),
    })
    const zip = await JSZip.loadAsync(result.zip)
    expect(zip.file('lessons/l1/assets/asset-1.png')).toBeNull()
  })

  it('continues if a single asset fetch fails', async () => {
    const result = await buildScormExport({
      moduleId: 'm1',
      moduleTitle: 'M',
      lessons: [
        lesson({
          id: 'l1',
          content: '<img src="https://flaky.example.com/x.png" /><p>Body</p>',
        }),
      ],
      fetchAsset: async () => {
        throw new Error('network error')
      },
    })
    const zip = await JSZip.loadAsync(result.zip)
    const html = await zip.file('lessons/l1/index.html')!.async('string')
    // Original src is left in place (best-effort) and the export still renders.
    expect(html).toContain('https://flaky.example.com/x.png')
  })

  it('includes a top-level index.html that links to every lesson', async () => {
    const result = await buildScormExport({
      moduleId: 'm1',
      moduleTitle: 'My Module',
      lessons: [lesson({ id: 'a', title: 'Alpha' }), lesson({ id: 'b', title: 'Beta' })],
      fetchAsset: async () => ({ buffer: Buffer.alloc(0), contentType: '' }),
    })
    const zip = await JSZip.loadAsync(result.zip)
    const indexHtml = await zip.file('index.html')!.async('string')
    expect(indexHtml).toContain('My Module')
    expect(indexHtml).toContain('lessons/a/index.html')
    expect(indexHtml).toContain('lessons/b/index.html')
  })
})
