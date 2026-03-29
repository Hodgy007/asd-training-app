'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  ChevronUp,
  ChevronDown,
  Loader2,
  CheckCircle,
  XCircle,
  Save,
} from 'lucide-react'
import { clsx } from 'clsx'

interface Lesson {
  id: string
  title: string
  type: string
  order: number
  active: boolean
  _count: { quizQuestions: number }
}

interface Module {
  id: string
  title: string
  description: string
  type: string
  order: number
  active: boolean
  lessons: Lesson[]
}

export default function ModuleEditorPage() {
  const params = useParams()
  const moduleId = params.moduleId as string

  const [mod, setMod] = useState<Module | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showLessonForm, setShowLessonForm] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Editable fields
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const fetchModule = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/super-admin/training/modules/${moduleId}`)
      if (res.ok) {
        const data = await res.json()
        setMod(data)
        setEditTitle(data.title)
        setEditDescription(data.description)
      }
    } finally {
      setLoading(false)
    }
  }, [moduleId])

  useEffect(() => {
    fetchModule()
  }, [fetchModule])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(t)
    }
  }, [toast])

  const saveModule = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/super-admin/training/modules/${moduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim(), description: editDescription.trim() }),
      })
      if (res.ok) {
        setToast({ message: 'Module saved', type: 'success' })
        await fetchModule()
      }
    } finally {
      setSaving(false)
    }
  }

  const toggleLessonActive = async (lesson: Lesson) => {
    setActionLoading(lesson.id)
    try {
      const res = await fetch(`/api/super-admin/training/lessons/${lesson.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !lesson.active }),
      })
      if (res.ok) {
        setToast({ message: `Lesson ${!lesson.active ? 'activated' : 'deactivated'}`, type: 'success' })
        await fetchModule()
      }
    } finally {
      setActionLoading(null)
    }
  }

  const swapLessonOrder = async (index: number, direction: 'up' | 'down') => {
    if (!mod) return
    const lessons = mod.lessons
    const otherIndex = direction === 'up' ? index - 1 : index + 1
    if (otherIndex < 0 || otherIndex >= lessons.length) return
    const a = lessons[index]
    const b = lessons[otherIndex]
    setActionLoading(a.id)
    try {
      await Promise.all([
        fetch(`/api/super-admin/training/lessons/${a.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: b.order }),
        }),
        fetch(`/api/super-admin/training/lessons/${b.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: a.order }),
        }),
      ])
      await fetchModule()
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (!mod) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 dark:text-slate-400">Module not found.</p>
        <Link href="/super-admin/training" className="text-purple-600 hover:underline text-sm mt-2 inline-block">
          Back to Training Content
        </Link>
      </div>
    )
  }

  const typeBadgeClass =
    mod.type === 'ASD'
      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
      : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <div
          className={clsx(
            'fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-bold',
            toast.type === 'success'
              ? 'bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300'
              : 'bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300'
          )}
        >
          {toast.message}
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/super-admin/training" className="text-purple-600 hover:underline flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Training Content
        </Link>
        <span className="text-slate-400">/</span>
        <span className="text-slate-700 dark:text-slate-300 font-semibold">{mod.title}</span>
      </div>

      {/* Module editor card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edit Module</h1>
          <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold', typeBadgeClass)}>
            {mod.type}
          </span>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Title</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>
          <button
            onClick={saveModule}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </div>

      {/* Lessons section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Lessons ({mod.lessons.length})
          </h2>
          <button
            onClick={() => setShowLessonForm(!showLessonForm)}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-4 py-2 text-sm font-bold transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Lesson
          </button>
        </div>

        {showLessonForm && (
          <AddLessonForm
            moduleId={moduleId}
            onCreated={() => {
              fetchModule()
              setShowLessonForm(false)
              setToast({ message: 'Lesson created', type: 'success' })
            }}
            onCancel={() => setShowLessonForm(false)}
          />
        )}

        {mod.lessons.length === 0 && !showLessonForm && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-8 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">No lessons yet. Add one to get started.</p>
          </div>
        )}

        <div className="space-y-3">
          {mod.lessons.map((lesson, idx) => (
            <div
              key={lesson.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-6 shadow-sm flex items-start gap-4"
            >
              {/* Order arrows */}
              <div className="flex flex-col gap-1 pt-1">
                <button
                  onClick={() => swapLessonOrder(idx, 'up')}
                  disabled={idx === 0 || actionLoading === lesson.id}
                  className="p-1 rounded hover:bg-calm-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronUp className="h-4 w-4 text-slate-500" />
                </button>
                <button
                  onClick={() => swapLessonOrder(idx, 'down')}
                  disabled={idx === mod.lessons.length - 1 || actionLoading === lesson.id}
                  className="p-1 rounded hover:bg-calm-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-white truncate">{lesson.title}</h3>
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded-full text-xs font-semibold',
                      lesson.type === 'TEXT'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                    )}
                  >
                    {lesson.type}
                  </span>
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded-full text-xs font-semibold',
                      lesson.active
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                    )}
                  >
                    {lesson.active ? 'Active' : 'Inactive'}
                  </span>
                  {lesson._count.quizQuestions > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      {lesson._count.quizQuestions} quiz Q{lesson._count.quizQuestions !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleLessonActive(lesson)}
                  disabled={actionLoading === lesson.id}
                  className="p-2 rounded-xl border border-calm-200 dark:border-slate-700 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  title={lesson.active ? 'Deactivate' : 'Activate'}
                >
                  {lesson.active ? (
                    <XCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </button>
                <Link
                  href={`/super-admin/training/${moduleId}/${lesson.id}`}
                  className="inline-flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-4 py-2 text-sm font-bold transition-colors"
                >
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────── Add Lesson Form ──────────────────────────── */

interface AddLessonFormProps {
  moduleId: string
  onCreated: () => void
  onCancel: () => void
}

function AddLessonForm({ moduleId, onCreated, onCancel }: AddLessonFormProps) {
  const [id, setId] = useState('')
  const [title, setTitle] = useState('')
  const [type, setType] = useState('TEXT')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id.trim() || !title.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/super-admin/training/modules/${moduleId}/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: id.trim(),
          title: title.trim(),
          type,
          content: content.trim(),
        }),
      })
      if (res.ok) {
        onCreated()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create lesson')
      }
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-6 shadow-sm space-y-4"
    >
      <h3 className="font-bold text-slate-900 dark:text-white">New Lesson</h3>
      {error && <p className="text-sm text-red-600 dark:text-red-400 font-semibold">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Lesson ID
          </label>
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="e.g. lesson-1-1"
            required
            className="w-full rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Lesson title"
            required
            className="w-full rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
          >
            <option value="TEXT">Text</option>
            <option value="VIDEO">Video</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Content
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder="Initial lesson content (you can use the full editor later)"
          className="w-full rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Create Lesson
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-calm-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
