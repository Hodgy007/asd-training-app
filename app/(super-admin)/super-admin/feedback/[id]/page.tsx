'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

type Status = 'NEW' | 'IN_PROGRESS' | 'RESOLVED'
type Type = 'BUG' | 'SUGGESTION' | 'QUESTION' | 'OTHER'

interface LogEntry { level: string; message: string; ts: number; source?: string }

interface Detail {
  id: string
  type: Type
  message: string
  url: string
  userAgent: string
  viewport: string
  clientLogs: LogEntry[] | null
  status: Status
  adminNotes: string | null
  resolvedAt: string | null
  resolvedBy: { name: string | null; email: string } | null
  createdAt: string
  user: { id: string; name: string | null; email: string; role: string }
  organisation: { id: string; name: string } | null
}

const STATUS_BADGE: Record<Status, string> = {
  NEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  IN_PROGRESS: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  RESOLVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
}

export default function FeedbackDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [item, setItem] = useState<Detail | null>(null)
  const [status, setStatus] = useState<Status>('NEW')
  const [adminNotes, setAdminNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/super-admin/feedback/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((json: Detail) => {
        setItem(json)
        setStatus(json.status)
        setAdminNotes(json.adminNotes ?? '')
      })
      .catch(() => setError('Failed to load feedback'))
  }, [id])

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/super-admin/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status, adminNotes }),
      })
      if (!res.ok) {
        setError('Failed to save')
      } else {
        const updated: Detail = await res.json()
        setItem(updated)
      }
    } finally {
      setSaving(false)
    }
  }

  if (!item) {
    return <p className="text-slate-500 dark:text-slate-400">{error ?? 'Loading...'}</p>
  }

  return (
    <div className="space-y-4">
      <Link href="/super-admin/feedback" className="text-sm text-slate-500 dark:text-slate-400 hover:underline">
        ← Back to feedback
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[item.status]}`}>
                {item.status.replace('_', ' ')}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                {item.type}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(item.createdAt).toLocaleString()}</span>
            </div>
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">From</h2>
            <p className="text-slate-900 dark:text-slate-100">
              {item.user.name ?? '(unnamed)'} &lt;{item.user.email}&gt; — {item.user.role}
              {item.organisation && <> @ {item.organisation.name}</>}
            </p>

            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-4 mb-1">Page</h2>
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline break-all">
              {item.url}
            </a>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Viewport {item.viewport} · {item.userAgent}
            </p>

            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-4 mb-1">Message</h2>
            <pre className="whitespace-pre-wrap text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-sans">
{item.message}
            </pre>

            {item.clientLogs && item.clientLogs.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Recent client logs ({item.clientLogs.length})
                </summary>
                <pre className="mt-2 whitespace-pre-wrap text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 max-h-96 overflow-auto">
{item.clientLogs.map((l) => `[${new Date(l.ts).toISOString().slice(11, 19)}] ${l.level} ${l.message}${l.source ? `  (${l.source})` : ''}`).join('\n')}
                </pre>
              </details>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
            >
              <option value="NEW">New</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Admin notes</label>
            <textarea
              rows={6}
              maxLength={5000}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
            />
          </div>

          {item.resolvedAt && item.resolvedBy && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Resolved by {item.resolvedBy.name ?? item.resolvedBy.email} on{' '}
              {new Date(item.resolvedAt).toLocaleString()}
            </p>
          )}

          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            onClick={save}
            disabled={saving}
            className="w-full px-4 py-2 rounded-xl text-sm font-semibold bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
