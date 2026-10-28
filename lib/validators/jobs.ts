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
// Vestigial with a single leaf role — targeting is by organisation via
// targetOrgIds. Kept so existing rows and the schema stay valid.
export const JOB_TARGETABLE_ROLES = ['LEARNER'] as const

// Field rules shared by create and update. Deliberately no `.default()`s here:
// in zod 4 a default inside `.partial()` is still applied when the key is
// missing, so an update schema built from defaulted fields would reset
// `status` to DRAFT and clear skills/targeting on every partial edit.
const jobFields = {
  title: z.string().min(1).max(200),
  employer: z.string().min(1).max(200),
  employerLogoUrl: z.string().url().nullable().optional(),
  location: z.string().min(1).max(200),
  locationType: z.enum(JOB_LOCATION_TYPES),
  employmentType: z.enum(JOB_EMPLOYMENT_TYPES),

  summary: z.string().min(1).max(240),
  description: z.string().min(1),
  skills: z.array(z.string().min(1).max(60)).max(20),
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
  status: z.enum(JOB_STATUSES),

  targetOrgIds: z.array(z.string().cuid()),
  targetRoles: z.array(z.enum(JOB_TARGETABLE_ROLES)),
}

export const createJobSchema = z
  .object({
    ...jobFields,
    skills: jobFields.skills.default([]),
    status: jobFields.status.default('DRAFT'),
    targetOrgIds: jobFields.targetOrgIds.default([]),
    targetRoles: jobFields.targetRoles.default([]),
  })
  .refine(
    (v) => Boolean(v.applyUrl) !== Boolean(v.applyEmail),
    { message: 'Exactly one of applyUrl or applyEmail must be set.', path: ['applyUrl'] },
  )

// Partial edits: only the keys sent are validated and returned.
export const updateJobSchema = z.object(jobFields).partial()

export const assignJobSchema = z.object({
  userId: z.string().cuid(),
  note: z.string().max(1000).nullable().optional(),
})

export type CreateJobInput = z.infer<typeof createJobSchema>
export type UpdateJobInput = z.infer<typeof updateJobSchema>
export type AssignJobInput = z.infer<typeof assignJobSchema>
