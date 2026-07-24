import { Session } from 'next-auth'
import type { Role } from '@/types'

// ─── Permission constants ──────────────────────────────────────────────────────

export const CHARITY_PERMISSIONS = {
  MANAGE_ORGANISATIONS: 'manage_organisations',
  MANAGE_COHORTS: 'manage_cohorts',
  MANAGE_TRAINING: 'manage_training',
  MANAGE_SURVEYS: 'manage_surveys',
  MANAGE_ANNOUNCEMENTS: 'manage_announcements',
  VIEW_REPORTS: 'view_reports',
  MANAGE_SESSIONS: 'manage_sessions',
  MANAGE_LIBRARY: 'manage_library',
  MANAGE_AI_PROMPTS: 'manage_ai_prompts',
  MANAGE_JOBS: 'manage_jobs',
} as const

export type CharityPermission = (typeof CHARITY_PERMISSIONS)[keyof typeof CHARITY_PERMISSIONS]

export const ALL_CHARITY_PERMISSIONS: CharityPermission[] = Object.values(CHARITY_PERMISSIONS)

export const PERMISSION_LABELS: Record<string, string> = {
  manage_announcements: 'Manage Announcements',
  manage_cohorts: 'Manage Cohorts',
  manage_library: 'Manage Library',
  manage_organisations: 'Manage Organisations',
  manage_surveys: 'Manage Surveys',
  manage_training: 'Manage Training',
  manage_sessions: 'Manage Workshops',
  view_reports: 'View Reports',
  manage_ai_prompts: 'Manage AI Prompts',
  manage_jobs: 'Manage Job Openings',
}

// ─── Display labels ────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Charity Admin',
  CHARITY_EMPLOYEE: 'Charity Employee',
  ORG_ADMIN: 'Org Admin',
  LEARNER: 'Learner',
}

/** Get the display label for a role. Falls back to the raw role string. */
export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role
}

// ─── Organisation type labels & helpers ────────────────────────────────────────

export const ORG_TYPE_LABELS: Record<string, string> = {
  CHARITY: 'Charity (internal)',
  SCHOOL: 'School',
  COLLEGE: 'College',
  ACADEMY: 'Academy',
  UNIVERSITY: 'University',
  EMPLOYER: 'Employer',
  EDUCATION: 'Education (legacy)',
  BUSINESS: 'Business (legacy)',
}

/**
 * Org types available when provisioning a new organisation (excludes legacy values).
 *
 * CHARITY is deliberately absent: there is exactly one charity org, seeded once, and
 * it must not be creatable through the provisioning UI.
 */
export const ORG_TYPES = ['SCHOOL', 'COLLEGE', 'ACADEMY', 'UNIVERSITY', 'EMPLOYER'] as const
export type OrgType = (typeof ORG_TYPES)[number]

/** True for the charity's own organisation — its members are internal staff. */
export function isInternalOrgType(organisationType: string | null | undefined): boolean {
  return organisationType === 'CHARITY'
}

// ─── Role checks ───────────────────────────────────────────────────────────────

/**
 * Returns true if the session has one of the required roles.
 */
export function hasRole(session: Session | null, ...roles: Role[]): boolean {
  if (!session?.user?.role) return false
  return roles.includes(session.user.role as Role)
}

/** SUPER_ADMIN — top-level charity authority (Charity Admin) */
export function isSuperAdmin(session: Session | null): boolean {
  return hasRole(session, 'SUPER_ADMIN')
}

/** Alias for isSuperAdmin — used in display contexts */
export const isCharityAdmin = isSuperAdmin

/** CHARITY_EMPLOYEE — delegated charity-level access */
export function isCharityEmployee(session: Session | null): boolean {
  return hasRole(session, 'CHARITY_EMPLOYEE')
}

/** Returns true if the user is either SUPER_ADMIN or CHARITY_EMPLOYEE */
export function isCharityLevel(session: Session | null): boolean {
  return hasRole(session, 'SUPER_ADMIN', 'CHARITY_EMPLOYEE')
}

/** ORG_ADMIN — manages one organisation */
export function isOrgAdmin(session: Session | null): boolean {
  return hasRole(session, 'ORG_ADMIN')
}

/** LEARNER — anyone who takes training, internal charity staff or external. */
export function isLearner(session: Session | null): boolean {
  return hasRole(session, 'LEARNER')
}

/**
 * Backwards-compat alias for isLearner.
 * @deprecated There is only one leaf role now — prefer isLearner().
 */
export const isLeafRole = isLearner

/**
 * Backwards-compat alias. Now checks SUPER_ADMIN instead of ADMIN.
 */
export function isAdmin(session: Session | null): boolean {
  return isSuperAdmin(session)
}

/** Who can create and manage virtual classroom sessions. */
export function canCreateSessions(session: Session | null): boolean {
  if (!session?.user?.role) return false
  if (hasPermission(session, CHARITY_PERMISSIONS.MANAGE_SESSIONS)) return true
  return hasRole(session, 'ORG_ADMIN')
}

// ─── Permission checks ─────────────────────────────────────────────────────────

/**
 * Check if a user has a specific charity-level permission.
 * - SUPER_ADMIN always returns true (full access).
 * - CHARITY_EMPLOYEE checks the charityPermissions array.
 * - All other roles return false.
 */
export function hasPermission(session: Session | null, permission: string): boolean {
  if (!session?.user?.role) return false
  if (session.user.role === 'SUPER_ADMIN') return true
  if (session.user.role === 'CHARITY_EMPLOYEE') {
    const perms = session.user.charityPermissions ?? []
    return perms.includes(permission)
  }
  return false
}

/**
 * Who can manage the charity tier of job openings — those with no owning
 * organisation, visible platform-wide.
 */
export function canManageCharityJobs(session: Session | null): boolean {
  if (!session?.user) return false
  if (isSuperAdmin(session)) return true
  return hasPermission(session, CHARITY_PERMISSIONS.MANAGE_JOBS)
}

/**
 * Backwards-compat alias for canManageCharityJobs.
 * @deprecated Jobs are now two-tier — say which tier you mean.
 */
export const canManageJobs = canManageCharityJobs

/**
 * Who can manage an organisation's own job openings. Org admins manage their own
 * org; charity-level users with manage_jobs can manage any org's.
 */
export function canManageOrgJobs(session: Session | null, orgId: string | null): boolean {
  if (!session?.user) return false
  if (canManageCharityJobs(session)) return true
  if (!isOrgAdmin(session) || !orgId) return false
  return session.user.organisationId === orgId
}

/** Who can see the learner Jobs page. */
export function canAccessJobs(session: Session | null): boolean {
  return hasRole(session, 'LEARNER')
}
