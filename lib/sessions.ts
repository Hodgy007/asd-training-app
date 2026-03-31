import prisma from './prisma'
import type { ClassSession, SessionAttendee, User, Role, SessionStatus } from '@prisma/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SessionWithDetails = ClassSession & {
  host: User
  createdBy: User
  attendees: (SessionAttendee & { user: User })[]
  _count: { attendees: number }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** All sessions for an org, optionally filtered by status, ordered by scheduledAt desc. */
export async function getOrgSessions(
  orgId: string,
  status?: SessionStatus
): Promise<SessionWithDetails[]> {
  return prisma.classSession.findMany({
    where: {
      organisationId: orgId,
      ...(status ? { status } : {}),
    },
    orderBy: { scheduledAt: 'desc' },
    include: {
      host: true,
      createdBy: true,
      attendees: { include: { user: true } },
      _count: { select: { attendees: true } },
    },
  })
}

/** Single session with all relations, or null if not found. */
export async function getSessionById(sessionId: string): Promise<SessionWithDetails | null> {
  return prisma.classSession.findUnique({
    where: { id: sessionId },
    include: {
      host: true,
      createdBy: true,
      attendees: { include: { user: true } },
      _count: { select: { attendees: true } },
    },
  })
}

/**
 * Sessions the user is invited to (as attendee) or is hosting,
 * with status SCHEDULED or IN_PROGRESS, scheduled from now onwards.
 * Limited to 10, ordered by scheduledAt asc.
 */
export async function getUpcomingSessions(userId: string): Promise<SessionWithDetails[]> {
  return prisma.classSession.findMany({
    where: {
      status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      scheduledAt: { gte: new Date() },
      OR: [
        { hostId: userId },
        { attendees: { some: { userId } } },
      ],
    },
    orderBy: { scheduledAt: 'asc' },
    take: 10,
    include: {
      host: true,
      createdBy: true,
      attendees: { include: { user: true } },
      _count: { select: { attendees: true } },
    },
  })
}

// ─── Attendee resolution ──────────────────────────────────────────────────────

interface AttendeeSelection {
  /** Include all active non-admin users in the org */
  allRoles?: boolean
  /** Include all active users with these specific roles */
  roles?: Role[]
  /** Include these specific user IDs */
  userIds?: string[]
}

/**
 * Resolves an attendee selection to a deduplicated array of user IDs.
 * Combines allRoles, roles, and explicit userIds, removing duplicates.
 */
export async function resolveAttendees(
  orgId: string,
  selection: AttendeeSelection
): Promise<string[]> {
  const ADMIN_ROLES: Role[] = ['SUPER_ADMIN', 'ORG_ADMIN']
  const idSet = new Set<string>()

  // Fetch by all non-admin roles
  if (selection.allRoles) {
    const users = await prisma.user.findMany({
      where: {
        organisationId: orgId,
        active: true,
        role: { notIn: ADMIN_ROLES },
      },
      select: { id: true },
    })
    users.forEach(u => idSet.add(u.id))
  }

  // Fetch by specific roles
  if (selection.roles && selection.roles.length > 0) {
    const users = await prisma.user.findMany({
      where: {
        organisationId: orgId,
        active: true,
        role: { in: selection.roles },
      },
      select: { id: true },
    })
    users.forEach(u => idSet.add(u.id))
  }

  // Add explicit user IDs
  if (selection.userIds && selection.userIds.length > 0) {
    selection.userIds.forEach(id => idSet.add(id))
  }

  return Array.from(idSet)
}

// ─── Charity session queries ─────────────────────────────────────────────────

/** All charity-level sessions, optionally filtered by status, ordered by scheduledAt desc. */
export async function getCharitySessions(
  status?: SessionStatus
): Promise<SessionWithDetails[]> {
  return prisma.classSession.findMany({
    where: {
      isCharitySession: true,
      ...(status ? { status } : {}),
    },
    orderBy: { scheduledAt: 'desc' },
    include: {
      host: true,
      createdBy: true,
      attendees: { include: { user: true } },
      _count: { select: { attendees: true } },
    },
  })
}

// ─── Charity session attendee resolution ─────────────────────────────────────

interface CharityAttendeeSelection {
  /** Include all active organisations */
  allOrgs?: boolean
  /** Include these specific organisation IDs */
  organisationIds?: string[]
  /** Include all non-admin roles across selected orgs */
  allRoles?: boolean
  /** Include these specific roles across selected orgs */
  roles?: Role[]
  /** Include specific user IDs */
  userIds?: string[]
  /** Also include charity-level users (SUPER_ADMIN + CHARITY_EMPLOYEE) */
  includeCharityStaff?: boolean
}

/**
 * Resolves attendees for a charity-level session across multiple organisations.
 * Supports org × role cartesian product plus explicit user IDs.
 */
export async function resolveCharitySessionAttendees(
  selection: CharityAttendeeSelection
): Promise<string[]> {
  const ADMIN_ROLES: Role[] = ['SUPER_ADMIN', 'CHARITY_EMPLOYEE', 'ORG_ADMIN']
  const idSet = new Set<string>()

  // Determine target org filter
  let orgFilter: { organisationId: { in: string[] } } | { organisationId: { not: null } } | undefined

  if (selection.allOrgs) {
    orgFilter = { organisationId: { not: null } }
  } else if (selection.organisationIds && selection.organisationIds.length > 0) {
    orgFilter = { organisationId: { in: selection.organisationIds } }
  }

  // Fetch by all non-admin roles across target orgs
  if (orgFilter && selection.allRoles) {
    const users = await prisma.user.findMany({
      where: {
        ...orgFilter,
        active: true,
        role: { notIn: ADMIN_ROLES },
      },
      select: { id: true },
    })
    users.forEach((u) => idSet.add(u.id))
  }

  // Fetch by specific roles across target orgs
  if (orgFilter && selection.roles && selection.roles.length > 0) {
    const users = await prisma.user.findMany({
      where: {
        ...orgFilter,
        active: true,
        role: { in: selection.roles },
      },
      select: { id: true },
    })
    users.forEach((u) => idSet.add(u.id))
  }

  // Include charity-level staff
  if (selection.includeCharityStaff) {
    const charityUsers = await prisma.user.findMany({
      where: {
        active: true,
        role: { in: ['SUPER_ADMIN', 'CHARITY_EMPLOYEE'] },
      },
      select: { id: true },
    })
    charityUsers.forEach((u) => idSet.add(u.id))
  }

  // Add explicit user IDs
  if (selection.userIds && selection.userIds.length > 0) {
    selection.userIds.forEach((id) => idSet.add(id))
  }

  return Array.from(idSet)
}

// ─── Authorisation ────────────────────────────────────────────────────────────

interface SessionManagerUser {
  id: string
  role: Role
  organisationId?: string | null
}

/**
 * Returns true if the user can manage (edit/cancel/delete) the session.
 * Allowed when the user is an ORG_ADMIN in the same org, or is the host.
 */
export function canManageSession(
  session: ClassSession,
  user: SessionManagerUser
): boolean {
  if (user.role === 'ORG_ADMIN' && user.organisationId != null && user.organisationId === session.organisationId) {
    return true
  }
  if (session.hostId === user.id) return true
  if (session.createdById === user.id) return true
  return false
}
