import { Session } from 'next-auth'
import type { Role } from '@/types'

// ─── Permission constants ──────────────────────────────────────────────────────

export const CHARITY_PERMISSIONS = {
  MANAGE_ORGANISATIONS: 'manage_organisations',
  MANAGE_TRAINING: 'manage_training',
  MANAGE_SURVEYS: 'manage_surveys',
  MANAGE_ANNOUNCEMENTS: 'manage_announcements',
  VIEW_REPORTS: 'view_reports',
  MANAGE_SESSIONS: 'manage_sessions',
  MANAGE_LIBRARY: 'manage_library',
} as const

export type CharityPermission = (typeof CHARITY_PERMISSIONS)[keyof typeof CHARITY_PERMISSIONS]

export const ALL_CHARITY_PERMISSIONS: CharityPermission[] = Object.values(CHARITY_PERMISSIONS)

export const PERMISSION_LABELS: Record<string, string> = {
  manage_announcements: 'Manage Announcements',
  manage_library: 'Manage Library',
  manage_organisations: 'Manage Organisations',
  manage_surveys: 'Manage Surveys',
  manage_training: 'Manage Training',
  manage_sessions: 'Manage Workshops',
  view_reports: 'View Reports',
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
}

/** Get the display label for a role. Falls back to the raw role string. */
export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role
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

/** Any of the five leaf roles (end users who do training) */
export function isLeafRole(session: Session | null): boolean {
  return hasRole(session, 'CAREGIVER', 'CAREER_DEV_OFFICER', 'STUDENT', 'INTERN', 'EMPLOYEE')
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

/**
 * Returns true if the user's role is CAREGIVER.
 * SUPER_ADMIN and ORG_ADMIN do NOT access training routes.
 */
export function canAccessCaregiving(session: Session | null): boolean {
  return hasRole(session, 'CAREGIVER')
}

/** Roles that can create and manage virtual classroom sessions */
export function canCreateSessions(session: Session | null): boolean {
  if (!session?.user?.role) return false
  if (hasPermission(session, CHARITY_PERMISSIONS.MANAGE_SESSIONS)) return true
  return hasRole(session, 'ORG_ADMIN', 'CAREGIVER', 'CAREER_DEV_OFFICER')
}

/** Roles that can access the CV Builder feature (also requires org-level flag to be enabled) */
export function canAccessCVBuilder(session: Session | null): boolean {
  if (!session?.user?.role) return false
  const hasRole = ['CAREER_DEV_OFFICER', 'STUDENT', 'INTERN', 'EMPLOYEE'].includes(session.user.role)
  const orgEnabled = (session.user as { cvBuilderEnabled?: boolean }).cvBuilderEnabled !== false
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
