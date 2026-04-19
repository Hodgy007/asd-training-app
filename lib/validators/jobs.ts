import { z } from 'zod'

export const JOB_STATUSES = ['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'] as const
export const JOB_LOCATION_TYPES = ['ONSITE', 'HYBRID', 'REMOTE'] as const
export const JOB_EMPLOYMENT_TYPES = [
  'INTERNSHIP',
  'APPRENTICESHIP',
  'PART_TIME',
  'FULL_TIME',
  'VOLUNTEER',
] as const
export const JOB_TARGETABLE_ROLES = [
  'CAREER_DEV_OFFICER',
  'STUDENT',
  'INTERN',
  'EMPLOYEE',
] as const

export const createJobSchema = z
  .object({
    title: z.string().min(1).max(200),
    employer: z.string().min(1).max(200),
    employerLogoUrl: z.string().url().nullable().optional(),
    location: z.string().min(1).max(200),
    locationType: z.enum(JOB_LOCATION_TYPES),
    employmentType: z.enum(JOB_EMPLOYMENT_TYPES),

    summary: z.string().min(1).max(240),
    description: z.string().min(1),
    skills: z.array(z.string().min(1).max(60)).max(20).default([]),
    autismFriendlyNotes: z.string().nullable().optional(),

    salary: z.string().max(200).nullable().optional(),
    hoursPerWeek: z.string().max(200).nullable().optional(),
    startDate: z.string().max(100).nullable().optional(),
    duration: z.string().max(100).nullable().optional(),

    applyUrl: z.string().url().nullable().optional(),
    applyEmail: z.string().email().nullable().optional(),
    contactName: z.string().max(200).nullable().optional(),
    contactEmail: z.string().email().nullable().optional(),

    closingDate: z.coerce.date(),
    status: z.enum(JOB_STATUSES).default('DRAFT'),

    targetOrgIds: z.array(z.string().cuid()).default([]),
    targetRoles: z.array(z.enum(JOB_TARGETABLE_ROLES)).default([]),
  })
  .refine(
    (v) => Boolean(v.applyUrl) !== Boolean(v.applyEmail),
    { message: 'Exactly one of applyUrl or applyEmail must be set.', path: ['applyUrl'] },
  )

export const updateJobSchema = createJobSchema._def.schema.partial()

export const assignJobSchema = z.object({
  userId: z.string().cuid(),
  note: z.string().max(1000).nullable().optional(),
})

export type CreateJobInput = z.infer<typeof createJobSchema>
export type UpdateJobInput = z.infer<typeof updateJobSchema>
export type AssignJobInput = z.infer<typeof assignJobSchema>
