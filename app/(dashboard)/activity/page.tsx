'use client'

import { useCallback, useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { Shield, RefreshCw, Search } from 'lucide-react'

type AuditAction =
  | 'OBSERVATION_READ'
  | 'OBSERVATION_CREATE'
  | 'OBSERVATION_UPDATE'
  | 'OBSERVATION_DELETE'
  | 'AI_INSIGHT_GENERATE'
  | 'AI_INSIGHT_READ'
  | 'EXPORT'

interface ActivityRow {
  id: string
  createdAt: string
  action: AuditAction
  ipAddress: string | null
  metadata: unknown
  child: { id: string; name: string } | null
}

interface ActivityResponse {
  rows: ActivityRow[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

const ACTION_LABEL: Record<AuditAction, string> = {
  OBSERVATION_READ: 'Viewed observations',
  OBSERVATION_CREATE: 'Logged an observation',
  OBSERVATION_UPDATE: 'Updated an observation',
  OBSERVATION_DELETE: 'Deleted an observation',
  AI_INSIGHT_GENERATE: 'Generated an AI insight',
  AI_INSIGHT_READ: 'Viewed an AI insight',
  EXPORT: 'Downloaded child record',
}

const ACTION_BADGE: Record<AuditAction, string> = {
  OBSERVATION_READ: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  OBSERVATION_CREATE: 'bg-sage-100 text-sage-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  OBSERVATION_UPDATE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  OBSERVATION_DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  AI_INSIGHT_GENERATE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  AI_INSIGHT_READ: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  EXPORT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
}

export default function ActivityPage() {
  const [data, setData] = useState<ActivityResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/activity?page=${page}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-page-enter">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary-600" />
            My Activity
          </h1>
          <p className="text-slate-500 mt-1 max-w-2xl">
            Every action you&rsquo;ve taken on a child&rsquo;s record — logging observations,
            generating AI insights, downloading records. Held for transparency under UK GDPR.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="p-2 rounded-xl border border-calm-200 dark:border-slate-700 hover:bg-calm-50 dark:hover:bg-slate-800 transition-colors text-slate-500 flex-shrink-0"
          title="Refresh"
        >
          <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-calm-200 dark:border-slate-700">
          <p className="text-sm text-slate-500">
            {data ? `${data.total.toLocaleString()} event${data.total === 1 ? '' : 's'}` : '—'}
          </p>
          {data && data.pageCount > 1 && (
            <div className="flex items-center gap-2 text-sm">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border border-calm-200 dark:border-slate-700 disabled:opacity-30"
              >
                Prev
              </button>
              <span className="text-slate-500">
                Page {data.page} of {data.pageCount}
              </span>
              <button
                disabled={page >= data.pageCount}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded-lg border border-calm-200 dark:border-slate-700 disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-calm-200 dark:border-slate-700 bg-calm-50 dark:bg-slate-800">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">When</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Action</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Child</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 hidden md:table-cell">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading…
                  </td>
                </tr>
              ) : !data || data.rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No activity yet. Your actions will appear here once you log observations.
                  </td>
                </tr>
              ) : (
                data.rows.map((r) => (
                  <tr key={r.id} className="border-b border-calm-100 dark:border-slate-800 hover:bg-calm-50 dark:hover:bg-slate-800 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString('en-GB')}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full',
                          ACTION_BADGE[r.action],
                        )}
                      >
                        {ACTION_LABEL[r.action]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {r.child?.name ?? <span className="text-slate-300">—</span>}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono hidden md:table-cell">
                      {r.ipAddress ?? '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
