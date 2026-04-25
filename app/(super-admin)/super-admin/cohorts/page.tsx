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
  allowedProgramIds: string[]
  createdAt: string
  _count: { users: number }
}

export default function CohortsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [cohorts, setCohorts] = useState<CohortRow[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetchCohorts()
  }, [status])

  async function fetchCohorts() {
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/cohorts')
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

  const canManage = session && hasPermission(session as any, CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS)

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
      <div className="flex items-center justify-between">
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
          <Link
            href="/super-admin/cohorts/new"
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Cohort
          </Link>
        )}
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
              className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-5 shadow-sm flex items-center justify-between gap-4"
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
                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 dark:text-slate-400">
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

              <div className="flex items-center gap-2 flex-shrink-0">
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
