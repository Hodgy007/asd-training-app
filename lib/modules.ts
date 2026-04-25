import type { SubscriptionStatus } from '@prisma/client'
import prisma from './prisma'
import { getEffectiveOrgSettings } from './org-hierarchy'

export interface ProgramInfo {
  id: string
  name: string
}

export interface OrgSubscriptionState {
  hasAccess: boolean
  status: SubscriptionStatus
  renewsAt: Date | null
}

const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000

export function subscriptionGrantsAccess(
  status: SubscriptionStatus | null | undefined,
  periodEnd: Date | null | undefined,
  now: Date = new Date()
): boolean {
  if (!status) return false
  if (status === 'ACTIVE' || status === 'TRIALING') return true
  if (status === 'PAST_DUE' && periodEnd) {
    return now.getTime() < periodEnd.getTime() + GRACE_PERIOD_MS
  }
  return false
}

export async function getOrgPrograms(orgId: string): Promise<ProgramInfo[]> {
  const [settings, org] = await Promise.all([
    getEffectiveOrgSettings(orgId),
    prisma.organisation.findUnique({
      where: { id: orgId },
      select: { subscriptionStatus: true, subscriptionCurrentPeriodEnd: true },
    }),
  ])

  if (subscriptionGrantsAccess(org?.subscriptionStatus, org?.subscriptionCurrentPeriodEnd)) {
    return prisma.trainingProgram.findMany({
      where: { active: true, status: 'APPROVED' },
      select: { id: true, name: true },
      orderBy: { order: 'asc' },
    })
  }

  if (settings.allowedProgramIds.length === 0) return []
  return prisma.trainingProgram.findMany({
    where: { id: { in: settings.allowedProgramIds }, active: true },
    select: { id: true, name: true },
    orderBy: { order: 'asc' },
  })
}

export async function getUserPrograms(userId: string): Promise<ProgramInfo[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      organisationId: true,
      subscriptionStatus: true,
      subscriptionCurrentPeriodEnd: true,
      allowedProgramIds: true,
    },
  })
  if (!user) return []
  if (user.organisationId) return getOrgPrograms(user.organisationId)

  // Individual subscriber — fall back to user-level fields
  if (subscriptionGrantsAccess(user.subscriptionStatus, user.subscriptionCurrentPeriodEnd)) {
    return prisma.trainingProgram.findMany({
      where: { active: true, status: 'APPROVED' },
      select: { id: true, name: true },
      orderBy: { order: 'asc' },
    })
  }
  if (user.allowedProgramIds.length === 0) return []
  return prisma.trainingProgram.findMany({
    where: { id: { in: user.allowedProgramIds }, active: true },
    select: { id: true, name: true },
    orderBy: { order: 'asc' },
  })
}

export async function getOrgSubscriptionState(orgId: string): Promise<OrgSubscriptionState> {
  const org = await prisma.organisation.findUnique({
    where: { id: orgId },
    select: { subscriptionStatus: true, subscriptionCurrentPeriodEnd: true },
  })
  return {
    hasAccess: subscriptionGrantsAccess(org?.subscriptionStatus, org?.subscriptionCurrentPeriodEnd),
    status: org?.subscriptionStatus ?? 'NONE',
    renewsAt: org?.subscriptionCurrentPeriodEnd ?? null,
  }
}

export function hasAccess(programIds: string[], programId: string): boolean {
  return programIds.includes(programId)
}
