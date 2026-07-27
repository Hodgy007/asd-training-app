import { describe, expect, it } from 'vitest'
import {
  validateInteractiveBlocks,
  parseInteractiveBlocksLenient,
} from '@/lib/interactive-blocks'

/**
 * These two functions used to be one, and merging them cost data.
 *
 * The lenient behaviour is right for rendering: one malformed block should not
 * hide every other block on the lesson. The strict behaviour is right for
 * saving: the write path rejects a payload that doesn't round-trip, and if it
 * quietly accepts the valid subset instead, the malformed block is deleted
 * from the database with nobody told. Keep them apart.
 */

const carousel = (id: string) => ({
  id,
  type: 'carousel' as const,
  title: 'A carousel',
  instructions: 'Swipe through',
  order: 0,
  data: {
    slides: [{ id: 's1', title: 'Slide', imageUrl: '', body: 'Body' }],
  },
})

// Right shape, wrong innards — passes "is an object with a type" but fails the
// per-type schema.
const malformed = {
  id: 'bad',
  type: 'carousel',
  title: 'Broken',
  instructions: '',
  order: 1,
  data: { slides: 'not-an-array' },
}

describe('validateInteractiveBlocks (strict — write path)', () => {
  it('returns the blocks when every one is valid', () => {
    const result = validateInteractiveBlocks([carousel('a'), carousel('b')])
    expect(result).toHaveLength(2)
  })

  it('rejects the whole payload when any block is invalid', () => {
    // The save route relies on this: a partial accept would silently drop the
    // malformed block from the stored array.
    expect(validateInteractiveBlocks([carousel('a'), malformed])).toBeNull()
  })

  it('returns null for a non-array', () => {
    expect(validateInteractiveBlocks(null)).toBeNull()
    expect(validateInteractiveBlocks({})).toBeNull()
    expect(validateInteractiveBlocks('[]')).toBeNull()
  })

  it('accepts an empty array', () => {
    expect(validateInteractiveBlocks([])).toEqual([])
  })
})

describe('parseInteractiveBlocksLenient (read path)', () => {
  it('keeps the valid blocks when one is malformed', () => {
    // The original bug: this returned nothing, so a lesson with five blocks and
    // one bad one rendered as raw [INTERACTIVE:...] placeholder text.
    const result = parseInteractiveBlocksLenient([carousel('a'), malformed, carousel('c')])
    expect(result.blocks.map((b) => b.id)).toEqual(['a', 'c'])
  })

  it('reports which positions failed so callers can warn', () => {
    const result = parseInteractiveBlocksLenient([malformed, carousel('b'), malformed])
    expect(result.invalidIndices).toEqual([0, 2])
  })

  it('reports nothing invalid when everything parses', () => {
    const result = parseInteractiveBlocksLenient([carousel('a')])
    expect(result.invalidIndices).toEqual([])
  })

  it('returns empty rather than throwing on a non-array', () => {
    expect(parseInteractiveBlocksLenient(null)).toEqual({ blocks: [], invalidIndices: [] })
    expect(parseInteractiveBlocksLenient('nope')).toEqual({ blocks: [], invalidIndices: [] })
  })

  it('never returns null — callers destructure the result directly', () => {
    // The old signature returned `InteractiveBlock[] | null`, so every call site
    // carried a `?? []`. Dropping that is only safe if this really can't be null.
    expect(parseInteractiveBlocksLenient(undefined).blocks).toEqual([])
  })
})
