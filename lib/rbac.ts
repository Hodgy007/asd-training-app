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
  CAREGIVER: 'Practitioner',
  CAREER_DEV_OFFICER: 'Careers Professional',
  STUDENT: 'Student',
  INTERN: 'Intern',
  EMPLOYEE: 'Employee',
  PARTICIPANT: 'Workshop Participant',
  FAMILY_CARER: 'Parent/Friend/Relative/Carer',
}

/** Get the display label for a role. Falls back to the raw role string. */
export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role
}

// ─── Organisation type labels & helpers ────────────────────────────────────────

export const ORG_TYPE_LABELS: Record<string, string> = {
  SCHOOL: 'School',
  COLLEGE: 'College',
  ACADEMY: 'Academy',
  UNIVERSITY: 'University',
  EMPLOYER: 'Employer',
  EDUCATION: 'Education (legacy)',
  BUSINESS: 'Business (legacy)',
}

/** All org types available for new organisations (excludes legacy values). */
export const ORG_TYPES = ['SCHOOL', 'COLLEGE', 'ACADEMY', 'UNIVERSITY', 'EMPLOYER'] as const
export type OrgType = (typeof ORG_TYPES)[number]

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

/** Any of the leaf roles (end users who do training, including workshop participants) */
export function isLeafRole(session: Session | null): boolean {
  return hasRole(
    session,
    'CAREGIVER',
    'CAREER_DEV_OFFICER',
    'STUDENT',
    'INTERN',
    'EMPLOYEE',
    'PARTICIPANT',
    'FAMILY_CARER'
  )
}

/** FAMILY_CARER — parent/friend/relative/carer (stripped-back surface; no training/careers/sessions). */
export function isFamilyCarer(session: Session | null): boolean {
  return hasRole(session, 'FAMILY_CARER')
}

/** PARTICIPANT — joined a cohort via invite link, no formal org affiliation */
export function isParticipant(session: Session | null): boolean {
  return hasRole(session, 'PARTICIPANT')
}

/**
 * Backwards-compat alias. Now checks SUPER_ADMIN instead of ADMIN.
 */
export function isAdmin(session: Session | null): boolean {
  return isSuperAdmin(session)
}

/**
 * Returns true if the user's role is CAREER_DEV_OFFICER.
 * SUPER_ADMIN and ORG_ADMIN do NOT access training routes.
 */
export function canAccessCareers(session: Session | null): boolean {
  return hasRole(session, 'CAREER_DEV_OFFICER')
}

/** Leaf roles that a CAREER_DEV_OFFICER manages (students). */
export const CDO_MANAGED_ROLES: Role[] = ['STUDENT', 'INTERN', 'EMPLOYEE']

/** Returns true if the session is a CAREER_DEV_OFFICER (can manage students). */
export function canManageStudents(session: Session | null): boolean {
  return hasRole(session, 'CAREER_DEV_OFFICER')
}

/** Roles that can create and manage virtual classroom sessions */
export function canCreateSessions(session: Session | null): boolean {
  if (!session?.user?.role) return false
  if (hasPermission(session, CHARITY_PERMISSIONS.MANAGE_SESSIONS)) return true
  return hasRole(session, 'ORG_ADMIN', 'CAREGIVER', 'CAREER_DEV_OFFICER')
}

/**
 * Roles that can access the Careers Advisor feature.
 * Charity-level users (SUPER_ADMIN, CHARITY_EMPLOYEE) can always use it for
 * self-testing — they bypass the org-level feature flag because they have no org.
 * Leaf roles also require the org-level flag to be enabled.
 */
export function canAccessCareersAdvisor(session: Session | null): boolean {
  if (!session?.user?.role) return false
  if (isCharityLevel(session)) return true
  const hasRole = ['CAREER_DEV_OFFICER', 'STUDENT', 'INTERN', 'EMPLOYEE'].includes(session.user.role)
  const orgEnabled = (session.user as { careersAdvisorEnabled?: boolean }).careersAdvisorEnabled !== false
  return hasRole && orgEnabled
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

/** Who can create/edit job openings — SUPER_ADMIN or CHARITY_EMPLOYEE with manage_jobs. */
export function canManageJobs(session: Session | null): boolean {
  if (!session?.user) return false
  if (isSuperAdmin(session)) return true
  return hasPermission(session, CHARITY_PERMISSIONS.MANAGE_JOBS)
}

/** Who can see the learner Jobs page. */
export function canAccessJobs(session: Session | null): boolean {
  return hasRole(session, 'CAREER_DEV_OFFICER', 'STUDENT', 'INTERN', 'EMPLOYEE')
}
