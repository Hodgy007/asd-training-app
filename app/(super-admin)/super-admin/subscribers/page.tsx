'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CreditCard,
  Search,
  ExternalLink,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { clsx } from 'clsx'

type SubscriptionStatus =
  | 'NONE'
  | 'ACTIVE'
  | 'TRIALING'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'UNPAID'

interface Subscriber {
  id: string
  name: string | null
  email: string
  role: string
  active: boolean
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  subscriptionStatus: SubscriptionStatus
  subscriptionCurrentPeriodEnd: string | null
  subscriptionPriceId: string | null
  programs: string[]
  isAllAccessYearly: boolean
  createdAt: string
}

const STATUS_STYLES: Record<SubscriptionStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  TRIALING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  PAST_DUE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  CANCELED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  UNPAID: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  NONE: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  ACTIVE: 'Active',
  TRIALING: 'Trialing',
  PAST_DUE: 'Past due',
  CANCELED: 'Cancelled',
  UNPAID: 'Unpaid',
  NONE: 'No subscription',
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function planLabel(s: Subscriber): string {
  if (s.isAllAccessYearly) return 'All-Access (yearly)'
  if (s.programs.length > 0) return s.programs.join(', ')
  if (s.stripeSubscriptionId) return 'Custom subscription'
  return 'One-off purchase'
}

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchSubscribers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/super-admin/subscribers')
      if (!res.ok) throw new Error('Failed to load subscribers')
      const data = await res.json()
      setSubscribers(data.subscribers ?? [])
    } catch {
      setError('Could not load subscribers. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSubscribers()
  }, [fetchSubscribers])

  const q = search.trim().toLowerCase()
  const filtered = q
    ? subscribers.filter(
        (s) =>
          (s.name ?? '').toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q),
      )
    : subscribers

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            Subscribers
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Individual paying customers who bought on their own (no organisation).
            Org-level subscribers are listed under{' '}
            <Link
              href="/super-admin/organisations"
              className="text-primary-600 dark:text-primary-400 underline"
            >
              Organisations
            </Link>
            .
          </p>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/20 p-4 flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="card p-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary-600 dark:text-primary-400" />
        </div>
      ) : subscribers.length === 0 ? (
        <div className="card p-10 text-center">
          <CreditCard className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            No individual subscribers yet
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            When someone subscribes via <code>/courses</code> without joining an
            organisation, they&rsquo;ll appear here.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-calm-50 dark:bg-slate-800">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Search subscribers"
              />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {filtered.length} of {subscribers.length}
            </span>
          </div>
          <div className="overflow-auto max-h-[28rem]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Name</th>
                  <th className="text-left font-semibold px-4 py-3">Email</th>
                  <th className="text-left font-semibold px-4 py-3">Plan</th>
                  <th className="text-left font-semibold px-4 py-3">Status</th>
                  <th className="text-left font-semibold px-4 py-3">Renews / Ends</th>
                  <th className="text-left font-semibold px-4 py-3">Joined</th>
                  <th className="text-right font-semibold px-4 py-3">Stripe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100 font-medium">
                      {s.name ?? '—'}
                      {!s.active && (
                        <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                          (deactivated)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {s.email}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {planLabel(s)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'inline-flex px-2 py-0.5 rounded-full text-xs font-semibold',
                          STATUS_STYLES[s.subscriptionStatus],
                        )}
                      >
                        {STATUS_LABELS[s.subscriptionStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {formatDate(s.subscriptionCurrentPeriodEnd)}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {formatDate(s.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {s.stripeCustomerId ? (
                        <a
                          href={`https://dashboard.stripe.com/customers/${s.stripeCustomerId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                        >
                          Open
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
