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
  if (user.role === 'ORG_ADMIN' && user.organisationId === session.organisationId) {
    return true
  }
  return session.hostId === user.id
}
