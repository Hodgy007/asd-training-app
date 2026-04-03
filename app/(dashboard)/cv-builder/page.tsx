'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Plus, FileText, Loader2, Trash2 } from 'lucide-react'

interface CVSummary {
  id: string
  title: string
  template: 'ACCESSIBLE' | 'MODERN' | 'CLASSIC'
  status: 'DRAFT' | 'COMPLETE'
  currentStep: number
  updatedAt: string
}

const TEMPLATE_LABELS: Record<string, string> = {
  ACCESSIBLE: 'Accessible',
  MODERN: 'Modern',
  CLASSIC: 'Classic',
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  COMPLETE: 'bg-sage-100 text-sage-700 dark:bg-sage-900/40 dark:text-sage-300',
}

export default function CvBuilderListPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [cvs, setCvs] = useState<CVSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const isCDO = session?.user?.role === 'CAREER_DEV_OFFICER'

  async function fetchCVs() {
    try {
      const res = await fetch('/api/cv-builder')
      if (res.ok) {
        const data = await res.json()
        setCvs(data)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCVs()
  }, [])

  async function createCV() {
    setCreating(true)
    try {
      const res = await fetch('/api/cv-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        const cv = await res.json()
        router.push(`/cv-builder/${cv.id}`)
      }
    } finally {
      setCreating(false)
    }
  }

  async function deleteCV(e: React.MouseEvent, cvId: string) {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this CV?')) return
    try {
      const res = await fetch(`/api/cv-builder/${cvId}`, { method: 'DELETE' })
      if (res.ok) {
        setCvs((prev) => prev.filter((cv) => cv.id !== cvId))
      }
    } catch {
      // silently fail
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {isCDO && (
        <nav className="flex gap-6 border-b border-calm-200 dark:border-slate-700">
          <span className="pb-2 border-b-2 border-primary-500 text-primary-600 dark:text-primary-400 text-sm font-semibold cursor-default">
            My CVs
          </span>
          <Link
            href="/cv-builder/students"
            className="pb-2 border-b-2 border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 text-sm font-medium transition-colors"
          >
            My Students
          </Link>
        </nav>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">CV Builder</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Create and manage your CVs step by step.
          </p>
        </div>
        <button
          onClick={createCV}
          disabled={creating}
          className="btn-primary flex items-center gap-2"
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          New CV
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 w-32 bg-calm-200 dark:bg-slate-700 rounded mb-3" />
              <div className="h-3 w-20 bg-calm-100 dark:bg-slate-600 rounded mb-2" />
              <div className="h-3 w-24 bg-calm-100 dark:bg-slate-600 rounded" />
            </div>
          ))}
        </div>
      ) : cvs.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-16 h-16 bg-calm-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-slate-300 dark:text-slate-500" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Create your first CV
          </h2>
          <p className="text-slate-400 dark:text-slate-500 text-sm mb-6 max-w-sm mx-auto">
            Our step-by-step builder will guide you through creating a professional CV. It only takes a few minutes.
          </p>
          <button
            onClick={createCV}
            disabled={creating}
            className="btn-primary inline-flex items-center gap-2"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Create your first CV
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cvs.map((cv) => (
            <div
              key={cv.id}
              onClick={() => router.push(`/cv-builder/${cv.id}`)}
              className="card-hover cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate pr-2">
                  {cv.title}
                </h3>
                <button
                  onClick={(e) => deleteCV(e, cv.id)}
                  className="p-1 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete CV"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-calm-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  {TEMPLATE_LABELS[cv.template]}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[cv.status]}`}>
                  {cv.status === 'DRAFT' ? 'Draft' : 'Complete'}
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Last edited {formatDate(cv.updatedAt)}
              </p>
            </div>
          ))}
          <button
            onClick={createCV}
            disabled={creating}
            className="border-2 border-dashed border-calm-300 dark:border-slate-600 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-all group"
          >
            <div className="w-12 h-12 bg-calm-100 dark:bg-slate-700 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 rounded-full flex items-center justify-center transition-colors">
              {creating ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
              ) : (
                <Plus className="h-6 w-6 text-slate-300 dark:text-slate-500 group-hover:text-primary-500 transition-colors" />
              )}
            </div>
            <span className="text-sm text-slate-400 dark:text-slate-500 group-hover:text-primary-600 dark:group-hover:text-primary-400 font-medium transition-colors">
              Create another CV
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
