import type { SubscriptionStatus } from '@prisma/client'
import { prisma } from './prisma'
import { getEffectiveOrgSettings } from './org-hierarchy'
import { subscriptionGrantsAccess } from './modules'
import type { ProgramInfo } from './modules'

export interface EffectiveSubscription {
  status: SubscriptionStatus
  currentPeriodEnd: Date | null
  hasAccess: boolean
  /** Where the subscription is billed — `org` for shared orgs, `user` for individuals. */
  scope: 'org' | 'user' | 'none'
  /** Resolved program access — bypassed when subscription grants full access. */
  programs: ProgramInfo[]
}

/**
 * Resolve subscription + program access for a user, falling back to user-level
 * fields when the user has no organisation (individual subscribers).
 */
export async function getEffectiveSubscription(userId: string): Promise<EffectiveSubscription> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      organisationId: true,
      stripeSubscriptionId: true,
      subscriptionStatus: true,
      subscriptionCurrentPeriodEnd: true,
      allowedProgramIds: true,
    },
  })

  if (!user) {
    return { status: 'NONE', currentPeriodEnd: null, hasAccess: false, scope: 'none', programs: [] }
  }

  if (user.organisationId) {
    const [settings, org] = await Promise.all([
      getEffectiveOrgSettings(user.organisationId),
      prisma.organisation.findUnique({
        where: { id: user.organisationId },
        select: { subscriptionStatus: true, subscriptionCurrentPeriodEnd: true },
      }),
    ])
    const status = org?.subscriptionStatus ?? 'NONE'
    const periodEnd = org?.subscriptionCurrentPeriodEnd ?? null
    const hasAccess = subscriptionGrantsAccess(status, periodEnd)

    const programs = hasAccess
      ? await prisma.trainingProgram.findMany({
          where: { active: true, status: 'APPROVED' },
          select: { id: true, name: true },
          orderBy: { order: 'asc' },
        })
      : settings.allowedProgramIds.length === 0
        ? []
        : await prisma.trainingProgram.findMany({
            where: { id: { in: settings.allowedProgramIds }, active: true },
            select: { id: true, name: true },
            orderBy: { order: 'asc' },
          })

    return { status, currentPeriodEnd: periodEnd, hasAccess, scope: 'org', programs }
  }

  // Individual subscriber — no org attached
  const status = user.subscriptionStatus ?? 'NONE'
  const periodEnd = user.subscriptionCurrentPeriodEnd ?? null
  const hasAccess = subscriptionGrantsAccess(status, periodEnd)

  const programs = hasAccess
    ? await prisma.trainingProgram.findMany({
        where: { active: true, status: 'APPROVED' },
        select: { id: true, name: true },
        orderBy: { order: 'asc' },
      })
    : user.allowedProgramIds.length === 0
      ? []
      : await prisma.trainingProgram.findMany({
          where: { id: { in: user.allowedProgramIds }, active: true },
          select: { id: true, name: true },
          orderBy: { order: 'asc' },
        })

  return { status, currentPeriodEnd: periodEnd, hasAccess, scope: 'user', programs }
}
