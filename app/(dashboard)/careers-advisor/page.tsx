'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Plus, Compass, Loader2, Trash2, FileText, Clock, CheckCircle2, Users } from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'
import { HowToPanel } from '@/components/howto/panel'
import CareersAdvisorHowTo from '@/components/howto/learner/careers-advisor'

interface AdvisorSession {
  id: string
  status: 'IN_PROGRESS' | 'COMPLETE'
  currentStep: number
  createdAt: string
  updatedAt: string
}

export default function CareersAdvisorPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [sessions, setSessions] = useState<AdvisorSession[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const isCDO = session?.user?.role === 'CAREER_DEV_OFFICER'

  useEffect(() => {
    fetch('/api/careers-advisor')
      .then((r) => r.json())
      .then(setSessions)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate() {
    setCreating(true)
    try {
      const res = await fetch('/api/careers-advisor', { method: 'POST' })
      const data = await res.json()
      router.push(`/careers-advisor/${data.id}`)
    } catch {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this session? This cannot be undone.')) return
    setDeleting(id)
    try {
      await fetch(`/api/careers-advisor/${id}`, { method: 'DELETE' })
      setSessions(sessions.filter((s) => s.id !== id))
    } catch {
      // ignore
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-6 animate-page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Careers Advisor</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Answer some questions and get personalised career suggestions
          </p>
        </div>
        {isCDO && (
          <Link
            href="/careers-advisor/students"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-calm-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-medium hover:bg-calm-50 dark:hover:bg-slate-600 transition-all"
          >
            <Users className="w-4 h-4" />
            My Students
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-stagger">
          {/* Create new card */}
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-calm-300 dark:border-slate-600 rounded-2xl hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-all min-h-[180px] group"
          >
            {creating ? (
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            ) : (
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center group-hover:bg-primary-200 dark:group-hover:bg-primary-900/50 transition-all">
                <Plus className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
            )}
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {creating ? 'Starting...' : 'Start a new session'}
            </span>
          </button>

          {/* Existing sessions */}
          {sessions.map((s) => (
            <div
              key={s.id}
              className="relative bg-white dark:bg-slate-800 border border-calm-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all"
            >
              <Link href={`/careers-advisor/${s.id}`} className="absolute inset-0 rounded-2xl" />

              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                  {s.status === 'COMPLETE' ? (
                    <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  ) : (
                    <Compass className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  )}
                </div>

                <button
                  onClick={(e) => { e.preventDefault(); handleDelete(s.id) }}
                  disabled={deleting === s.id}
                  className="relative z-10 p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  {deleting === s.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="space-y-2">
                <div className={clsx(
                  'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                  s.status === 'COMPLETE'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                )}>
                  {s.status === 'COMPLETE' ? (
                    <><CheckCircle2 className="w-3 h-3" /> Report ready</>
                  ) : (
                    <><Clock className="w-3 h-3" /> In progress</>
                  )}
                </div>

                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Started {new Date(s.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
          ))}

          {sessions.length === 0 && !loading && (
            <div className="sm:col-span-1 lg:col-span-2 flex items-center gap-3 bg-calm-50 dark:bg-slate-800 rounded-2xl p-6 border border-calm-200 dark:border-slate-700">
              <Compass className="w-8 h-8 text-slate-300 dark:text-slate-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No sessions yet</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Start a new session to answer some questions and get personalised career suggestions.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <HowToPanel>
        <CareersAdvisorHowTo />
      </HowToPanel>
    </div>
  )
}
