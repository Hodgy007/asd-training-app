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
})
