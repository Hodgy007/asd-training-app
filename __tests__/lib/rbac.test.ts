import { describe, it, expect } from 'vitest'
import { Session } from 'next-auth'
import {
  hasRole,
  isSuperAdmin,
  isCharityAdmin,
  isCharityEmployee,
  isCharityLevel,
  isOrgAdmin,
  isLeafRole,
  isAdmin,
  canAccessCareers,
  canCreateSessions,
  hasPermission,
  CHARITY_PERMISSIONS,
  getRoleLabel,
  ROLE_LABELS,
} from '@/lib/rbac'

/** Helper to build a minimal session object for testing. */
function makeSession(
  role: string,
  opts?: { charityPermissions?: string[]; organisationId?: string }
): Session {
  return {
    user: {
      id: 'test-user-id',
      role,
      charityPermissions: opts?.charityPermissions ?? [],
      organisationId: opts?.organisationId ?? 'test-org-id',
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  } as Session
}

describe('hasRole', () => {
  it('returns true when session has one of the specified roles', () => {
    const session = makeSession('SUPER_ADMIN')
    expect(hasRole(session, 'SUPER_ADMIN')).toBe(true)
    expect(hasRole(session, 'ORG_ADMIN', 'SUPER_ADMIN')).toBe(true)
  })

  it('returns false when session role does not match', () => {
    const session = makeSession('STUDENT')
    expect(hasRole(session, 'SUPER_ADMIN')).toBe(false)
    expect(hasRole(session, 'ORG_ADMIN', 'SUPER_ADMIN')).toBe(false)
  })

  it('returns false for null session', () => {
    expect(hasRole(null, 'SUPER_ADMIN')).toBe(false)
  })

  it('returns false for session with no user', () => {
    const session = { expires: '' } as Session
    expect(hasRole(session, 'SUPER_ADMIN')).toBe(false)
  })

  it('returns false for session with no role', () => {
    const session = { user: {}, expires: '' } as Session
    expect(hasRole(session, 'SUPER_ADMIN')).toBe(false)
  })
})

describe('isSuperAdmin', () => {
  it('returns true for SUPER_ADMIN', () => {
    expect(isSuperAdmin(makeSession('SUPER_ADMIN'))).toBe(true)
  })

  it('returns false for other roles', () => {
    expect(isSuperAdmin(makeSession('ORG_ADMIN'))).toBe(false)
    expect(isSuperAdmin(makeSession('STUDENT'))).toBe(false)
    expect(isSuperAdmin(makeSession('CHARITY_EMPLOYEE'))).toBe(false)
  })

  it('returns false for null session', () => {
    expect(isSuperAdmin(null)).toBe(false)
  })
})

describe('isCharityAdmin (alias)', () => {
  it('is the same function as isSuperAdmin', () => {
    expect(isCharityAdmin).toBe(isSuperAdmin)
  })

  it('returns true for SUPER_ADMIN', () => {
    expect(isCharityAdmin(makeSession('SUPER_ADMIN'))).toBe(true)
  })
})

describe('isCharityEmployee', () => {
  it('returns true for CHARITY_EMPLOYEE', () => {
    expect(isCharityEmployee(makeSession('CHARITY_EMPLOYEE'))).toBe(true)
  })

  it('returns false for SUPER_ADMIN', () => {
    expect(isCharityEmployee(makeSession('SUPER_ADMIN'))).toBe(false)
  })

  it('returns false for null', () => {
    expect(isCharityEmployee(null)).toBe(false)
  })
})

describe('isCharityLevel', () => {
  it('returns true for SUPER_ADMIN', () => {
    expect(isCharityLevel(makeSession('SUPER_ADMIN'))).toBe(true)
  })

  it('returns true for CHARITY_EMPLOYEE', () => {
    expect(isCharityLevel(makeSession('CHARITY_EMPLOYEE'))).toBe(true)
  })

  it('returns false for ORG_ADMIN', () => {
    expect(isCharityLevel(makeSession('ORG_ADMIN'))).toBe(false)
  })

  it('returns false for leaf roles', () => {
    expect(isCharityLevel(makeSession('STUDENT'))).toBe(false)
    expect(isCharityLevel(makeSession('EMPLOYEE'))).toBe(false)
  })
})

describe('isOrgAdmin', () => {
  it('returns true for ORG_ADMIN', () => {
    expect(isOrgAdmin(makeSession('ORG_ADMIN'))).toBe(true)
  })

  it('returns false for SUPER_ADMIN', () => {
    expect(isOrgAdmin(makeSession('SUPER_ADMIN'))).toBe(false)
  })

  it('returns false for leaf roles', () => {
    expect(isOrgAdmin(makeSession('STUDENT'))).toBe(false)
  })
})

describe('isLeafRole', () => {
  const leafRoles = ['CAREGIVER', 'CAREER_DEV_OFFICER', 'STUDENT', 'INTERN', 'EMPLOYEE', 'PARTICIPANT']
  const nonLeafRoles = ['SUPER_ADMIN', 'CHARITY_EMPLOYEE', 'ORG_ADMIN']

  it.each(leafRoles)('returns true for %s', (role) => {
    expect(isLeafRole(makeSession(role))).toBe(true)
  })

  it.each(nonLeafRoles)('returns false for %s', (role) => {
    expect(isLeafRole(makeSession(role))).toBe(false)
  })

  it('returns false for null session', () => {
    expect(isLeafRole(null)).toBe(false)
  })
})

describe('isAdmin (backwards-compat alias)', () => {
  it('returns true for SUPER_ADMIN', () => {
    expect(isAdmin(makeSession('SUPER_ADMIN'))).toBe(true)
  })

  it('returns false for ORG_ADMIN', () => {
    expect(isAdmin(makeSession('ORG_ADMIN'))).toBe(false)
  })
})

describe('canAccessCareers', () => {
  it('returns true for CAREER_DEV_OFFICER', () => {
    expect(canAccessCareers(makeSession('CAREER_DEV_OFFICER'))).toBe(true)
  })

  it('returns false for SUPER_ADMIN', () => {
    expect(canAccessCareers(makeSession('SUPER_ADMIN'))).toBe(false)
  })

  it('returns false for ORG_ADMIN', () => {
    expect(canAccessCareers(makeSession('ORG_ADMIN'))).toBe(false)
  })
})

describe('canCreateSessions', () => {
  it('returns true for ORG_ADMIN', () => {
    expect(canCreateSessions(makeSession('ORG_ADMIN'))).toBe(true)
  })

  it('returns true for CAREER_DEV_OFFICER', () => {
    expect(canCreateSessions(makeSession('CAREER_DEV_OFFICER'))).toBe(true)
  })

  it('returns true for CAREGIVER', () => {
    expect(canCreateSessions(makeSession('CAREGIVER'))).toBe(true)
  })

  it('returns true for SUPER_ADMIN (has all permissions)', () => {
    expect(canCreateSessions(makeSession('SUPER_ADMIN'))).toBe(true)
  })

  it('returns true for CHARITY_EMPLOYEE with MANAGE_SESSIONS permission', () => {
    const session = makeSession('CHARITY_EMPLOYEE', {
      charityPermissions: [CHARITY_PERMISSIONS.MANAGE_SESSIONS],
    })
    expect(canCreateSessions(session)).toBe(true)
  })

  it('returns false for CHARITY_EMPLOYEE without MANAGE_SESSIONS permission', () => {
    const session = makeSession('CHARITY_EMPLOYEE', {
      charityPermissions: [CHARITY_PERMISSIONS.VIEW_REPORTS],
    })
    expect(canCreateSessions(session)).toBe(false)
  })

  it('returns false for STUDENT', () => {
    expect(canCreateSessions(makeSession('STUDENT'))).toBe(false)
  })

  it('returns false for INTERN', () => {
    expect(canCreateSessions(makeSession('INTERN'))).toBe(false)
  })

  it('returns false for EMPLOYEE', () => {
    expect(canCreateSessions(makeSession('EMPLOYEE'))).toBe(false)
  })

  it('returns false for null session', () => {
    expect(canCreateSessions(null)).toBe(false)
  })
})

describe('hasPermission', () => {
  it('always returns true for SUPER_ADMIN regardless of permission', () => {
    const session = makeSession('SUPER_ADMIN')
    expect(hasPermission(session, 'manage_organisations')).toBe(true)
    expect(hasPermission(session, 'manage_training')).toBe(true)
    expect(hasPermission(session, 'view_reports')).toBe(true)
    expect(hasPermission(session, 'nonexistent_permission')).toBe(true)
  })

  it('returns true for CHARITY_EMPLOYEE with the specified permission', () => {
    const session = makeSession('CHARITY_EMPLOYEE', {
      charityPermissions: ['manage_organisations', 'view_reports'],
    })
    expect(hasPermission(session, 'manage_organisations')).toBe(true)
    expect(hasPermission(session, 'view_reports')).toBe(true)
  })

  it('returns false for CHARITY_EMPLOYEE without the specified permission', () => {
    const session = makeSession('CHARITY_EMPLOYEE', {
      charityPermissions: ['view_reports'],
    })
    expect(hasPermission(session, 'manage_organisations')).toBe(false)
    expect(hasPermission(session, 'manage_training')).toBe(false)
  })

  it('returns false for CHARITY_EMPLOYEE with empty permissions', () => {
    const session = makeSession('CHARITY_EMPLOYEE', { charityPermissions: [] })
    expect(hasPermission(session, 'manage_organisations')).toBe(false)
  })

  it('returns false for ORG_ADMIN regardless of permission', () => {
    const session = makeSession('ORG_ADMIN')
    expect(hasPermission(session, 'manage_organisations')).toBe(false)
  })

  it('returns false for STUDENT regardless of permission', () => {
    const session = makeSession('STUDENT')
    expect(hasPermission(session, 'view_reports')).toBe(false)
  })

  it('returns false for null session', () => {
    expect(hasPermission(null, 'manage_organisations')).toBe(false)
  })

  it('returns false when user has no role', () => {
    const session = { user: {}, expires: '' } as Session
    expect(hasPermission(session, 'manage_organisations')).toBe(false)
  })
})

describe('getRoleLabel', () => {
  it('returns display label for known roles', () => {
    expect(getRoleLabel('SUPER_ADMIN')).toBe('Charity Admin')
    expect(getRoleLabel('CHARITY_EMPLOYEE')).toBe('Charity Employee')
    expect(getRoleLabel('ORG_ADMIN')).toBe('Org Admin')
    expect(getRoleLabel('CAREGIVER')).toBe('Practitioner')
    expect(getRoleLabel('CAREER_DEV_OFFICER')).toBe('Careers Professional')
    expect(getRoleLabel('STUDENT')).toBe('Student')
    expect(getRoleLabel('INTERN')).toBe('Intern')
    expect(getRoleLabel('EMPLOYEE')).toBe('Employee')
  })

  it('returns the raw string for unknown roles', () => {
    expect(getRoleLabel('UNKNOWN_ROLE')).toBe('UNKNOWN_ROLE')
  })
})

describe('CHARITY_PERMISSIONS constant', () => {
  it('contains all ten expected permissions', () => {
    expect(Object.keys(CHARITY_PERMISSIONS)).toHaveLength(10)
    expect(CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS).toBe('manage_organisations')
    expect(CHARITY_PERMISSIONS.MANAGE_COHORTS).toBe('manage_cohorts')
    expect(CHARITY_PERMISSIONS.MANAGE_TRAINING).toBe('manage_training')
    expect(CHARITY_PERMISSIONS.MANAGE_SURVEYS).toBe('manage_surveys')
    expect(CHARITY_PERMISSIONS.MANAGE_ANNOUNCEMENTS).toBe('manage_announcements')
    expect(CHARITY_PERMISSIONS.VIEW_REPORTS).toBe('view_reports')
    expect(CHARITY_PERMISSIONS.MANAGE_SESSIONS).toBe('manage_sessions')
    expect(CHARITY_PERMISSIONS.MANAGE_LIBRARY).toBe('manage_library')
    expect(CHARITY_PERMISSIONS.MANAGE_AI_PROMPTS).toBe('manage_ai_prompts')
    expect(CHARITY_PERMISSIONS.MANAGE_JOBS).toBe('manage_jobs')
  })
})

describe('ROLE_LABELS constant', () => {
  it('has labels for all nine roles', () => {
    expect(Object.keys(ROLE_LABELS)).toHaveLength(9)
    expect(ROLE_LABELS.PARTICIPANT).toBe('Workshop Participant')
  })
})
