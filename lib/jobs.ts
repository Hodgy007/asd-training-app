import { prisma } from '@/lib/prisma'
import type { JobStatus, Prisma } from '@prisma/client'

export type JobVisibilityUser = {
  id: string
  role: string
  organisationId: string | null
}

export type JobVisibilityRow = {
  id: string
  status: JobStatus
  targetOrgIds: string[]
  targetRoles: string[]
  closingDate: Date
}

/**
 * Pure visibility rule — decides if a single job is visible to a user.
 *
 *  - DRAFT / ARCHIVED: never visible to learners.
 *  - PUBLISHED: visible when targeting matches, OR the user has an assignment.
 *  - CLOSED: visible only if the user has an assignment (to keep deep links working).
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

  const orgMatches =
    job.targetOrgIds.length === 0 ||
    (user.organisationId !== null && job.targetOrgIds.includes(user.organisationId))
  const roleMatches = job.targetRoles.length === 0 || job.targetRoles.includes(user.role)

  return orgMatches && roleMatches
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

/** Returns the jobs visible to a given learner, with their own assignment joined. */
export async function listVisibleJobsForUser(user: JobVisibilityUser) {
  await autoCloseExpiredJobs()

  const orgClause: Prisma.JobOpeningWhereInput = user.organisationId
    ? {
        OR: [{ targetOrgIds: { isEmpty: true } }, { targetOrgIds: { has: user.organisationId } }],
      }
    : { targetOrgIds: { isEmpty: true } }

  const roleClause: Prisma.JobOpeningWhereInput = {
    OR: [{ targetRoles: { isEmpty: true } }, { targetRoles: { has: user.role } }],
  }

  const targeted = await prisma.jobOpening.findMany({
    where: { status: 'PUBLISHED', AND: [orgClause, roleClause] },
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
 * Aggregate stats for reports. If `orgId` is provided, scopes jobs to those
 * that target the org (or have no targeting) and assignments to users in that org.
 */
export async function getJobStats(orgId?: string | null) {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000)
  const baseWhere: Prisma.JobOpeningWhereInput = orgId
    ? { OR: [{ targetOrgIds: { isEmpty: true } }, { targetOrgIds: { has: orgId } }] }
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
