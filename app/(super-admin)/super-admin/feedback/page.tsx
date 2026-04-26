'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'

type Status = 'NEW' | 'IN_PROGRESS' | 'RESOLVED'
type Type = 'BUG' | 'SUGGESTION' | 'QUESTION' | 'OTHER'

interface Item {
  id: string
  type: Type
  message: string
  status: Status
  createdAt: string
  user: { id: string; name: string | null; email: string; role: string }
  organisation: { id: string; name: string } | null
}

interface ListResponse {
  items: Item[]
  total: number
  page: number
  pageSize: number
  statusCounts: Record<Status, number>
}

const STATUS_BADGE: Record<Status, string> = {
  NEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  IN_PROGRESS: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  RESOLVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
}

const TYPE_LABEL: Record<Type, string> = { BUG: 'Bug', SUGGESTION: 'Suggestion', QUESTION: 'Question', OTHER: 'Other' }

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const m = Math.round(diffMs / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  return `${d}d ago`
}

export default function FeedbackInboxPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const status = searchParams.get('status') as Status | null
  const type = searchParams.get('type') as Type | null

  const [data, setData] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (status) qs.set('status', status)
    if (type) qs.set('type', type)
    fetch(`/api/super-admin/feedback?${qs.toString()}`)
      .then((r) => r.json())
      .then((json: ListResponse) => setData(json))
      .finally(() => setLoading(false))
  }, [status, type])

  function setFilter(key: 'status' | 'type', value: string | null) {
    const qs = new URLSearchParams(searchParams.toString())
    if (value) qs.set(key, value)
    else qs.delete(key)
    router.push(`/super-admin/feedback?${qs.toString()}`)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Feedback</h1>

      <div className="flex flex-wrap gap-2">
        {(['ALL', 'NEW', 'IN_PROGRESS', 'RESOLVED'] as const).map((s) => {
          const active = (s === 'ALL' && !status) || s === status
          const count = s === 'ALL' ? null : data?.statusCounts[s as Status] ?? 0
          return (
            <button
              key={s}
              onClick={() => setFilter('status', s === 'ALL' ? null : s)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
                active
                  ? 'bg-primary-500 border-primary-500 text-white'
                  : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'
              }`}
            >
              {s === 'ALL' ? 'All' : s.replace('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
              {count !== null && <span className="ml-1.5 text-xs opacity-75">({count})</span>}
            </button>
          )
        })}

        <select
          value={type ?? ''}
          onChange={(e) => setFilter('type', e.target.value || null)}
          className="ml-auto px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200"
        >
          <option value="">All types</option>
          <option value="BUG">Bug</option>
          <option value="SUGGESTION">Suggestion</option>
          <option value="QUESTION">Question</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <p className="p-6 text-slate-500 dark:text-slate-400">Loading...</p>
        ) : !data || data.items.length === 0 ? (
          <p className="p-6 text-slate-500 dark:text-slate-400">No feedback yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 text-left text-slate-600 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Submitter</th>
                <th className="px-4 py-3 font-medium">Org</th>
                <th className="px-4 py-3 font-medium">Message</th>
                <th className="px-4 py-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => router.push(`/super-admin/feedback/${item.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      router.push(`/super-admin/feedback/${item.id}`)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
                >
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[item.status]}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">{TYPE_LABEL[item.type]}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{item.user.name ?? '(unnamed)'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{item.user.role}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{item.organisation?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-md truncate">{item.message}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{relativeTime(item.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        <Link href="/super-admin" className="hover:underline">← Back to overview</Link>
      </p>
    </div>
  )
}
