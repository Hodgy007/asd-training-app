import { describe, it, expect } from 'vitest'
import { parseScormManifest } from '../manifest'

const SCORM_12_MANIFEST = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="com.example.course" version="1.2"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="ORG-1">
    <organization identifier="ORG-1">
      <title>Example</title>
      <item identifier="ITEM-1" identifierref="RES-1">
        <title>Lesson 1</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-1" type="webcontent" adlcp:scormtype="sco" href="index_lms.html">
      <file href="index_lms.html" />
      <file href="assets/style.css" />
    </resource>
  </resources>
</manifest>`

describe('parseScormManifest', () => {
  it('returns entry path and version for a valid 1.2 manifest', () => {
    const result = parseScormManifest(SCORM_12_MANIFEST)
    expect(result).toEqual({ entryPath: 'index_lms.html', version: '1.2' })
  })

  it('throws on missing resources', () => {
    const xml = '<manifest><organizations/></manifest>'
    expect(() => parseScormManifest(xml)).toThrow(/no resources/i)
  })

  it('throws on non-XML input', () => {
    expect(() => parseScormManifest('not xml')).toThrow()
  })

  it('defaults to version 1.2 when schemaversion missing', () => {
    const xml = SCORM_12_MANIFEST.replace('<schemaversion>1.2</schemaversion>', '')
    const result = parseScormManifest(xml)
    expect(result.version).toBe('1.2')
  })

  it('rejects SCORM 2004 packages (unsupported in this release)', () => {
    const xml = SCORM_12_MANIFEST.replace('<schemaversion>1.2</schemaversion>', '<schemaversion>2004 3rd Edition</schemaversion>')
    expect(() => parseScormManifest(xml)).toThrow(/unsupported.*2004/i)
  })

  it('returns the first resource when multiple are present', () => {
    const xml = SCORM_12_MANIFEST.replace(
      '<resource identifier="RES-1" type="webcontent" adlcp:scormtype="sco" href="index_lms.html">\n      <file href="index_lms.html" />\n      <file href="assets/style.css" />\n    </resource>',
      `<resource identifier="RES-1" type="webcontent" adlcp:scormtype="sco" href="index_lms.html">
      <file href="index_lms.html" />
    </resource>
    <resource identifier="RES-2" type="webcontent" adlcp:scormtype="asset" href="secondary.html">
      <file href="secondary.html" />
    </resource>`,
    )
    const result = parseScormManifest(xml)
    expect(result.entryPath).toBe('index_lms.html')
  })

  it('rejects absolute href paths', () => {
    const xml = SCORM_12_MANIFEST.replace('href="index_lms.html"', 'href="/etc/passwd"')
    expect(() => parseScormManifest(xml)).toThrow(/safe relative path/i)
  })

  it('rejects href containing traversal', () => {
    const xml = SCORM_12_MANIFEST.replace('href="index_lms.html"', 'href="../../etc/passwd"')
    expect(() => parseScormManifest(xml)).toThrow(/safe relative path/i)
  })

  it('rejects href with a URL scheme', () => {
    const xml = SCORM_12_MANIFEST.replace('href="index_lms.html"', 'href="file:///etc/passwd"')
    expect(() => parseScormManifest(xml)).toThrow(/safe relative path/i)
  })

  it('rejects empty or whitespace href', () => {
    const xml = SCORM_12_MANIFEST.replace('href="index_lms.html"', 'href="   "')
    expect(() => parseScormManifest(xml)).toThrow(/safe relative path/i)
  })
})
