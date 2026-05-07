import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  classSession: { findMany: vi.fn(), findUnique: vi.fn() },
  user: { findMany: vi.fn(), findFirst: vi.fn() },
  cohortMembership: { findMany: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({
  default: prismaMock,
  prisma: prismaMock,
}))

import {
  canManageSessionWithChildren,
  getUpcomingSessions,
  isActiveOrgUser,
  resolveAttendees,
  resolveCharitySessionAttendees,
} from '../sessions'

describe('workshop session helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.classSession.findMany.mockResolvedValue([])
    prismaMock.user.findMany.mockResolvedValue([])
    prismaMock.user.findFirst.mockResolvedValue(null)
    prismaMock.cohortMembership.findMany.mockResolvedValue([])
  })

  it('keeps in-progress workshops visible after their scheduled start time', async () => {
    await getUpcomingSessions('user-1')

    const args = prismaMock.classSession.findMany.mock.calls[0][0]
    expect(args.where.OR).toContainEqual({ status: 'IN_PROGRESS' })
    expect(args.where.OR[0]).toMatchObject({ status: 'SCHEDULED' })
    expect(args.where.AND.OR).toEqual([
      { hostId: 'user-1' },
      { attendees: { some: { userId: 'user-1' } } },
    ])
  })

  it('filters explicit org attendee IDs to active users in that organisation', async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([{ id: 'valid-user' }])

    const result = await resolveAttendees('org-1', {
      userIds: ['valid-user', 'foreign-user', 'inactive-user'],
    })

    expect(result).toEqual(['valid-user'])
    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['valid-user', 'foreign-user', 'inactive-user'] },
        organisationId: 'org-1',
        active: true,
      },
      select: { id: true },
    })
  })

  it('filters explicit charity attendee IDs to active users', async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([{ id: 'active-user' }])

    const result = await resolveCharitySessionAttendees({
      userIds: ['active-user', 'inactive-user'],
    })

    expect(result).toEqual(['active-user'])
    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['active-user', 'inactive-user'] },
        active: true,
      },
      select: { id: true },
    })
  })

  it('validates active hosts within the selected organisation', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce({ id: 'host-1' })

    await expect(isActiveOrgUser('org-1', 'host-1')).resolves.toBe(true)
    expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
      where: { id: 'host-1', organisationId: 'org-1', active: true },
      select: { id: true },
    })
  })

  it('resolves charity cohort attendees from active CohortMembership rows', async () => {
    prismaMock.cohortMembership.findMany.mockResolvedValueOnce([
      { userId: 'user-a' },
      { userId: 'user-b' },
    ])

    const result = await resolveCharitySessionAttendees({
      cohortIds: ['cohort-1', 'cohort-2'],
    })

    expect(result.sort()).toEqual(['user-a', 'user-b'])
    expect(prismaMock.cohortMembership.findMany).toHaveBeenCalledWith({
      where: {
        cohortId: { in: ['cohort-1', 'cohort-2'] },
        status: 'ACTIVE',
        user: { active: true },
      },
      select: { userId: true },
    })
  })

  it('unions cohort members with org members and explicit users without duplicates', async () => {
    prismaMock.user.findMany
      // org branch — active non-admin users in the org
      .mockResolvedValueOnce([{ id: 'shared-user' }, { id: 'org-only' }])
      // explicit userIds branch
      .mockResolvedValueOnce([{ id: 'explicit-user' }])
    prismaMock.cohortMembership.findMany.mockResolvedValueOnce([
      { userId: 'shared-user' },
      { userId: 'cohort-only' },
    ])

    const result = await resolveCharitySessionAttendees({
      organisationIds: ['org-1'],
      cohortIds: ['cohort-1'],
      userIds: ['explicit-user'],
    })

    expect(result.sort()).toEqual(['cohort-only', 'explicit-user', 'org-only', 'shared-user'])
  })

  it('selects all active non-admin users when only an organisation is chosen', async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([{ id: 'u1' }, { id: 'u2' }])

    const result = await resolveCharitySessionAttendees({
      organisationIds: ['org-1'],
    })

    expect(result.sort()).toEqual(['u1', 'u2'])
    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: {
        organisationId: { in: ['org-1'] },
        active: true,
        role: { notIn: ['SUPER_ADMIN', 'CHARITY_EMPLOYEE', 'ORG_ADMIN'] },
      },
      select: { id: true },
    })
  })

  it('treats empty cohortIds as a no-op', async () => {
    const result = await resolveCharitySessionAttendees({ cohortIds: [] })
    expect(result).toEqual([])
    expect(prismaMock.cohortMembership.findMany).not.toHaveBeenCalled()
  })

  it('allows parent org admins to manage child org workshops', async () => {
    const canManage = await canManageSessionWithChildren(
      {
        id: 'session-1',
        hostId: 'someone-else',
        createdById: 'creator',
        organisationId: 'child-org',
      } as never,
      { id: 'admin-1', role: 'ORG_ADMIN', organisationId: 'parent-org' },
      async (orgId) => orgId === 'child-org'
    )

    expect(canManage).toBe(true)
  })
})
