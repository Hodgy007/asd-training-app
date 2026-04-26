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

  it('throws when no lessons are exportable', async () => {
    await expect(
      buildScormExport({
        moduleId: 'm1',
        moduleTitle: 'M',
        lessons: [lesson({ type: 'SCORM' })],
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

  it('shows a stripped-blocks notice when the source lesson has interactive blocks', async () => {
    const result = await buildScormExport({
      moduleId: 'm1',
      moduleTitle: 'M',
      lessons: [
        lesson({ id: 'l1', interactiveBlocks: [{ type: 'hotspot', id: 'h1' }] }),
      ],
      fetchAsset: async () => ({ buffer: Buffer.alloc(0), contentType: '' }),
    })
    const zip = await JSZip.loadAsync(result.zip)
    const html = await zip.file('lessons/l1/index.html')!.async('string')
    expect(html).toMatch(/interactive activities .* not included/i)
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
