import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => {
  const prisma = {
    survey: { findMany: vi.fn() },
    classSession: { findMany: vi.fn() },
    module: { findMany: vi.fn() },
    libraryDocument: { findMany: vi.fn() },
    user: { findUnique: vi.fn() },
  }
  return { prisma, default: prisma }
})

import { prisma } from '@/lib/prisma'
import { getNotifications } from '../notifications'
import type { Session } from 'next-auth'

function mockSession(overrides: Partial<Session['user']> = {}): Session {
  return {
    expires: new Date(Date.now() + 3600_000).toISOString(),
    user: {
      id: 'u1', email: 'u@x.com', name: 'U', role: 'LEARNER', organisationId: 'o1',
      mustChangePassword: false, totpEnabled: false, mfaPending: false, hasPassword: true,
      effectivePrograms: [], charityPermissions: [], isParentOrg: false,
      ...overrides,
    },
  } as unknown as Session
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.survey.findMany).mockResolvedValue([])
  vi.mocked(prisma.classSession.findMany).mockResolvedValue([])
  vi.mocked(prisma.module.findMany).mockResolvedValue([])
  vi.mocked(prisma.libraryDocument.findMany).mockResolvedValue([])
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    id: 'u1', notificationsLastOpenedAt: null, createdAt: new Date('2026-01-01'),
  } as never)
})

function targetsClause() {
  const args = vi.mocked(prisma.survey.findMany).mock.calls[0]![0] as {
    where: { targets: { some: { OR: unknown[] } } }
  }
  return args.where.targets.some.OR
}

describe('survey notification targeting is conjunctive (no cross-org leak)', () => {
  it('matches by direct user target OR (role AND org) together, not role alone', async () => {
    await getNotifications(mockSession({ organisationId: 'o1' }))
    const or = targetsClause() as Array<Record<string, unknown>>
    // Direct user-id target.
    expect(or).toContainEqual({ userId: 'u1' })
    // Role/org leg is an AND, and its org clause names this org (not a bare role match).
    const andLeg = or.find((c) => 'AND' in c) as { AND: unknown[] } | undefined
    expect(andLeg).toBeTruthy()
    const serialised = JSON.stringify(andLeg)
    expect(serialised).toContain('"organisationId":"o1"')
    expect(serialised).toContain('"role":"LEARNER"')
  })

  it('for an org-less user the org clause matches only null-org targets (no match-all {})', async () => {
    await getNotifications(mockSession({ organisationId: null }))
    const or = targetsClause() as Array<Record<string, unknown>>
    const andLeg = or.find((c) => 'AND' in c) as { AND: Array<{ OR?: unknown[] }> }
    // The org OR sub-clause must be exactly [{organisationId:null}] — never
    // contain an empty {} object, which Prisma treats as match-any.
    const orgSub = andLeg.AND.map((x) => x.OR).find((o) => o && JSON.stringify(o).includes('organisationId'))
    expect(orgSub).toEqual([{ organisationId: null }])
    expect(JSON.stringify(andLeg)).not.toContain('{}')
  })
})
