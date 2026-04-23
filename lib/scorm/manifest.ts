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

  let parsed: Record<string, unknown>
  try {
    parsed = parser.parse(xml) as Record<string, unknown>
  } catch (err) {
    throw new Error(`Invalid SCORM manifest XML: ${(err as Error).message}`)
  }

  const manifest = (parsed?.manifest) as Record<string, unknown> | undefined
  if (!manifest) throw new Error('Invalid SCORM manifest: no <manifest> element')

  const metadata = (manifest?.metadata) as Record<string, unknown> | undefined
  const rawSchemaversion = metadata?.schemaversion
  // fast-xml-parser returns '' for empty elements — treat empty string as missing
  const versionStr =
    rawSchemaversion !== undefined && rawSchemaversion !== ''
      ? String(rawSchemaversion).trim()
      : '1.2'

  if (/2004/.test(versionStr)) {
    throw new Error('Unsupported SCORM version 2004 (only 1.2 is supported)')
  }

  const resourcesContainer = (manifest?.resources) as Record<string, unknown> | undefined
  const resources = resourcesContainer?.resource
  if (!resources) throw new Error('Invalid SCORM manifest: no resources')

  const firstResource = (Array.isArray(resources) ? resources[0] : resources) as Record<string, unknown> | undefined
  const hrefRaw = firstResource?.['@_href']
  if (hrefRaw === undefined || hrefRaw === null || typeof hrefRaw !== 'string') {
    throw new Error('Invalid SCORM manifest: resource missing href')
  }
  const href = hrefRaw

  if (
    href.trim().length === 0 ||
    href.startsWith('/') ||
    href.includes('..') ||
    /^[a-z][a-z0-9+\-.]*:/i.test(href)
  ) {
    throw new Error('Invalid SCORM manifest: resource href is not a safe relative path')
  }

  return { entryPath: href, version: '1.2' }
}
