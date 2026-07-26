/**
 * Four roles. Everyone who takes training is a LEARNER — what they can see comes
 * from their organisation's assigned programmes, not from their role.
 *
 * Internal (charity staff) vs external (schools, companies) is a property of the
 * organisation, not the role: the charity has its own Organisation row with
 * organisationType CHARITY, and its staff are ordinary members of it.
 *
 * Replaced CAREGIVER, CAREER_DEV_OFFICER, STUDENT, INTERN, EMPLOYEE, PARTICIPANT
 * and FAMILY_CARER, all of which collapsed into LEARNER.
 */
export type Role = 'SUPER_ADMIN' | 'CHARITY_EMPLOYEE' | 'ORG_ADMIN' | 'LEARNER'

export const LEAF_ROLES: Role[] = ['LEARNER']

export interface Organisation {
  id: string
  name: string
  slug: string
  active: boolean
  allowedProgramIds: string[]
  allowedRoles: string[]
  logoUrl?: string | null
  parentOrgId?: string | null
  isParentOrg: boolean
  inheritSettings: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Announcement {
  id: string
  title: string
  body: string
  active: boolean
  organisationId?: string | null
  createdById: string
  expiresAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface User {
  id: string
  email: string
  name?: string | null
  role: Role
  active: boolean
  organisationId?: string | null
  mustChangePassword: boolean
  totpEnabled?: boolean
  mfaPending?: boolean
  charityPermissions?: string[]
  createdAt: Date
  updatedAt: Date
}

export interface TrainingProgress {
  id: string
  userId: string
  moduleId: string
  lessonId?: string | null
  completed: boolean
  score?: number | null
  completedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: string
  explanation: string
}

export interface Lesson {
  id: string
  moduleId: string
  title: string
  type: 'VIDEO' | 'TEXT'
  content: string
  order: number
  quizQuestions: QuizQuestion[]
}

export interface TrainingModule {
  id: string
  title: string
  description: string
  order: number
  lessons: Lesson[]
}

export interface ApiResponse<T> {
  data?: T
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface RegisterForm {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export interface LoginForm {
  email: string
  password: string
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      role: string
      organisationId?: string | null
      mustChangePassword: boolean
      totpEnabled: boolean
      mfaPending: boolean
      hasPassword: boolean
      effectivePrograms: { id: string; name: string }[]
      charityPermissions: string[]
      isParentOrg: boolean
      subscriptionStatus: string
      isPersonalOrg: boolean
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    organisationId?: string | null
    mustChangePassword: boolean
    totpEnabled: boolean
    mfaPending: boolean
    hasPassword: boolean
    effectivePrograms: { id: string; name: string }[]
    charityPermissions: string[]
    isParentOrg: boolean
    subscriptionStatus: string
    isPersonalOrg: boolean
    /**
     * Unix-ms timestamp of the last DB re-validation of role/active/flags/etc.
     * The JWT callback re-fetches once this is older than VALIDATION_INTERVAL_MS
     * so a deactivation, role demotion or feature-flag change takes effect within
     * ~60s instead of waiting up to 8h for the session to expire.
     */
    lastValidatedAt: number
  }
}
