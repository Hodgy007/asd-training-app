// Shared sections-aware grouping helper for the library views.
//
// A LibraryCollection holds either a flat list of documents (no sections
// defined — old behaviour preserved) or a list of named sections each
// containing zero or more documents. Documents whose sectionId is null
// fall through to a synthetic "Other resources" group.

export type LibraryDocumentLike = {
  id: string
  sectionId: string | null
  order: number
  createdAt?: Date | string | null
}

export type LibrarySectionLike = {
  id: string
  title: string
  description: string | null
  order: number
}

export type LibrarySectionGroup<D extends LibraryDocumentLike> = {
  /** Section row, or null for the synthetic "Other resources" / unsectioned bucket. */
  section: LibrarySectionLike | null
  documents: D[]
}

/**
 * Group documents by section + order them deterministically.
 *
 * Ordering rules:
 *   - Sections by `section.order` ASC.
 *   - Documents within a section: `order` ASC, then `createdAt` DESC
 *     (newest-first tie-break — matches the legacy flat-list behaviour).
 *   - The unsectioned bucket (if any docs have `sectionId === null`) is
 *     appended at the end as a final group with `section: null`.
 *   - Empty sections are kept by default; pass `includeEmptySections: false`
 *     to drop them (used by learner-facing views).
 */
export function groupDocumentsBySection<D extends LibraryDocumentLike>(
  sections: LibrarySectionLike[],
  documents: D[],
  options: { includeEmptySections?: boolean } = {},
): LibrarySectionGroup<D>[] {
  const includeEmptySections = options.includeEmptySections ?? true

  const sortedSections = [...sections].sort((a, b) => a.order - b.order)
  const docsBySectionId = new Map<string | null, D[]>()
  for (const doc of documents) {
    const key = doc.sectionId ?? null
    const bucket = docsBySectionId.get(key) ?? []
    bucket.push(doc)
    docsBySectionId.set(key, bucket)
  }

  for (const bucket of docsBySectionId.values()) {
    bucket.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return bDate - aDate
    })
  }

  const groups: LibrarySectionGroup<D>[] = []
  for (const section of sortedSections) {
    const docs = docsBySectionId.get(section.id) ?? []
    if (!includeEmptySections && docs.length === 0) continue
    groups.push({ section, documents: docs })
  }

  const unsectioned = docsBySectionId.get(null) ?? []
  if (unsectioned.length > 0) {
    groups.push({ section: null, documents: unsectioned })
  }

  return groups
}

/**
 * `true` when a collection has at least one section row, meaning the read-only
 * views should switch to grouped rendering. `false` keeps the flat layout.
 */
export function isSectionedCollection(sections: LibrarySectionLike[]): boolean {
  return sections.length > 0
}

/** Default heading for the unsectioned bucket. */
export const UNSECTIONED_GROUP_TITLE = 'Other resources'
