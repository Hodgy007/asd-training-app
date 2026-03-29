import { Session } from 'next-auth'
import type { Role } from '@/types'

/**
 * Returns true if the session has one of the required roles.
 */
export function hasRole(session: Session | null, ...roles: Role[]): boolean {
  if (!session?.user?.role) return false
  return roles.includes(session.user.role as Role)
}

/** SUPER_ADMIN — top-level charity authority */
export function isSuperAdmin(session: Session | null): boolean {
  return hasRole(session, 'SUPER_ADMIN')
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
  return hasRole(session, 'ORG_ADMIN', 'CAREGIVER', 'CAREER_DEV_OFFICER')
}
