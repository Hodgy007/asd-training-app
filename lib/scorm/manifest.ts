import { XMLParser } from 'fast-xml-parser'

export type ScormVersion = '1.2' | '2004'

/**
 * One node in the parsed `<organization>` tree. `href` is set on leaves with
 * a resolvable resource (either via `identifierref` on the item, or by us
 * walking down to the first leaf that does). Aggregation items (the section
 * headings) have `href: undefined` and a populated `children` array. The
 * `href` includes any `parameters` querystring from the item.
 */
export interface ScormTocItem {
  id: string
  title: string
  href?: string
  children: ScormTocItem[]
}

export interface ScormManifestResult {
  entryPath: string
  version: ScormVersion
  toc: ScormTocItem[]
}

function detectScormVersion(schemaVersion: string): ScormVersion {
  if (/2004|cam\s*1\.3/i.test(schemaVersion)) return '2004'
  if (schemaVersion === '' || /^1\.2$/.test(schemaVersion)) return '1.2'
  throw new Error(`Unsupported SCORM schemaversion: ${schemaVersion}`)
}

function asArray<T>(x: T | T[] | undefined): T[] {
  if (x === undefined || x === null) return []
  return Array.isArray(x) ? x : [x]
}

function isSafeRelativePath(p: string): boolean {
  if (typeof p !== 'string') return false
  const trimmed = p.trim()
  if (trimmed.length === 0) return false
  if (trimmed.startsWith('/')) return false
  if (trimmed.includes('..')) return false
  if (/^[a-z][a-z0-9+\-.]*:/i.test(trimmed)) return false
  return true
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  // fast-xml-parser sometimes wraps text content in `{ '#text': '...' }`
  if (
    value !== null &&
    typeof value === 'object' &&
    '#text' in (value as Record<string, unknown>) &&
    typeof (value as Record<string, unknown>)['#text'] === 'string'
  ) {
    return (value as Record<string, string>)['#text']
  }
  return undefined
}

function buildResourceMap(resourcesNode: unknown): Map<string, { href?: string }> {
  const map = new Map<string, { href?: string }>()
  const node = (resourcesNode ?? {}) as Record<string, unknown>
  for (const r of asArray<Record<string, unknown>>(
    node.resource as Record<string, unknown> | Record<string, unknown>[] | undefined,
  )) {
    const id = asString(r['@_identifier'])
    const href = asString(r['@_href'])
    if (id) map.set(id, { href })
  }
  return map
}

interface RawItem {
  '@_identifier'?: unknown
  '@_identifierref'?: unknown
  '@_parameters'?: unknown
  title?: unknown
  item?: RawItem | RawItem[]
}

function buildTocItem(
  node: RawItem,
  resources: Map<string, { href?: string }>,
): ScormTocItem | null {
  const id = asString(node['@_identifier']) ?? ''
  if (!id) return null
  const title = asString(node.title) ?? ''
  const ref = asString(node['@_identifierref'])
  const parameters = asString(node['@_parameters']) ?? ''

  let href: string | undefined
  if (ref) {
    const res = resources.get(ref)
    if (res?.href && isSafeRelativePath(res.href)) {
      href = res.href + (parameters || '')
    }
  }

  const children = asArray<RawItem>(node.item)
    .map((c) => buildTocItem(c, resources))
    .filter((x): x is ScormTocItem => x !== null)

  // Drop items that resolved to neither a launchable href nor any children —
  // they'd render as an empty dead-end heading in the TOC.
  if (!href && children.length === 0) return null

  return { id, title, href, children }
}

function findFirstLeafHref(toc: ScormTocItem[]): string | undefined {
  for (const item of toc) {
    if (item.href) return item.href
    const child = findFirstLeafHref(item.children)
    if (child) return child
  }
  return undefined
}

/**
 * Strip a SCORM item's `?querystring` (used by some packages, e.g. Golf,
 * to pass `?questions=Playing` into a shared assessment template). The
 * stored `entryPath` column is path-only — query strings round-trip via
 * the TOC instead.
 */
function pathOnly(hrefWithMaybeQuery: string): string {
  const q = hrefWithMaybeQuery.indexOf('?')
  return q === -1 ? hrefWithMaybeQuery : hrefWithMaybeQuery.slice(0, q)
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

  const manifest = parsed?.manifest as Record<string, unknown> | undefined
  if (!manifest) throw new Error('Invalid SCORM manifest: no <manifest> element')

  const metadata = manifest.metadata as Record<string, unknown> | undefined
  const rawSchemaversion = metadata?.schemaversion
  const versionStr =
    rawSchemaversion !== undefined && rawSchemaversion !== ''
      ? String(rawSchemaversion).trim()
      : ''

  const version = detectScormVersion(versionStr)

  const resourcesContainer = manifest.resources as Record<string, unknown> | undefined
  if (!resourcesContainer) {
    throw new Error('Invalid SCORM manifest: no resources')
  }
  const resourceMap = buildResourceMap(resourcesContainer)

  // Walk <organizations>. Pick the org named in `default=` if present,
  // otherwise the first org. Build a TOC tree from its <item> children.
  const orgsContainer = manifest.organizations as Record<string, unknown> | undefined
  const orgList = asArray<Record<string, unknown>>(
    orgsContainer?.organization as Record<string, unknown> | Record<string, unknown>[] | undefined,
  )
  const defaultOrgId = asString(orgsContainer?.['@_default'])
  const chosenOrg =
    (defaultOrgId
      ? orgList.find((o) => asString(o['@_identifier']) === defaultOrgId)
      : undefined) ??
    orgList[0]

  let toc: ScormTocItem[] = []
  if (chosenOrg) {
    const items = asArray<RawItem>(chosenOrg.item as RawItem | RawItem[] | undefined)
    toc = items
      .map((i) => buildTocItem(i, resourceMap))
      .filter((x): x is ScormTocItem => x !== null)
  }

  // Entry path: prefer the first leaf in the TOC. Fall back to the first
  // resource with an href (legacy single-SCO packages without an
  // <organization> tree). The entry stored on the lesson is path-only —
  // querystrings travel with the TOC.
  let entryWithMaybeQuery = findFirstLeafHref(toc)
  if (!entryWithMaybeQuery) {
    for (const r of resourceMap.values()) {
      if (r.href) {
        entryWithMaybeQuery = r.href
        break
      }
    }
  }
  if (!entryWithMaybeQuery) {
    throw new Error('Invalid SCORM manifest: no launchable resource found')
  }

  const entryPath = pathOnly(entryWithMaybeQuery)
  if (!isSafeRelativePath(entryPath)) {
    throw new Error('Invalid SCORM manifest: resource href is not a safe relative path')
  }

  return { entryPath, version, toc }
}
