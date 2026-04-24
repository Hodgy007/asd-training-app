import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { getRevenueSummary } from '@/lib/reports/revenue'
import { isPaymentsEnabled } from '@/lib/stripe'

export const runtime = 'nodejs'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.VIEW_REPORTS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!isPaymentsEnabled) {
    return NextResponse.json({
      enabled: false,
      totals: {
        paidPurchases: 0,
        paidAmountPence: 0,
        currency: 'gbp',
        activeSubscriptions: 0,
        mrrPence: 0,
      },
      recentPurchases: [],
    })
  }

  const summary = await getRevenueSummary()
  return NextResponse.json({ enabled: true, ...summary })
}
