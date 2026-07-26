import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    homePage: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import { resolveHomePage, loadHomePageForEdit, saveHomePage, DEFAULT_HOMEPAGE_ID } from '@/lib/homepage'

const block = (id: string) => ({
  id,
  kind: 'richText' as const,
  html: '<p>hello</p>',
})

const row = (over: Record<string, unknown>) => ({
  id: 'cuid1',
  organisationId: null,
  blocks: [],
  updatedAt: new Date('2026-01-01'),
  ...over,
})

beforeEach(() => {
  vi.mocked(prisma.homePage.findMany).mockReset()
  vi.mocked(prisma.homePage.findUnique).mockReset()
  vi.mocked(prisma.homePage.upsert).mockReset()
})

describe('resolveHomePage', () => {
  it("uses the organisation's own page when it has one", async () => {
    vi.mocked(prisma.homePage.findMany).mockResolvedValue([
      row({ id: DEFAULT_HOMEPAGE_ID, blocks: [block('default')] }),
      row({ id: 'cuid2', organisationId: 'org1', blocks: [block('org')] }),
    ] as never)

    const res = await resolveHomePage('org1')
    expect(res.isOrgSpecific).toBe(true)
    expect(res.blocks[0].id).toBe('org')
  })

  it('falls back to the default when the org has no page', async () => {
    vi.mocked(prisma.homePage.findMany).mockResolvedValue([
      row({ id: DEFAULT_HOMEPAGE_ID, blocks: [block('default')] }),
    ] as never)

    const res = await resolveHomePage('org1')
    expect(res.isOrgSpecific).toBe(false)
    expect(res.blocks[0].id).toBe('default')
  })

  it('falls back to the default when the org page exists but is empty', async () => {
    // Clearing every block must not strand the org on a blank page.
    vi.mocked(prisma.homePage.findMany).mockResolvedValue([
      row({ id: DEFAULT_HOMEPAGE_ID, blocks: [block('default')] }),
      row({ id: 'cuid2', organisationId: 'org1', blocks: [] }),
    ] as never)

    const res = await resolveHomePage('org1')
    expect(res.isOrgSpecific).toBe(false)
    expect(res.blocks[0].id).toBe('default')
  })

  it('uses the default for a user with no organisation', async () => {
    vi.mocked(prisma.homePage.findMany).mockResolvedValue([
      row({ id: DEFAULT_HOMEPAGE_ID, blocks: [block('default')] }),
    ] as never)

    const res = await resolveHomePage(null)
    expect(res.blocks[0].id).toBe('default')
    // Only the default is queried when there is no org to look up.
    const where = vi.mocked(prisma.homePage.findMany).mock.calls[0][0]!.where as {
      OR: unknown[]
    }
    expect(where.OR).toHaveLength(1)
  })

  it('returns empty when nothing is configured at all', async () => {
    vi.mocked(prisma.homePage.findMany).mockResolvedValue([] as never)
    const res = await resolveHomePage('org1')
    expect(res.blocks).toEqual([])
    expect(res.isOrgSpecific).toBe(false)
  })

  it('ignores a malformed stored payload rather than throwing', async () => {
    vi.mocked(prisma.homePage.findMany).mockResolvedValue([
      row({ id: DEFAULT_HOMEPAGE_ID, blocks: { not: 'an array' } }),
    ] as never)
    const res = await resolveHomePage(null)
    expect(res.blocks).toEqual([])
  })

  it('fetches both candidate rows in a single query', async () => {
    vi.mocked(prisma.homePage.findMany).mockResolvedValue([] as never)
    await resolveHomePage('org1')
    expect(prisma.homePage.findMany).toHaveBeenCalledTimes(1)
  })
})

describe('loadHomePageForEdit', () => {
  it('does NOT fall back to the default when editing an org page', async () => {
    // Falling back here would copy the default into the org on the next save.
    vi.mocked(prisma.homePage.findUnique).mockResolvedValue(null as never)
    const res = await loadHomePageForEdit('org1')
    expect(res.blocks).toEqual([])
    expect(prisma.homePage.findUnique).toHaveBeenCalledWith({ where: { organisationId: 'org1' } })
  })

  it('loads the default by its fixed id', async () => {
    vi.mocked(prisma.homePage.findUnique).mockResolvedValue(
      row({ id: DEFAULT_HOMEPAGE_ID, blocks: [block('d')] }) as never
    )
    await loadHomePageForEdit(null)
    expect(prisma.homePage.findUnique).toHaveBeenCalledWith({ where: { id: DEFAULT_HOMEPAGE_ID } })
  })
})

describe('saveHomePage', () => {
  it('upserts the default on its fixed id, never on a null organisationId', async () => {
    // Postgres allows many NULLs in a unique index, so upserting the default by
    // organisationId could silently create a second default row.
    vi.mocked(prisma.homePage.upsert).mockResolvedValue(row({}) as never)
    await saveHomePage(null, [block('a')], 'user1')

    const arg = vi.mocked(prisma.homePage.upsert).mock.calls[0][0]
    expect(arg.where).toEqual({ id: DEFAULT_HOMEPAGE_ID })
  })

  it('upserts an org page keyed on organisationId', async () => {
    vi.mocked(prisma.homePage.upsert).mockResolvedValue(row({}) as never)
    await saveHomePage('org1', [block('a')], 'user1')

    const arg = vi.mocked(prisma.homePage.upsert).mock.calls[0][0]
    expect(arg.where).toEqual({ organisationId: 'org1' })
  })
})
