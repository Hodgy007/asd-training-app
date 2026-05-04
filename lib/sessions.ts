import prisma from './prisma'
import type { ClassSession, SessionAttendee, Role, SessionStatus } from '@prisma/client'

// ─── Types ────────────────────────────────────────────────────────────────────

// Only safe-to-expose User fields. NEVER include `password` or `totpSecret` here —
// SessionWithDetails is returned in JSON responses to org admins / hosts.
export type SafeSessionUser = {
  id: string
  name: string | null
  email: string
  role: Role
  organisationId: string | null
}

export type SessionWithDetails = ClassSession & {
  host: SafeSessionUser
  createdBy: SafeSessionUser
  attendees: (SessionAttendee & { user: SafeSessionUser })[]
  _count: { attendees: number }
}

const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  organisationId: true,
} as const

const SESSION_INCLUDE = {
  host: { select: SAFE_USER_SELECT },
  createdBy: { select: SAFE_USER_SELECT },
  attendees: { include: { user: { select: SAFE_USER_SELECT } } },
  _count: { select: { attendees: true } },
} as const

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
    include: SESSION_INCLUDE,
  })
}

/** Single session with all relations, or null if not found. */
export async function getSessionById(sessionId: string): Promise<SessionWithDetails | null> {
  return prisma.classSession.findUnique({
    where: { id: sessionId },
    include: SESSION_INCLUDE,
  })
}

/**
 * Sessions the user is invited to (as attendee) or is hosting,
 * with status SCHEDULED or IN_PROGRESS, scheduled from now onwards.
 * Limited to 10, ordered by scheduledAt asc.
 */
export async function getUpcomingSessions(userId: string): Promise<SessionWithDetails[]> {
  const now = new Date()
  return prisma.classSession.findMany({
    where: {
      OR: [
        { status: 'SCHEDULED', scheduledAt: { gte: now } },
        { status: 'IN_PROGRESS' },
      ],
      AND: {
        OR: [
          { hostId: userId },
          { attendees: { some: { userId } } },
        ],
      },
    },
    orderBy: { scheduledAt: 'asc' },
    take: 10,
    include: SESSION_INCLUDE,
  })
}

export async function isActiveUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { id: userId, active: true },
    select: { id: true },
  })
  return Boolean(user)
}

export async function isActiveOrgUser(orgId: string, userId: string): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { id: userId, organisationId: orgId, active: true },
    select: { id: true },
  })
  return Boolean(user)
}

async function getActiveOrgUserIds(orgId: string, userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return []

  const users = await prisma.user.findMany({
    where: {
      id: { in: userIds },
      organisationId: orgId,
      active: true,
    },
    select: { id: true },
  })

  return users.map((u) => u.id)
}

async function getActiveUserIds(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return []

  const users = await prisma.user.findMany({
    where: {
      id: { in: userIds },
      active: true,
    },
    select: { id: true },
  })

  return users.map((u) => u.id)
}

export async function findInvalidOrgUserIds(orgId: string, userIds: string[]): Promise<string[]> {
  const uniqueIds = Array.from(new Set(userIds))
  const validIds = new Set(await getActiveOrgUserIds(orgId, uniqueIds))
  return uniqueIds.filter((id) => !validIds.has(id))
}

export async function findInvalidUserIds(userIds: string[]): Promise<string[]> {
  const uniqueIds = Array.from(new Set(userIds))
  const validIds = new Set(await getActiveUserIds(uniqueIds))
  return uniqueIds.filter((id) => !validIds.has(id))
}

/**
 * Same as canManageSession, plus parent-org admins managing direct child org sessions.
 */
export async function canManageSessionWithChildren(
  classSession: ClassSession,
  user: SessionManagerUser,
  canManageChildOrg: (orgId: string) => Promise<boolean>
): Promise<boolean> {
  if (canManageSession(classSession, user)) return true
  if (user.role !== 'ORG_ADMIN' || !classSession.organisationId) return false
  return canManageChildOrg(classSession.organisationId)
}

/*
 * Legacy note: attendees can be selected by role or by explicit IDs. Explicit
 * IDs are still filtered through the database so a crafted request cannot add
 * inactive users or users from a different organisation.
 */
async function addExplicitOrgUsers(orgId: string, userIds: string[], idSet: Set<string>) {
  const validUserIds = await getActiveOrgUserIds(orgId, Array.from(new Set(userIds)))
  validUserIds.forEach((id) => idSet.add(id))
}

async function addExplicitActiveUsers(userIds: string[], idSet: Set<string>) {
  const validUserIds = await getActiveUserIds(Array.from(new Set(userIds)))
  validUserIds.forEach((id) => idSet.add(id))
}

/*
 * Keep this shape near the original query helpers. The implementation below is
 * intentionally stricter than the historical version: explicit IDs are filtered
 * the same way role-derived IDs are.
 */
export async function resolveOrgAttendeeIds(
  orgId: string,
  selection: AttendeeSelection
): Promise<string[]> {
  const ADMIN_ROLES: Role[] = ['SUPER_ADMIN', 'ORG_ADMIN']
  const idSet = new Set<string>()

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

  if (selection.userIds && selection.userIds.length > 0) {
    await addExplicitOrgUsers(orgId, selection.userIds, idSet)
  }

  return Array.from(idSet)
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
  return resolveOrgAttendeeIds(orgId, selection)
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
    include: SESSION_INCLUDE,
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
    await addExplicitActiveUsers(selection.userIds, idSet)
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
