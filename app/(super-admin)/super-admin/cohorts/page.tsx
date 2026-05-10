'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  UsersRound,
  Plus,
  RefreshCw,
  Users,
  BookOpen,
  Calendar,
  CheckCircle,
  XCircle,
  Ticket,
  AlertCircle,
} from 'lucide-react'
import { clsx } from 'clsx'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { HowToPanel } from '@/components/howto/panel'
import CohortsHowTo from '@/components/howto/super-admin/cohorts'

interface CohortRow {
  id: string
  name: string
  slug: string
  active: boolean
  lifecycleStatus: 'ACTIVE' | 'ARCHIVED'
  archivedAt: string | null
  allowedProgramIds: string[]
  createdAt: string
  _count: { users: number }
}

type StatusTab = 'ACTIVE' | 'ARCHIVED'

export default function CohortsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [cohorts, setCohorts] = useState<CohortRow[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [statusTab, setStatusTab] = useState<StatusTab>('ACTIVE')
  const [eventbriteOpen, setEventbriteOpen] = useState(false)
  const [eventbriteUrl, setEventbriteUrl] = useState('')
  const [eventbriteImporting, setEventbriteImporting] = useState(false)
  const [eventbriteError, setEventbriteError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetchCohorts()
  }, [status, statusTab])

  async function fetchCohorts() {
    setLoading(true)
    try {
      const res = await fetch(`/api/super-admin/cohorts?status=${statusTab}`)
      if (res.ok) {
        const data = await res.json()
        setCohorts(data)
      }
    } finally {
      setLoading(false)
    }
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleEventbriteImport() {
    setEventbriteImporting(true)
    setEventbriteError(null)
    try {
      const res = await fetch('/api/super-admin/cohorts/from-eventbrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urlOrId: eventbriteUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        // 409 conflict still gives us a cohortId — let the user navigate to it.
        if (res.status === 409 && data.cohortId) {
          router.push(`/super-admin/cohorts/${data.cohortId}`)
          return
        }
        setEventbriteError(data.error || 'Could not import from Eventbrite.')
        return
      }
      router.push(`/super-admin/cohorts/${data.cohortId}`)
    } catch {
      setEventbriteError('Network error. Please try again.')
    } finally {
      setEventbriteImporting(false)
    }
  }

  async function handleDeactivate(cohortId: string, name: string) {
    if (!confirm(`Deactivate cohort "${name}"? Members will lose access.`)) return
    const res = await fetch(`/api/super-admin/cohorts/${cohortId}`, { method: 'DELETE' })
    if (res.ok) {
      showToast('Cohort deactivated.', 'success')
      fetchCohorts()
    } else {
      showToast('Failed to deactivate cohort.', 'error')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 text-emerald-500 animate-spin" />
      </div>
    )
  }

  const canManage = session && hasPermission(session as any, CHARITY_PERMISSIONS.MANAGE_COHORTS)

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Toast */}
      {toast && (
        <div
          className={clsx(
            'fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2',
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          )}
        >
          {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <UsersRound className="h-6 w-6 text-emerald-600" />
            Cohorts
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Groups of workshop participants who are not part of a registered organisation.
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setEventbriteUrl('')
                setEventbriteError(null)
                setEventbriteOpen(true)
              }}
              className="px-4 py-2 rounded-xl border border-orange-300 dark:border-orange-700 text-sm font-bold text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition flex items-center gap-2"
            >
              <Ticket className="h-4 w-4" />
              From Eventbrite
            </button>
            <Link
              href="/super-admin/cohorts/new"
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Cohort
            </Link>
          </div>
        )}
      </div>

      {eventbriteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !eventbriteImporting && setEventbriteOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Ticket className="h-5 w-5 text-orange-600" />
                Import cohort from Eventbrite
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Paste the public Eventbrite event URL — we&apos;ll create a cohort
                with the event&apos;s details and start auto-enrolling people who book.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Eventbrite event URL or ID
              </label>
              <input
                type="text"
                value={eventbriteUrl}
                onChange={(e) => setEventbriteUrl(e.target.value)}
                disabled={eventbriteImporting}
                className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-300"
                placeholder="https://www.eventbrite.co.uk/e/...-tickets-1014447087547"
                autoFocus
              />
            </div>
            {eventbriteError && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{eventbriteError}</span>
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEventbriteOpen(false)}
                disabled={eventbriteImporting}
                className="px-4 py-2 rounded-xl border border-calm-200 dark:border-slate-600 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEventbriteImport}
                disabled={eventbriteImporting || !eventbriteUrl.trim()}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
              >
                {eventbriteImporting ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Ticket className="h-3.5 w-3.5" />
                )}
                {eventbriteImporting ? 'Importing…' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status tabs */}
      <div className="border-b border-calm-200 dark:border-slate-700">
        <nav className="flex gap-1 -mb-px">
          {(['ACTIVE', 'ARCHIVED'] as StatusTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusTab(tab)}
              className={clsx(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                statusTab === tab
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              )}
            >
              {tab === 'ACTIVE' ? 'Active' : 'Archived'}
            </button>
          ))}
        </nav>
      </div>

      {/* Empty state */}
      {cohorts.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-12 text-center shadow-sm">
          <UsersRound className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">No cohorts yet</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            Create a cohort to group workshop participants and share training with them.
          </p>
          {canManage && (
            <Link href="/super-admin/cohorts/new" className="btn-primary mt-4 inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create First Cohort
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {cohorts.map((cohort) => (
            <div
              key={cohort.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-5 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <UsersRound className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {cohort.name}
                    </span>
                    {!cohort.active && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-medium">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {cohort._count.users} {cohort._count.users === 1 ? 'member' : 'members'}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {cohort.allowedProgramIds.length} {cohort.allowedProgramIds.length === 1 ? 'program' : 'programs'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Created {new Date(cohort.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:flex-shrink-0">
                <Link
                  href={`/super-admin/cohorts/${cohort.id}`}
                  className="px-4 py-2 rounded-xl text-sm font-medium border border-calm-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 transition"
                >
                  Manage
                </Link>
                {canManage && cohort.active && (
                  <button
                    onClick={() => handleDeactivate(cohort.id, cohort.name)}
                    className="px-3 py-2 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                  >
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <HowToPanel>
        <CohortsHowTo />
      </HowToPanel>
    </div>
  )
}
