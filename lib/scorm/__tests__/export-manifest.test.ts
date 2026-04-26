import { describe, it, expect } from 'vitest'
import { buildScorm12Manifest } from '../export-manifest'
import { parseScormManifest } from '../manifest'

describe('buildScorm12Manifest', () => {
  it('produces a manifest that round-trips through parseScormManifest', () => {
    const xml = buildScorm12Manifest({
      moduleId: 'mod-1',
      moduleTitle: 'Understanding ASD',
      sharedFiles: ['shared/style.css', 'shared/scorm-api.js'],
      lessons: [
        {
          id: 'lesson-a',
          title: 'Introduction',
          href: 'lessons/lesson-a/index.html',
          files: ['index.html', 'assets/asset-1.png'],
        },
        {
          id: 'lesson-b',
          title: 'Communication strategies',
          href: 'lessons/lesson-b/index.html',
          files: ['index.html'],
          masteryScore: 80,
        },
      ],
    })

    const parsed = parseScormManifest(xml)
    expect(parsed.version).toBe('1.2')
    expect(parsed.entryPath).toBe('lessons/lesson-a/index.html')
    expect(parsed.toc).toHaveLength(2)
    expect(parsed.toc[0]).toMatchObject({
      title: 'Introduction',
      href: 'lessons/lesson-a/index.html',
    })
    expect(parsed.toc[1]).toMatchObject({
      title: 'Communication strategies',
      href: 'lessons/lesson-b/index.html',
    })
  })

  it('XML-escapes module and lesson titles with special chars', () => {
    const xml = buildScorm12Manifest({
      moduleId: 'mod-2',
      moduleTitle: 'A & B "test" <module>',
      sharedFiles: ['shared/style.css'],
      lessons: [
        {
          id: 'l1',
          title: "Lesson 1: it's <here>",
          href: 'lessons/l1/index.html',
          files: ['index.html'],
        },
      ],
    })
    expect(xml).toContain('A &amp; B &quot;test&quot; &lt;module&gt;')
    expect(xml).toContain('Lesson 1: it&apos;s &lt;here&gt;')
    // Should still parse — entities are valid XML.
    expect(() => parseScormManifest(xml)).not.toThrow()
  })

  it('includes mastery score when provided', () => {
    const xml = buildScorm12Manifest({
      moduleId: 'mod-3',
      moduleTitle: 'M',
      sharedFiles: [],
      lessons: [
        {
          id: 'l1',
          title: 'L1',
          href: 'lessons/l1/index.html',
          files: ['index.html'],
          masteryScore: 75,
        },
      ],
    })
    expect(xml).toContain('<adlcp:masteryscore>75</adlcp:masteryscore>')
  })

  it('omits mastery score when not provided', () => {
    const xml = buildScorm12Manifest({
      moduleId: 'mod-4',
      moduleTitle: 'M',
      sharedFiles: [],
      lessons: [
        { id: 'l1', title: 'L1', href: 'lessons/l1/index.html', files: ['index.html'] },
      ],
    })
    expect(xml).not.toContain('masteryscore')
  })

  it('coerces unsafe identifier characters to NCName-safe ids', () => {
    const xml = buildScorm12Manifest({
      moduleId: 'mod with spaces!',
      moduleTitle: 'M',
      sharedFiles: [],
      lessons: [
        {
          id: 'lesson with spaces',
          title: 'L1',
          href: 'lessons/x/index.html',
          files: ['index.html'],
        },
      ],
    })
    // Should still parse cleanly (NCName violations would otherwise blow up
    // strict consumers like SCORM Cloud).
    expect(() => parseScormManifest(xml)).not.toThrow()
    expect(xml).not.toMatch(/identifier="[^"]*\s[^"]*"/)
  })

  it('uses dependency on the shared resource for every lesson SCO', () => {
    const xml = buildScorm12Manifest({
      moduleId: 'mod-5',
      moduleTitle: 'M',
      sharedFiles: ['shared/style.css'],
      lessons: [
        { id: 'a', title: 'A', href: 'lessons/a/index.html', files: ['index.html'] },
        { id: 'b', title: 'B', href: 'lessons/b/index.html', files: ['index.html'] },
      ],
    })
    const matches = xml.match(/<dependency identifierref="RES-SHARED"\/>/g)
    expect(matches).not.toBeNull()
    expect(matches!.length).toBe(2)
  })
})
