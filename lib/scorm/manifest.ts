import { XMLParser } from 'fast-xml-parser'

export type ScormVersion = '1.2' | '2004'

export interface ScormManifestResult {
  entryPath: string
  version: ScormVersion
}

/**
 * Decide whether a manifest is SCORM 1.2 or 2004 from the schemaversion
 * string. SCORM 2004 packages declare values like `2004 3rd Edition`,
 * `2004 4th Edition`, or `CAM 1.3`. SCORM 1.2 declares `1.2`. Empty/missing
 * defaults to `1.2` for backwards compatibility with the older importer.
 */
function detectScormVersion(schemaVersion: string): ScormVersion {
  if (/2004|cam\s*1\.3/i.test(schemaVersion)) return '2004'
  if (schemaVersion === '' || /^1\.2$/.test(schemaVersion)) return '1.2'
  // Unknown — be conservative and reject rather than mis-route to a runtime
  // that can't speak the manifest's data model.
  throw new Error(`Unsupported SCORM schemaversion: ${schemaVersion}`)
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
      : ''

  const version = detectScormVersion(versionStr)

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

  return { entryPath: href, version }
}
