import { describe, it, expect, vi } from 'vitest'
import JSZip from 'jszip'
import { extractScormPackage } from '../package'

async function buildZip(files: Record<string, string>): Promise<Buffer> {
  const zip = new JSZip()
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content)
  }
  return await zip.generateAsync({ type: 'nodebuffer' })
}

const MANIFEST_XML = `<?xml version="1.0"?>
<manifest xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
  <metadata><schemaversion>1.2</schemaversion></metadata>
  <resources>
    <resource identifier="R1" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>`

describe('extractScormPackage', () => {
  it('uploads every file to blob and returns manifest info', async () => {
    const zip = await buildZip({
      'imsmanifest.xml': MANIFEST_XML,
      'index.html': '<html>hi</html>',
      'assets/style.css': 'body {}',
    })
    const upload = vi.fn().mockResolvedValue(undefined)
    const result = await extractScormPackage({
      zipBuffer: zip,
      lessonId: 'lesson-1',
      upload,
    })
    expect(result.entryPath).toBe('index.html')
    expect(result.blobPrefix).toBe('scorm/lesson-1')
    expect(upload).toHaveBeenCalledTimes(3)
    expect(upload).toHaveBeenCalledWith(
      'scorm/lesson-1/imsmanifest.xml',
      expect.any(Buffer),
      'application/xml',
    )
    expect(upload).toHaveBeenCalledWith(
      'scorm/lesson-1/index.html',
      expect.any(Buffer),
      'text/html',
    )
  })

  it('rejects zips with no imsmanifest.xml', async () => {
    const zip = await buildZip({ 'index.html': '<html/>' })
    await expect(
      extractScormPackage({ zipBuffer: zip, lessonId: 'x', upload: vi.fn() }),
    ).rejects.toThrow(/imsmanifest\.xml/i)
  })

  it('rejects zip-slip paths', async () => {
    const zip = new JSZip()
    zip.file('imsmanifest.xml', MANIFEST_XML)
    zip.file('../evil.html', 'x')
    const buffer = await zip.generateAsync({ type: 'nodebuffer' })
    await expect(
      extractScormPackage({ zipBuffer: buffer, lessonId: 'x', upload: vi.fn() }),
    ).rejects.toThrow(/unsafe/i)
  })

  it('skips directory entries', async () => {
    const zip = new JSZip()
    zip.file('imsmanifest.xml', MANIFEST_XML)
    zip.folder('assets')
    zip.file('index.html', '<html/>')
    const buffer = await zip.generateAsync({ type: 'nodebuffer' })
    const upload = vi.fn().mockResolvedValue(undefined)
    await extractScormPackage({ zipBuffer: buffer, lessonId: 'x', upload })
    const uploadedPaths = upload.mock.calls.map((c) => c[0])
    expect(uploadedPaths).not.toContain('scorm/x/assets/')
  })
})
