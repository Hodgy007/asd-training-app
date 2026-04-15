'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, UsersRound, BookOpen, CheckCircle, XCircle } from 'lucide-react'
import { clsx } from 'clsx'

interface TrainingProgram {
  id: string
  name: string
  status: string
}

export default function NewCohortPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [programs, setPrograms] = useState<TrainingProgram[]>([])
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/super-admin/training/programs')
      .then((r) => r.json())
      .then((data: TrainingProgram[]) => {
        setPrograms(data.filter((p) => p.status === 'APPROVED' || p.status === 'UNDER_REVIEW'))
      })
      .catch(() => {})
  }, [status])

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  function toggleProgram(id: string) {
    setSelectedProgramIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/super-admin/cohorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          allowedProgramIds: selectedProgramIds,
        }),
      })

      if (res.ok) {
        const cohort = await res.json()
        router.push(`/super-admin/cohorts/${cohort.id}`)
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to create cohort.', 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') return null

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-page-enter">
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

      {/* Breadcrumb */}
      <Link
        href="/super-admin/cohorts"
        className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Cohorts
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <UsersRound className="h-6 w-6 text-emerald-600" />
          New Cohort
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Create a group for workshop participants outside of registered organisations.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic details */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-6 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <UsersRound className="h-5 w-5 text-emerald-600" />
            Cohort Details
          </h2>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Spring Community Workshop 2026"
              className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional — e.g. Participants from the April 2026 community event"
              className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100 resize-none"
            />
          </div>
        </div>

        {/* Training programs */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-600" />
            Training Programs
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Select which training programs cohort members can access. You can change this later.
          </p>

          {programs.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 italic">No approved programs available.</p>
          ) : (
            <div className="space-y-2">
              {programs.map((program) => (
                <label
                  key={program.id}
                  className={clsx(
                    'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition',
                    selectedProgramIds.includes(program.id)
                      ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-600'
                      : 'border-calm-200 dark:border-slate-600 hover:bg-calm-50 dark:hover:bg-slate-700'
                  )}
                >
                  <input
                    type="checkbox"
                    className="rounded accent-emerald-600"
                    checked={selectedProgramIds.includes(program.id)}
                    onChange={() => toggleProgram(program.id)}
                  />
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {program.name}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <Link
            href="/super-admin/cohorts"
            className="px-4 py-2 rounded-xl border border-calm-200 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating…' : 'Create Cohort'}
          </button>
        </div>
      </form>
    </div>
  )
}
