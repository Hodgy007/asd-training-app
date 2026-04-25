'use client'

import { useState, useEffect } from 'react'
import { PoundSterling, RefreshCw } from 'lucide-react'
import { BackToReports } from '../_components/back-link'

interface RevenueRow {
  id: string
  createdAt: string
  amount: number
  currency: string
  programName: string
  organisationName: string
}

interface RevenueResponse {
  enabled: boolean
  totals: {
    paidPurchases: number
    paidAmountPence: number
    currency: string
    activeSubscriptions: number
    mrrPence: number
  }
  recentPurchases: RevenueRow[]
}

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

export default function RevenueReportPage() {
  const [summary, setSummary] = useState<RevenueResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/super-admin/reports/revenue')
        if (!res.ok) throw new Error('Failed to load revenue')
        const json = (await res.json()) as RevenueResponse
        if (!cancelled) setSummary(json)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="max-w-full space-y-6 animate-page-enter">
      <BackToReports />
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <PoundSterling className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          Revenue
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Purchases, subscriptions and recurring revenue.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
          Loading revenue...
        </div>
      ) : error ? (
        <div className="card text-center py-10 text-red-500">{error}</div>
      ) : !summary || !summary.enabled ? (
        <div className="card text-center py-10 text-slate-400 dark:text-slate-500">
          <PoundSterling className="h-8 w-8 mx-auto mb-2 opacity-30" />
          Payments are not currently enabled. Set <code className="text-xs">ENABLE_PAYMENTS=true</code> to enable revenue reporting.
        </div>
      ) : (
        <div className="card p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-calm-200 dark:border-slate-700 p-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">Paid purchases</div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {summary.totals.paidPurchases}
              </div>
            </div>
            <div className="rounded-xl border border-calm-200 dark:border-slate-700 p-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">Total collected</div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {formatMoney(summary.totals.paidAmountPence, summary.totals.currency)}
              </div>
            </div>
            <div className="rounded-xl border border-calm-200 dark:border-slate-700 p-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">Active subscriptions</div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {summary.totals.activeSubscriptions}
              </div>
            </div>
            <div className="rounded-xl border border-calm-200 dark:border-slate-700 p-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">MRR (est.)</div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {formatMoney(summary.totals.mrrPence, summary.totals.currency)}
              </div>
            </div>
          </div>
          {summary.recentPurchases.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                Recent purchases
              </h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-calm-200 dark:border-slate-700 text-xs text-slate-500">
                    <th className="py-2">Date</th>
                    <th>Organisation</th>
                    <th>Programme</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recentPurchases.map((p) => (
                    <tr key={p.id} className="border-b border-calm-100 dark:border-slate-800 last:border-0">
                      <td className="py-2 text-slate-600 dark:text-slate-400">
                        {new Date(p.createdAt).toLocaleDateString('en-GB')}
                      </td>
                      <td className="text-slate-700 dark:text-slate-300">{p.organisationName}</td>
                      <td className="text-slate-700 dark:text-slate-300">{p.programName}</td>
                      <td className="text-right font-semibold text-slate-900 dark:text-slate-100">
                        {formatMoney(p.amount, p.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
