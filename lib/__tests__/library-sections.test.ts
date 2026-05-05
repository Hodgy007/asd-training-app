import { describe, expect, it } from 'vitest'
import { groupDocumentsBySection, isSectionedCollection } from '@/lib/library-sections'

const section = (id: string, title: string, order: number) => ({
  id,
  title,
  description: null,
  order,
})

const doc = (
  id: string,
  sectionId: string | null,
  order: number,
  createdAt: string,
) => ({ id, sectionId, order, createdAt })

describe('isSectionedCollection', () => {
  it('returns false for empty section list', () => {
    expect(isSectionedCollection([])).toBe(false)
  })

  it('returns true once any section exists', () => {
    expect(isSectionedCollection([section('s1', 'Workshop 1', 0)])).toBe(true)
  })
})

describe('groupDocumentsBySection', () => {
  it('orders sections by section.order ASC', () => {
    const sections = [
      section('s2', 'Workshop 2', 1),
      section('s1', 'Workshop 1', 0),
    ]
    const docs = [
      doc('d1', 's1', 0, '2026-01-01'),
      doc('d2', 's2', 0, '2026-01-01'),
    ]
    const groups = groupDocumentsBySection(sections, docs)
    expect(groups.map((g) => g.section?.title)).toEqual(['Workshop 1', 'Workshop 2'])
  })

  it('orders docs within a section by order ASC then createdAt DESC', () => {
    const sections = [section('s1', 'W1', 0)]
    const docs = [
      doc('d-old-1', 's1', 1, '2026-01-01'),
      doc('d-new-1', 's1', 1, '2026-04-01'),
      doc('d-old-0', 's1', 0, '2026-01-01'),
    ]
    const groups = groupDocumentsBySection(sections, docs)
    expect(groups[0].documents.map((d) => d.id)).toEqual(['d-old-0', 'd-new-1', 'd-old-1'])
  })

  it('appends an unsectioned bucket as a final group', () => {
    const sections = [section('s1', 'W1', 0)]
    const docs = [
      doc('d-orphan', null, 0, '2026-04-01'),
      doc('d-in-section', 's1', 0, '2026-04-01'),
    ]
    const groups = groupDocumentsBySection(sections, docs)
    expect(groups.map((g) => g.section?.id ?? null)).toEqual(['s1', null])
    expect(groups[1].documents.map((d) => d.id)).toEqual(['d-orphan'])
  })

  it('omits the unsectioned bucket when no orphan docs exist', () => {
    const sections = [section('s1', 'W1', 0)]
    const docs = [doc('d1', 's1', 0, '2026-04-01')]
    const groups = groupDocumentsBySection(sections, docs)
    expect(groups.map((g) => g.section?.id ?? null)).toEqual(['s1'])
  })

  it('keeps empty sections by default', () => {
    const sections = [section('s1', 'W1', 0), section('s2', 'W2', 1)]
    const docs = [doc('d1', 's1', 0, '2026-04-01')]
    const groups = groupDocumentsBySection(sections, docs)
    expect(groups.map((g) => g.section?.id)).toEqual(['s1', 's2'])
    expect(groups[1].documents).toEqual([])
  })

  it('drops empty sections when includeEmptySections=false', () => {
    const sections = [section('s1', 'W1', 0), section('s2', 'W2', 1)]
    const docs = [doc('d1', 's1', 0, '2026-04-01')]
    const groups = groupDocumentsBySection(sections, docs, { includeEmptySections: false })
    expect(groups.map((g) => g.section?.id)).toEqual(['s1'])
  })

  it('handles all-orphan documents (returns just the unsectioned group)', () => {
    const sections: never[] = []
    const docs = [doc('d1', null, 0, '2026-04-01'), doc('d2', null, 1, '2026-04-02')]
    const groups = groupDocumentsBySection(sections, docs)
    expect(groups).toHaveLength(1)
    expect(groups[0].section).toBeNull()
    expect(groups[0].documents.map((d) => d.id)).toEqual(['d1', 'd2'])
  })

  it('returns no groups when there are no documents and no sections', () => {
    expect(groupDocumentsBySection([], [])).toEqual([])
  })

  it('keeps documents whose sectionId points at a missing/deleted section out of the named-section bucket', () => {
    // Edge case: if a section was hard-deleted but FK SetNull failed for some
    // reason and a doc still references the missing section id, we shouldn't
    // crash. The doc should fall through to neither bucket — currently it
    // ends up in a phantom map key. This test pins down the current behaviour
    // so future schema changes don't regress it silently.
    const sections = [section('s1', 'W1', 0)]
    const docs = [doc('d1', 's-gone', 0, '2026-04-01')]
    const groups = groupDocumentsBySection(sections, docs)
    // Only the named section is rendered; the orphan doc is silently dropped
    // because its sectionId isn't null AND doesn't match any known section.
    expect(groups.map((g) => g.section?.id ?? null)).toEqual(['s1'])
    expect(groups[0].documents).toEqual([])
  })
})
