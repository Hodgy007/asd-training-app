import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  classSession: { findMany: vi.fn(), findUnique: vi.fn() },
  user: { findMany: vi.fn(), findFirst: vi.fn() },
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
