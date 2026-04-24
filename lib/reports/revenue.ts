import { prisma } from '@/lib/prisma'

export interface RevenueSummary {
  totals: {
    paidPurchases: number
    paidAmountPence: number
    currency: string
    activeSubscriptions: number
    mrrPence: number
  }
  recentPurchases: Array<{
    id: string
    createdAt: string
    amount: number
    currency: string
    programName: string
    organisationName: string
  }>
}

export async function getRevenueSummary(): Promise<RevenueSummary> {
  const [purchases, activeOrgs, recent] = await Promise.all([
    prisma.purchase.findMany({
      where: { status: 'PAID' },
      select: { amount: true, currency: true },
    }),
    prisma.organisation.findMany({
      where: { subscriptionStatus: { in: ['ACTIVE', 'TRIALING'] } },
      select: { subscriptionPriceId: true },
    }),
    prisma.purchase.findMany({
      where: { status: 'PAID' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        amount: true,
        currency: true,
        program: { select: { name: true } },
        organisation: { select: { name: true } },
      },
    }),
  ])

  const paidAmountPence = purchases.reduce((sum, p) => sum + p.amount, 0)
  const currency = purchases[0]?.currency ?? 'gbp'

  return {
    totals: {
      paidPurchases: purchases.length,
      paidAmountPence,
      currency,
      activeSubscriptions: activeOrgs.length,
      mrrPence: 0,
    },
    recentPurchases: recent.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      amount: r.amount,
      currency: r.currency,
      programName: r.program?.name ?? '—',
      organisationName: r.organisation?.name ?? '—',
    })),
  }
}
