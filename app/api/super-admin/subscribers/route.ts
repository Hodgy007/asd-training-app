import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

/**
 * Lists individual paying subscribers — i.e. users who bought on their own
 * (organisationId == null) and have a Stripe customer record.
 *
 * Org-level subscriptions live on the Organisation model and are surfaced via
 * /super-admin/organisations. This endpoint is the missing dedicated view for
 * standalone learners after the user-level subscription refactor.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const subscribers = await prisma.user.findMany({
    where: {
      organisationId: null,
      // Anyone who has a Stripe customer attached counts — covers active,
      // trialing, past-due, canceled, and one-off purchasers who haven't
      // subscribed yet but have transacted with us.
      stripeCustomerId: { not: null },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      subscriptionStatus: true,
      subscriptionCurrentPeriodEnd: true,
      subscriptionPriceId: true,
      allowedProgramIds: true,
      createdAt: true,
    },
    orderBy: [{ subscriptionCurrentPeriodEnd: 'desc' }, { createdAt: 'desc' }],
  })

  // Resolve allowedProgramIds → readable names so the table can show plan content
  // without callers having to do a second round-trip.
  const allProgramIds = Array.from(
    new Set(subscribers.flatMap((s) => s.allowedProgramIds))
  )
  const programs = allProgramIds.length
    ? await prisma.trainingProgram.findMany({
        where: { id: { in: allProgramIds } },
        select: { id: true, name: true },
      })
    : []
  const programNameById = new Map(programs.map((p) => [p.id, p.name]))

  const yearlyPriceId = process.env.STRIPE_SUBSCRIPTION_PRICE_YEARLY ?? null

  return NextResponse.json({
    subscribers: subscribers.map((s) => ({
      ...s,
      programs: s.allowedProgramIds
        .map((id) => programNameById.get(id))
        .filter((n): n is string => Boolean(n)),
      isAllAccessYearly: Boolean(
        yearlyPriceId && s.subscriptionPriceId === yearlyPriceId
      ),
    })),
  })
}
