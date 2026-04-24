import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CreditCard } from 'lucide-react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isPaymentsEnabled } from '@/lib/stripe'
import { ManageBillingButton } from '@/components/billing/manage-billing-button'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function formatMoney(pence: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(pence / 100)
  } catch {
    return `${(pence / 100).toFixed(2)} ${currency.toUpperCase()}`
  }
}

function formatStatus(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'Active'
    case 'TRIALING':
      return 'Trialling'
    case 'PAST_DUE':
      return 'Past due'
    case 'CANCELED':
      return 'Cancelled'
    case 'UNPAID':
      return 'Unpaid'
    default:
      return 'No subscription'
  }
}

export default async function OrgBillingPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organisationId || session.user.role !== 'ORG_ADMIN') {
    redirect('/admin')
  }

  const org = await prisma.organisation.findUnique({
    where: { id: session.user.organisationId },
    select: {
      subscriptionStatus: true,
      subscriptionCurrentPeriodEnd: true,
      stripeCustomerId: true,
    },
  })

  const purchases = await prisma.purchase.findMany({
    where: { organisationId: session.user.organisationId, status: 'PAID' },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      createdAt: true,
      amount: true,
      currency: true,
      program: { select: { name: true } },
    },
  })

  const hasCustomer = Boolean(org?.stripeCustomerId)
  const subscriptionStatus = org?.subscriptionStatus ?? 'NONE'

  return (
    <div className="max-w-4xl space-y-6 animate-page-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary-600" />
          Billing
        </h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          Manage your organisation&rsquo;s subscription and view past purchases.
        </p>
      </div>

      {!isPaymentsEnabled ? (
        <div className="card p-4">
          <p className="text-slate-600 dark:text-slate-400">
            Payments are not enabled on this platform yet.
          </p>
        </div>
      ) : (
        <>
          <section className="card p-4">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
              Subscription
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Status</dt>
                <dd className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatStatus(subscriptionStatus)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Next renewal</dt>
                <dd className="font-semibold text-slate-900 dark:text-slate-100">
                  {org?.subscriptionCurrentPeriodEnd
                    ? new Date(org.subscriptionCurrentPeriodEnd).toLocaleDateString('en-GB')
                    : '—'}
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex items-center gap-3">
              <ManageBillingButton disabled={!hasCustomer} />
              <Link
                href="/courses"
                className="text-sm font-semibold text-primary-600 hover:text-primary-700"
              >
                Buy more programmes →
              </Link>
            </div>
            {!hasCustomer && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                You&rsquo;ll be able to manage billing after your first purchase or subscription.
              </p>
            )}
          </section>

          <section className="card p-4">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
              Past purchases
            </h2>
            {purchases.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No purchases yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-calm-200 dark:border-slate-700 text-xs text-slate-500">
                    <th className="py-2">Date</th>
                    <th>Programme</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-calm-100 dark:border-slate-800 last:border-0"
                    >
                      <td className="py-2 text-slate-600 dark:text-slate-400">
                        {new Date(p.createdAt).toLocaleDateString('en-GB')}
                      </td>
                      <td className="text-slate-700 dark:text-slate-300">
                        {p.program?.name ?? '—'}
                      </td>
                      <td className="text-right font-semibold text-slate-900 dark:text-slate-100">
                        {formatMoney(p.amount, p.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  )
}
