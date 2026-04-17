import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    survey: { findMany: vi.fn() },
    classSession: { findMany: vi.fn() },
    module: { findMany: vi.fn() },
    libraryDocument: { findMany: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}))

import { prisma } from '@/lib/prisma'
import { getNotifications } from '../notifications'
import type { Session } from 'next-auth'

function mockSession(overrides: Partial<Session['user']> = {}): Session {
  return {
    expires: new Date(Date.now() + 3600_000).toISOString(),
    user: {
      id: 'u1',
      email: 'u@x.com',
      name: 'User',
      role: 'CAREGIVER',
      organisationId: 'o1',
      mustChangePassword: false,
      totpEnabled: false,
      mfaPending: false,
      hasPassword: true,
      effectivePrograms: [{ id: 'p1', name: 'ASD Awareness' }],
      charityPermissions: [],
      cvBuilderEnabled: true,
      careersAdvisorEnabled: true,
      isParentOrg: false,
      ...overrides,
    },
  } as unknown as Session
}

describe('getNotifications', () => {
  beforeEach(() => {
    vi.mocked(prisma.survey.findMany).mockResolvedValue([])
    vi.mocked(prisma.classSession.findMany).mockResolvedValue([])
    vi.mocked(prisma.module.findMany).mockResolvedValue([])
    vi.mocked(prisma.libraryDocument.findMany).mockResolvedValue([])
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      notificationsLastOpenedAt: null,
      createdAt: new Date('2026-01-01'),
    } as never)
  })

  it('returns an empty payload when nothing is pending', async () => {
    const result = await getNotifications(mockSession())
    expect(result).toEqual({
      count: 0,
      sections: { forYou: [], whatsNew: [] },
    })
  })

  it('includes pending surveys in the For You section and counts them', async () => {
    vi.mocked(prisma.survey.findMany).mockResolvedValue([
      { id: 's1', title: 'Training feedback', createdAt: new Date('2026-04-10') } as never,
    ])

    const result = await getNotifications(mockSession())

    expect(result.sections.forYou).toHaveLength(1)
    expect(result.sections.forYou[0]).toMatchObject({
      id: 's1',
      kind: 'survey',
      title: 'Training feedback',
      href: '/surveys/s1',
    })
    expect(result.count).toBe(1)

    const args = vi.mocked(prisma.survey.findMany).mock.calls[0]![0] as {
      where: Record<string, unknown>
    }
    expect(args.where.status).toBe('PUBLISHED')
  })

  it('includes upcoming workshops the user is an attendee for', async () => {
    const fiveDaysOut = new Date(Date.now() + 5 * 86_400_000)
    vi.mocked(prisma.classSession.findMany).mockResolvedValue([
      { id: 'w1', title: 'Team training', scheduledAt: fiveDaysOut } as never,
    ])

    const result = await getNotifications(mockSession())

    expect(result.sections.forYou).toContainEqual(
      expect.objectContaining({
        id: 'w1',
        kind: 'workshop',
        title: 'Team training',
        href: '/sessions',
      }),
    )
    expect(result.count).toBeGreaterThanOrEqual(1)
  })

  it('includes new modules as What\'s New and marks them isNew when created after lastOpenedAt', async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      notificationsLastOpenedAt: new Date(Date.now() - 7 * 86_400_000),
      createdAt: new Date('2026-01-01'),
    } as never)
    vi.mocked(prisma.module.findMany).mockResolvedValue([
      {
        id: 'm1',
        title: 'New module',
        programId: 'p1',
        createdAt: threeDaysAgo,
        program: { name: 'ASD Awareness' },
      } as never,
    ])

    const result = await getNotifications(mockSession())

    expect(result.sections.whatsNew).toContainEqual(
      expect.objectContaining({
        id: 'm1',
        kind: 'module',
        href: '/training/p1/m1',
        supporting: 'ASD Awareness',
        isNew: true,
      }),
    )
    expect(result.count).toBe(1)
  })

  it('keeps older modules visible in What\'s New but does not count them', async () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 86_400_000)
    const oneDayAgo = new Date(Date.now() - 86_400_000)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      notificationsLastOpenedAt: oneDayAgo,
      createdAt: new Date('2026-01-01'),
    } as never)
    vi.mocked(prisma.module.findMany).mockResolvedValue([
      {
        id: 'm1',
        title: 'Older module',
        programId: 'p1',
        createdAt: fiveDaysAgo,
        program: { name: 'ASD Awareness' },
      } as never,
    ])

    const result = await getNotifications(mockSession())

    expect(result.sections.whatsNew).toHaveLength(1)
    expect(result.sections.whatsNew[0]!.isNew).toBe(false)
    expect(result.count).toBe(0)
  })

  it('includes new library documents visible to the user', async () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000)
    vi.mocked(prisma.libraryDocument.findMany).mockResolvedValue([
      {
        id: 'd1',
        title: 'Safeguarding policy',
        createdAt: twoDaysAgo,
        collection: { id: 'c1', title: 'Org policies' },
      } as never,
    ])

    const result = await getNotifications(mockSession())

    expect(result.sections.whatsNew).toContainEqual(
      expect.objectContaining({
        id: 'd1',
        kind: 'library',
        href: '/library?c=c1',
        supporting: 'Org policies',
      }),
    )
  })
})
