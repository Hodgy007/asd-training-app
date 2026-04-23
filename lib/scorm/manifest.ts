import { XMLParser } from 'fast-xml-parser'

export interface ScormManifestResult {
  entryPath: string
  version: '1.2'
}

export function parseScormManifest(xml: string): ScormManifestResult {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseAttributeValue: false,
  })

  let parsed: any
  try {
    parsed = parser.parse(xml)
  } catch (err) {
    throw new Error(`Invalid SCORM manifest XML: ${(err as Error).message}`)
  }

  const manifest = parsed?.manifest
  if (!manifest) throw new Error('Invalid SCORM manifest: no <manifest> element')

  const rawSchemaversion = manifest?.metadata?.schemaversion
  // fast-xml-parser returns '' for empty elements — treat empty string as missing
  const versionStr =
    rawSchemaversion !== undefined && rawSchemaversion !== ''
      ? String(rawSchemaversion).trim()
      : '1.2'

  if (/2004/.test(versionStr)) {
    throw new Error('Unsupported SCORM version 2004 (only 1.2 is supported)')
  }

  const resources = manifest?.resources?.resource
  if (!resources) throw new Error('Invalid SCORM manifest: no resources')

  const firstResource = Array.isArray(resources) ? resources[0] : resources
  const href = firstResource?.['@_href']
  if (!href || typeof href !== 'string') {
    throw new Error('Invalid SCORM manifest: resource missing href')
  }

  return { entryPath: href, version: '1.2' }
}
