export type Role =
  | 'SUPER_ADMIN'
  | 'CHARITY_EMPLOYEE'
  | 'ORG_ADMIN'
  | 'CAREGIVER'
  | 'CAREER_DEV_OFFICER'
  | 'STUDENT'
  | 'INTERN'
  | 'EMPLOYEE'

export const LEAF_ROLES: Role[] = [
  'CAREGIVER',
  'CAREER_DEV_OFFICER',
  'STUDENT',
  'INTERN',
  'EMPLOYEE',
]

export type Domain = 'SOCIAL_COMMUNICATION' | 'BEHAVIOUR_AND_PLAY' | 'SENSORY_RESPONSES'
export type Frequency = 'RARE' | 'SOMETIMES' | 'OFTEN'
export type Context = 'HOME' | 'NURSERY' | 'OUTDOORS' | 'OTHER'

export interface Organisation {
  id: string
  name: string
  slug: string
  active: boolean
  allowedProgramIds: string[]
  allowedRoles: string[]
  logoUrl?: string | null
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

export interface Child {
  id: string
  name: string
  dateOfBirth: Date
  notes?: string | null
  createdAt: Date
  updatedAt: Date
  userId: string
  observations?: Observation[]
  aiInsights?: AiInsight[]
  _count?: {
    observations: number
  }
}

export interface Observation {
  id: string
  childId: string
  date: Date
  behaviourType: string
  domain: Domain
  frequency: Frequency
  context: Context
  notes?: string | null
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

export interface AiInsight {
  id: string
  childId: string
  generatedAt: string
  summary: string
  patterns: string
  recommendations: string
  disclaimer: string
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

export interface WeeklyChartData {
  week: string
  social: number
  behaviour: number
  sensory: number
}

export interface DomainSummary {
  domain: Domain
  label: string
  count: number
  weight: number
  hasThreshold: boolean
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

export interface CreateChildForm {
  name: string
  dateOfBirth: string
  notes?: string
}

export interface CreateObservationForm {
  date: string
  domain: Domain
  behaviourType: string
  frequency: Frequency
  context: Context
  notes?: string
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
      cvBuilderEnabled: boolean
      careersAdvisorEnabled: boolean
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
    cvBuilderEnabled: boolean
    careersAdvisorEnabled: boolean
  }
}

// Careers Advisor types
export interface AdvisorAnswers {
  interests?: string[]
  strengths?: string[]
  environment?: string[]
  concerns?: string[]
  concernsOther?: string
  experience?: string
  stage?: string
  communication?: string[]
  sensory?: string[]
  values?: string[]
  other?: string
}

export interface AdvisorCareerSuggestion {
  name: string
  explanation: string
}

export interface AdvisorReport {
  strengths: string
  careers: AdvisorCareerSuggestion[]
  nextSteps: string[]
  workplaceSupport: string
}

// CV Builder types
export interface CVData {
  id: string
  userId: string
  title: string
  template: 'CLASSIC' | 'MODERN' | 'ACCESSIBLE'
  status: 'DRAFT' | 'COMPLETE'
  currentStep: number
  fullName: string | null
  email: string | null
  phone: string | null
  city: string | null
  postcode: string | null
  linkedIn: string | null
  personalStatement: string | null
  interests: string | null
  refsAvailableOnRequest: boolean
  createdAt: string
  updatedAt: string
  workExperiences: CVWorkExperienceData[]
  educationEntries: CVEducationData[]
  skills: CVSkillData[]
  references: CVReferenceData[]
}

export interface CVWorkExperienceData {
  id: string
  cvId: string
  jobTitle: string
  employer: string
  startDate: string
  endDate: string | null
  isCurrent: boolean
  description: string | null
  order: number
}

export interface CVEducationData {
  id: string
  cvId: string
  institution: string
  qualification: string
  grade: string | null
  startDate: string
  endDate: string | null
  description: string | null
  order: number
}

export interface CVSkillData {
  id: string
  cvId: string
  name: string
  category: string | null
  order: number
}

export interface CVReferenceData {
  id: string
  cvId: string
  name: string
  jobTitle: string | null
  organisation: string | null
  email: string | null
  phone: string | null
  relationship: string | null
  order: number
}
