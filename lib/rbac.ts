import { Session } from 'next-auth'

export type Role = 'CAREGIVER' | 'CAREER_DEV_OFFICER' | 'ADMIN'

/**
 * Returns true if the session has one of the required roles.
 * Always returns false if session is null.
 */
export function hasRole(session: Session | null, ...roles: Role[]): boolean {
  if (!session?.user?.role) return false
  return roles.includes(session.user.role as Role)
}

/**
 * Returns true if the user is an admin.
 */
export function isAdmin(session: Session | null): boolean {
  return hasRole(session, 'ADMIN')
}

/**
 * Returns true if the user can access the careers training section.
 */
export function canAccessCareers(session: Session | null): boolean {
  return hasRole(session, 'CAREER_DEV_OFFICER', 'ADMIN')
}

/**
 * Returns true if the user can access the caregiver section (children, ASD training, reports).
 */
export function canAccessCaregiving(session: Session | null): boolean {
  return hasRole(session, 'CAREGIVER', 'ADMIN')
}
