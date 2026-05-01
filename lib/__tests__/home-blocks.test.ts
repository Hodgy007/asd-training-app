import { describe, expect, it } from 'vitest'
import {
  EDITABLE_HOMEPAGE_ROLES,
  homeBlocksSchema,
  isEditableHomepageRole,
  newBlockId,
} from '@/lib/home-blocks'

describe('isEditableHomepageRole', () => {
  it('accepts every role in EDITABLE_HOMEPAGE_ROLES', () => {
    for (const role of EDITABLE_HOMEPAGE_ROLES) {
      expect(isEditableHomepageRole(role)).toBe(true)
    }
  })

  it('rejects admin / unknown roles', () => {
    expect(isEditableHomepageRole('SUPER_ADMIN')).toBe(false)
    expect(isEditableHomepageRole('ORG_ADMIN')).toBe(false)
    expect(isEditableHomepageRole('CHARITY_EMPLOYEE')).toBe(false)
    expect(isEditableHomepageRole('NOT_A_ROLE')).toBe(false)
    expect(isEditableHomepageRole('')).toBe(false)
  })
})

describe('homeBlocksSchema', () => {
  it('accepts an empty array', () => {
    const result = homeBlocksSchema.safeParse([])
    expect(result.success).toBe(true)
  })

  it('parses each supported block kind', () => {
    const blocks = [
      { id: 'a', kind: 'hero', title: 'T', subtitle: 'S', imageUrl: '', ctaLabel: 'Go', ctaHref: '/x' },
      { id: 'b', kind: 'tiles', columns: 3, tiles: [{ id: 't1', title: 'X', description: 'd', iconKey: '', imageUrl: '', href: '/y' }] },
      { id: 'c', kind: 'richText', html: '<p>hello</p>' },
      { id: 'd', kind: 'image', src: 'https://example.com/x.png', alt: 'pic', href: '' },
      { id: 'e', kind: 'video', src: 'https://example.com/v.mp4', poster: '' },
    ]
    const result = homeBlocksSchema.safeParse(blocks)
    expect(result.success).toBe(true)
  })

  it('sanitises richText html on parse (drops script tags)', () => {
    const result = homeBlocksSchema.safeParse([
      { id: 'r', kind: 'richText', html: '<p>safe</p><script>alert(1)</script>' },
    ])
    expect(result.success).toBe(true)
    if (result.success) {
      const block = result.data[0]
      expect(block.kind).toBe('richText')
      if (block.kind === 'richText') {
        expect(block.html).toContain('<p>safe</p>')
        expect(block.html).not.toContain('<script>')
      }
    }
  })

  it('rejects an unknown block kind', () => {
    const result = homeBlocksSchema.safeParse([{ id: 'x', kind: 'banana', text: 'nope' }])
    expect(result.success).toBe(false)
  })

  it('rejects a tiles block with an invalid column count', () => {
    const result = homeBlocksSchema.safeParse([{ id: 't', kind: 'tiles', columns: 5, tiles: [] }])
    expect(result.success).toBe(false)
  })

  it('accepts an image block with an empty src (draft state)', () => {
    const result = homeBlocksSchema.safeParse([{ id: 'i', kind: 'image', src: '', alt: '', href: '' }])
    expect(result.success).toBe(true)
  })

  it('rejects an image block with a non-URL src', () => {
    const result = homeBlocksSchema.safeParse([{ id: 'i', kind: 'image', src: 'not-a-url', alt: '', href: '' }])
    expect(result.success).toBe(false)
  })

  it('caps the array at 40 blocks', () => {
    const tooMany = Array.from({ length: 41 }, (_, i) => ({ id: `b${i}`, kind: 'richText' as const, html: '<p>x</p>' }))
    const result = homeBlocksSchema.safeParse(tooMany)
    expect(result.success).toBe(false)
  })
})

describe('newBlockId', () => {
  it('returns a non-empty string', () => {
    const id = newBlockId()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('returns different values across calls', () => {
    const a = newBlockId()
    const b = newBlockId()
    expect(a).not.toBe(b)
  })
})
