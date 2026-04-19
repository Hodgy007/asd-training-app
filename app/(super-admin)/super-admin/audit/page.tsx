'use client'

import { useCallback, useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { Shield, RefreshCw, Search, X } from 'lucide-react'

type AuditAction =
  | 'OBSERVATION_READ'
  | 'OBSERVATION_CREATE'
  | 'OBSERVATION_UPDATE'
  | 'OBSERVATION_DELETE'
  | 'AI_INSIGHT_GENERATE'
  | 'AI_INSIGHT_READ'
  | 'EXPORT'

interface AuditRow {
  id: string
  createdAt: string
  action: AuditAction
  ipAddress: string | null
  metadata: unknown
  actor: { id: string; name: string | null; email: string | null }
  child: {
    id: string
    name: string
    caregiverName: string | null
    caregiverEmail: string | null
    orgId: string | null
    orgName: string | null
  }
}

interface AuditResponse {
  rows: AuditRow[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

const ACTIONS: { value: AuditAction | ''; label: string }[] = [
  { value: '', label: 'All actions' },
  { value: 'OBSERVATION_READ', label: 'Observation read' },
  { value: 'OBSERVATION_CREATE', label: 'Observation created' },
  { value: 'OBSERVATION_UPDATE', label: 'Observation updated' },
  { value: 'OBSERVATION_DELETE', label: 'Observation deleted' },
  { value: 'AI_INSIGHT_GENERATE', label: 'AI insight generated' },
  { value: 'AI_INSIGHT_READ', label: 'AI insight read' },
  { value: 'EXPORT', label: 'Data export' },
]

const ACTION_BADGE: Record<AuditAction, string> = {
  OBSERVATION_READ: 'bg-slate-100 text-slate-700',
  OBSERVATION_CREATE: 'bg-sage-100 text-sage-700',
  OBSERVATION_UPDATE: 'bg-amber-100 text-amber-700',
  OBSERVATION_DELETE: 'bg-red-100 text-red-700',
  AI_INSIGHT_GENERATE: 'bg-purple-100 text-purple-700',
  AI_INSIGHT_READ: 'bg-indigo-100 text-indigo-700',
  EXPORT: 'bg-blue-100 text-blue-700',
}

export default function AuditLogPage() {
  const [data, setData] = useState<AuditResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [actorEmail, setActorEmail] = useState('')
  const [childId, setChildId] = useState('')
  const [action, setAction] = useState<AuditAction | ''>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (actorEmail) params.set('actorEmail', actorEmail)
      if (childId) params.set('childId', childId)
      if (action) params.set('action', action)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      params.set('page', String(page))
      const res = await fetch(`/api/super-admin/audit?${params}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [actorEmail, childId, action, startDate, endDate, page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function resetFilters() {
    setActorEmail('')
    setChildId('')
    setAction('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const hasFilters = actorEmail || childId || action || startDate || endDate

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-page-enter">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary-600" />
            Child Observation Audit Log
          </h1>
          <p className="text-slate-500 mt-1 max-w-2xl">
            Tamper-evident record of every read, create, update, delete, AI-generation and export
            action against a child&rsquo;s observations. Used to answer subject-access requests and
            to demonstrate accountability under UK GDPR Art 5(2).
          </p>
        </div>
        <button
          onClick={fetchData}
          className="p-2 rounded-xl border border-calm-200 hover:bg-calm-50 transition-colors text-slate-500 flex-shrink-0"
          title="Refresh"
        >
          <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Filters */}
      <div className="card space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="label">Actor email contains</label>
            <input
              className="input w-full"
              type="text"
              value={actorEmail}
              onChange={(e) => {
                setActorEmail(e.target.value)
                setPage(1)
              }}
              placeholder="jane@…"
            />
          </div>
          <div>
            <label className="label">Child id</label>
            <input
              className="input w-full"
              type="text"
              value={childId}
              onChange={(e) => {
                setChildId(e.target.value)
                setPage(1)
              }}
              placeholder="cuid…"
            />
          </div>
          <div>
            <label className="label">Action</label>
            <select
              className="input w-full"
              value={action}
              onChange={(e) => {
                setAction(e.target.value as AuditAction | '')
                setPage(1)
              }}
            >
              {ACTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">From</label>
            <input
              className="input w-full"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <div>
            <label className="label">To</label>
            <input
              className="input w-full"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setPage(1)
              }}
            />
          </div>
        </div>
        {hasFilters && (
          <div className="flex justify-end">
            <button
              onClick={resetFilters}
              className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="card overflow-hidden p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-calm-200">
          <p className="text-sm text-slate-500">
            {data
              ? `${data.total.toLocaleString()} event${data.total === 1 ? '' : 's'}${
                  hasFilters ? ' matching filters' : ''
                }`
              : '—'}
          </p>
          {data && data.pageCount > 1 && (
            <div className="flex items-center gap-2 text-sm">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border border-calm-200 disabled:opacity-30"
              >
                Prev
              </button>
              <span className="text-slate-500">
                Page {data.page} of {data.pageCount}
              </span>
              <button
                disabled={page >= data.pageCount}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded-lg border border-calm-200 disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-calm-200 bg-calm-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">When</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Action</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Actor</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Child</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">
                  Organisation
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden xl:table-cell">
                  IP
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading…
                  </td>
                </tr>
              ) : !data || data.rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    {hasFilters ? 'No events match those filters.' : 'No audit events recorded yet.'}
                  </td>
                </tr>
              ) : (
                data.rows.map((r) => (
                  <tr key={r.id} className="border-b border-calm-100 hover:bg-calm-50 transition-colors">
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
                        {r.action.replace(/_/g, ' ').toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{r.actor.name ?? '—'}</p>
                      <p className="text-xs text-slate-400">{r.actor.email ?? r.actor.id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{r.child.name}</p>
                      <p className="text-xs text-slate-400 font-mono">{r.child.id.slice(0, 10)}…</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden lg:table-cell">
                      {r.child.orgName ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono hidden xl:table-cell">
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
