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
  it('returns entry path, version, and TOC for a valid 1.2 manifest', () => {
    const result = parseScormManifest(SCORM_12_MANIFEST)
    expect(result.entryPath).toBe('index_lms.html')
    expect(result.version).toBe('1.2')
    expect(result.toc).toEqual([
      { id: 'ITEM-1', title: 'Lesson 1', href: 'index_lms.html', children: [] },
    ])
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

  it('detects SCORM 2004 from "2004 3rd Edition" schemaversion', () => {
    const xml = SCORM_12_MANIFEST.replace(
      '<schemaversion>1.2</schemaversion>',
      '<schemaversion>2004 3rd Edition</schemaversion>',
    )
    const result = parseScormManifest(xml)
    expect(result.entryPath).toBe('index_lms.html')
    expect(result.version).toBe('2004')
  })

  it('returns the selected organization title as the course title', () => {
    const result = parseScormManifest(SCORM_12_MANIFEST)
    expect(result.title).toBe('Example')
  })

  it('uses the course title for Captivate single-SCO placeholder item titles', () => {
    const xml = SCORM_12_MANIFEST
      .replace('<title>Example</title>', '<title>AAA Autism in the workplace</title>')
      .replace('<title>Lesson 1</title>', '<title>index_SCO_Title</title>')

    const result = parseScormManifest(xml)

    expect(result.title).toBe('AAA Autism in the workplace')
    expect(result.toc).toEqual([
      {
        id: 'ITEM-1',
        title: 'AAA Autism in the workplace',
        href: 'index_lms.html',
        children: [],
      },
    ])
  })

  it('detects SCORM 2004 from "2004 4th Edition" schemaversion', () => {
    const xml = SCORM_12_MANIFEST.replace(
      '<schemaversion>1.2</schemaversion>',
      '<schemaversion>2004 4th Edition</schemaversion>',
    )
    expect(parseScormManifest(xml).version).toBe('2004')
  })

  it('detects SCORM 2004 from "CAM 1.3" schemaversion', () => {
    const xml = SCORM_12_MANIFEST.replace(
      '<schemaversion>1.2</schemaversion>',
      '<schemaversion>CAM 1.3</schemaversion>',
    )
    expect(parseScormManifest(xml).version).toBe('2004')
  })

  it('rejects unknown schemaversion strings', () => {
    const xml = SCORM_12_MANIFEST.replace(
      '<schemaversion>1.2</schemaversion>',
      '<schemaversion>SCORM 9000</schemaversion>',
    )
    expect(() => parseScormManifest(xml)).toThrow(/unsupported scorm schemaversion/i)
  })

  it('falls back to first resource when there is no organization tree', () => {
    // No <organizations> at all — older single-SCO packages.
    const xml = SCORM_12_MANIFEST.replace(/<organizations[^]*?<\/organizations>/, '')
    const result = parseScormManifest(xml)
    expect(result.entryPath).toBe('index_lms.html')
    expect(result.toc).toEqual([])
  })

  it('rejects absolute href paths', () => {
    const xml = SCORM_12_MANIFEST.replace('href="index_lms.html"', 'href="/etc/passwd"')
    expect(() => parseScormManifest(xml)).toThrow(/no launchable resource|safe relative path/i)
  })

  it('rejects href containing traversal', () => {
    const xml = SCORM_12_MANIFEST.replace('href="index_lms.html"', 'href="../../etc/passwd"')
    expect(() => parseScormManifest(xml)).toThrow(/no launchable resource|safe relative path/i)
  })

  it('rejects href with a URL scheme', () => {
    const xml = SCORM_12_MANIFEST.replace('href="index_lms.html"', 'href="file:///etc/passwd"')
    expect(() => parseScormManifest(xml)).toThrow(/no launchable resource|safe relative path/i)
  })

  // Multi-SCO TOC parsing — modelled on the SCORM.com Golf "One File Per
  // SCO" example, which has aggregation items, leaves with parameters, and
  // a default org reference.
  const GOLF_LIKE_MANIFEST = `<?xml version="1.0"?>
<manifest identifier="golf" version="1"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="default_org">
    <organization identifier="default_org">
      <title>Golf</title>
      <item identifier="playing_item">
        <title>Playing the Game</title>
        <item identifier="playing_intro" identifierref="playing_intro_res">
          <title>Intro</title>
        </item>
        <item identifier="playing_quiz" identifierref="quiz_res" parameters="?questions=Playing">
          <title>Quiz</title>
        </item>
      </item>
      <item identifier="etiquette_item">
        <title>Etiquette</title>
        <item identifier="etiquette_intro" identifierref="etiquette_intro_res">
          <title>Etiquette intro</title>
        </item>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="playing_intro_res" type="webcontent" adlcp:scormtype="asset" href="Playing/Playing.html">
      <file href="Playing/Playing.html"/>
    </resource>
    <resource identifier="quiz_res" type="webcontent" adlcp:scormtype="asset" href="shared/assessmenttemplate.html">
      <file href="shared/assessmenttemplate.html"/>
    </resource>
    <resource identifier="etiquette_intro_res" type="webcontent" adlcp:scormtype="asset" href="Etiquette/Course.html">
      <file href="Etiquette/Course.html"/>
    </resource>
    <resource identifier="common_files" type="webcontent" adlcp:scormtype="asset">
      <file href="shared/style.css"/>
    </resource>
  </resources>
</manifest>`

  it('builds a nested TOC from <organization><item> tree (Golf-style multi-SCO)', () => {
    const result = parseScormManifest(GOLF_LIKE_MANIFEST)

    // First leaf becomes the entry path (parameters stripped — they live in TOC).
    expect(result.entryPath).toBe('Playing/Playing.html')
    expect(result.toc).toEqual([
      {
        id: 'playing_item',
        title: 'Playing the Game',
        href: undefined,
        children: [
          {
            id: 'playing_intro',
            title: 'Intro',
            href: 'Playing/Playing.html',
            children: [],
          },
          {
            id: 'playing_quiz',
            title: 'Quiz',
            // querystring from <item parameters="..."> is preserved in TOC
            href: 'shared/assessmenttemplate.html?questions=Playing',
            children: [],
          },
        ],
      },
      {
        id: 'etiquette_item',
        title: 'Etiquette',
        href: undefined,
        children: [
          {
            id: 'etiquette_intro',
            title: 'Etiquette intro',
            href: 'Etiquette/Course.html',
            children: [],
          },
        ],
      },
    ])
  })

  it('uses the first <organization> when no `default` attribute is set', () => {
    const xml = GOLF_LIKE_MANIFEST.replace('default="default_org"', '')
    const result = parseScormManifest(xml)
    expect(result.entryPath).toBe('Playing/Playing.html')
    expect(result.toc.length).toBe(2)
  })
})
