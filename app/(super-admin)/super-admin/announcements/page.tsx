'use client'

import { useState, useEffect, useCallback } from 'react'
import { clsx } from 'clsx'
import {
  Megaphone,
  Plus,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronUp,
  Trash2,
} from 'lucide-react'

interface Announcement {
  id: string
  title: string
  body: string
  active: boolean
  expiresAt: string | null
  createdAt: string
  createdBy: { name: string | null }
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Create form state
  const [formTitle, setFormTitle] = useState('')
  const [formBody, setFormBody] = useState('')
  const [formExpiresAt, setFormExpiresAt] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [formSubmitting, setFormSubmitting] = useState(false)

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/announcements')
      if (res.ok) setAnnouncements(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAnnouncements() }, [fetchAnnouncements])

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function toggleActive(a: Announcement) {
    setActionLoading(a.id + '-toggle')
    try {
      const res = await fetch(`/api/super-admin/announcements/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !a.active }),
      })
      if (res.ok) {
        showToast(`Announcement ${!a.active ? 'activated' : 'deactivated'}.`, 'success')
        fetchAnnouncements()
      } else {
        const d = await res.json()
        showToast(d.error || 'Update failed.', 'error')
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete(a: Announcement) {
    if (!confirm(`Delete "${a.title}"? This cannot be undone.`)) return
    setActionLoading(a.id + '-delete')
    try {
      const res = await fetch(`/api/super-admin/announcements/${a.id}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('Announcement deleted.', 'success')
        fetchAnnouncements()
      } else {
        const d = await res.json()
        showToast(d.error || 'Delete failed.', 'error')
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormSubmitting(true)
    try {
      const res = await fetch('/api/super-admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          body: formBody,
          active: formActive,
          expiresAt: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
        }),
      })
      if (res.ok) {
        showToast('Announcement created.', 'success')
        setShowForm(false)
        setFormTitle('')
        setFormBody('')
        setFormExpiresAt('')
        setFormActive(true)
        fetchAnnouncements()
      } else {
        const d = await res.json()
        showToast(d.error || 'Create failed.', 'error')
      }
    } finally {
      setFormSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={clsx(
            'fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2',
            toast.type === 'success' ? 'bg-sage-600 text-white' : 'bg-red-600 text-white'
          )}
        >
          {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary-600" />
            Global Announcements
          </h1>
          <p className="text-slate-500 mt-1">Broadcast messages to all users across every organisation.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn-primary flex items-center gap-2"
        >
          {showForm ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Cancel' : 'Create Announcement'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">New Announcement</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">Title</label>
              <input
                className="input w-full"
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
                placeholder="e.g. Scheduled maintenance on Saturday"
              />
            </div>

            <div>
              <label className="label">Body</label>
              <textarea
                className="input w-full min-h-[100px] resize-y"
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                required
                placeholder="Full announcement text…"
              />
            </div>

            <div>
              <label className="label">Expires at <span className="text-slate-400 font-normal">(optional)</span></label>
              <input
                className="input w-full"
                type="datetime-local"
                value={formExpiresAt}
                onChange={(e) => setFormExpiresAt(e.target.value)}
              />
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="rounded border-calm-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-slate-700">Active (visible to users immediately)</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl border border-calm-200 text-sm font-medium text-slate-600 hover:bg-calm-50"
              >
                Cancel
              </button>
              <button type="submit" disabled={formSubmitting} className="btn-primary">
                {formSubmitting ? 'Creating…' : 'Create Announcement'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="card overflow-hidden p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-calm-200">
          <p className="text-sm text-slate-500">
            {announcements.length} announcement{announcements.length !== 1 ? 's' : ''}
          </p>
          <button
            onClick={fetchAnnouncements}
            className="p-2 rounded-xl border border-calm-200 hover:bg-calm-50 transition-colors text-slate-500"
            title="Refresh"
          >
            <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-calm-200 bg-calm-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Title</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Active</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Expires</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Created</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">By</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Actions</th>
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
              ) : announcements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No announcements yet.
                  </td>
                </tr>
              ) : (
                announcements.map((a) => (
                  <tr key={a.id} className="border-b border-calm-100 hover:bg-calm-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{a.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{a.body}</p>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        disabled={actionLoading === a.id + '-toggle'}
                        onClick={() => toggleActive(a)}
                        className={clsx(
                          'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-colors',
                          a.active
                            ? 'bg-sage-100 text-sage-700 hover:bg-sage-200'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        )}
                      >
                        {a.active ? (
                          <><CheckCircle className="h-3 w-3" />Active</>
                        ) : (
                          <><XCircle className="h-3 w-3" />Inactive</>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">
                      {a.expiresAt
                        ? new Date(a.expiresAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : <span className="text-slate-300">No expiry</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 hidden lg:table-cell">
                      {new Date(a.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden lg:table-cell">
                      {a.createdBy.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        disabled={actionLoading === a.id + '-delete'}
                        onClick={() => handleDelete(a)}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                        title="Delete announcement"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
