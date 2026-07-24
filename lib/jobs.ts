import { prisma } from '@/lib/prisma'
import type { JobStatus, Prisma } from '@prisma/client'

export type JobVisibilityUser = {
  id: string
  role: string
  organisationId: string | null
  /** The user's org's parent, when it belongs to a hierarchy. */
  parentOrgId?: string | null
}

export type JobVisibilityRow = {
  id: string
  status: JobStatus
  /** null = charity-owned (platform-wide); set = owned by that organisation. */
  organisationId: string | null
  targetOrgIds: string[]
  targetRoles: string[]
  closingDate: Date
}

/**
 * Pure visibility rule — decides if a single job is visible to a learner.
 *
 * Jobs come in two tiers:
 *   - Charity tier (organisationId null): visible platform-wide, optionally
 *     narrowed to specific orgs via targetOrgIds.
 *   - Organisation tier (organisationId set): visible only to that org's own
 *     learners, plus the learners of its child orgs when it is a parent org.
 *
 * Status rules are the same for both:
 *   - DRAFT / ARCHIVED: never visible.
 *   - PUBLISHED: visible when the tier rule matches, OR the user is assigned.
 *   - CLOSED: visible only to assigned users, so their deep links keep working.
 *
 * targetRoles is deliberately not consulted. Since the role collapse there is a
 * single learner role, so it can no longer narrow anything; the column is kept
 * only so existing rows stay valid.
 */
export function isJobVisibleToUser(
  job: JobVisibilityRow,
  user: JobVisibilityUser,
  hasAssignment: boolean,
): boolean {
  if (job.status === 'DRAFT' || job.status === 'ARCHIVED') return false

  if (hasAssignment) {
    return job.status === 'PUBLISHED' || job.status === 'CLOSED'
  }

  if (job.status !== 'PUBLISHED') return false

  // Organisation tier — ownership decides, targetOrgIds is not consulted.
  if (job.organisationId !== null) {
    if (user.organisationId === null) return false
    return (
      job.organisationId === user.organisationId ||
      job.organisationId === (user.parentOrgId ?? null)
    )
  }

  // Charity tier — platform-wide unless narrowed to specific orgs.
  return (
    job.targetOrgIds.length === 0 ||
    (user.organisationId !== null && job.targetOrgIds.includes(user.organisationId))
  )
}

/**
 * Build the visibility user for a session, resolving the org's parent so
 * parent-org jobs reach child-org learners.
 *
 * Always use this rather than assembling the object inline: parentOrgId is
 * optional on the type, so hand-built objects silently omit it and child orgs
 * quietly stop seeing their parent's jobs — a bug with no type error and no
 * runtime error, just missing rows.
 */
export async function resolveJobVisibilityUser(sessionUser: {
  id: string
  role: string
  organisationId?: string | null
}): Promise<JobVisibilityUser> {
  const organisationId = sessionUser.organisationId ?? null
  if (!organisationId) {
    return { id: sessionUser.id, role: sessionUser.role, organisationId: null, parentOrgId: null }
  }

  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { parentOrgId: true },
  })

  return {
    id: sessionUser.id,
    role: sessionUser.role,
    organisationId,
    parentOrgId: org?.parentOrgId ?? null,
  }
}

/**
 * Flip any PUBLISHED jobs whose closingDate has passed to CLOSED.
 * Safe to call on every list fetch; no-ops when nothing to do.
 */
export async function autoCloseExpiredJobs(): Promise<number> {
  const result = await prisma.jobOpening.updateMany({
    where: { status: 'PUBLISHED', closingDate: { lt: new Date() } },
    data: { status: 'CLOSED' },
  })
  return result.count
}

/**
 * Returns the jobs visible to a given learner, with their own assignment joined.
 * Mirrors isJobVisibleToUser — keep the two in step.
 */
export async function listVisibleJobsForUser(user: JobVisibilityUser) {
  await autoCloseExpiredJobs()

  // Charity tier: platform-wide, or narrowed to the user's org.
  const charityTier: Prisma.JobOpeningWhereInput = {
    organisationId: null,
    ...(user.organisationId
      ? { OR: [{ targetOrgIds: { isEmpty: true } }, { targetOrgIds: { has: user.organisationId } }] }
      : { targetOrgIds: { isEmpty: true } }),
  }

  // Organisation tier: the user's own org, or its parent when it has one.
  const ownerIds = [user.organisationId, user.parentOrgId].filter(
    (id): id is string => typeof id === 'string'
  )
  const orgTier: Prisma.JobOpeningWhereInput | null = ownerIds.length
    ? { organisationId: { in: ownerIds } }
    : null

  const targeted = await prisma.jobOpening.findMany({
    where: {
      status: 'PUBLISHED',
      OR: orgTier ? [charityTier, orgTier] : [charityTier],
    },
    include: {
      assignments: { where: { userId: user.id } },
      attachments: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const assigned = await prisma.jobOpening.findMany({
    where: {
      status: { in: ['PUBLISHED', 'CLOSED'] },
      assignments: { some: { userId: user.id } },
    },
    include: {
      assignments: { where: { userId: user.id } },
      attachments: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const byId = new Map<string, (typeof targeted)[number]>()
  for (const j of targeted) byId.set(j.id, j)
  for (const j of assigned) byId.set(j.id, j)
  return Array.from(byId.values())
}

/** Fetch a single job for a learner, respecting visibility. Returns null if hidden. */
export async function getJobForUser(jobId: string, user: JobVisibilityUser) {
  await autoCloseExpiredJobs()
  const job = await prisma.jobOpening.findUnique({
    where: { id: jobId },
    include: {
      assignments: { where: { userId: user.id } },
      attachments: true,
    },
  })
  if (!job) return null
  const hasAssignment = job.assignments.length > 0
  if (!isJobVisibleToUser(job, user, hasAssignment)) return null
  return job
}

export type JobWithRelations = Awaited<ReturnType<typeof getJobForUser>>

/**
 * Aggregate stats for reports. With `orgId`, scopes to what that organisation
 * can see — its own jobs, plus charity-tier jobs that reach it — and to
 * assignments held by its own users. Without one, covers every job.
 */
export async function getJobStats(orgId?: string | null) {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000)
  const baseWhere: Prisma.JobOpeningWhereInput = orgId
    ? {
        OR: [
          { organisationId: orgId },
          {
            organisationId: null,
            OR: [{ targetOrgIds: { isEmpty: true } }, { targetOrgIds: { has: orgId } }],
          },
        ],
      }
    : {}

  const assignmentWhere: Prisma.JobAssignmentWhereInput = orgId
    ? { user: { organisationId: orgId } }
    : {}

  const [byStatus, publishedLast30, assignmentsTotal, assignmentsLast30] = await Promise.all([
    prisma.jobOpening.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: { _all: true },
    }),
    prisma.jobOpening.count({
      where: { ...baseWhere, status: 'PUBLISHED', createdAt: { gte: since } },
    }),
    prisma.jobAssignment.count({ where: assignmentWhere }),
    prisma.jobAssignment.count({
      where: { ...assignmentWhere, createdAt: { gte: since } },
    }),
  ])

  return {
    byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count._all])),
    publishedLast30,
    assignmentsTotal,
    assignmentsLast30,
  }
}
