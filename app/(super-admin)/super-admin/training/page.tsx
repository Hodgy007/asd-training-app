'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  Plus,
  ChevronUp,
  ChevronDown,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { clsx } from 'clsx'

interface Module {
  id: string
  title: string
  description: string
  type: string
  order: number
  active: boolean
  _count: { lessons: number }
}

export default function TrainingModulesPage() {
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showAsdForm, setShowAsdForm] = useState(false)
  const [showCareersForm, setShowCareersForm] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const fetchModules = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/training/modules')
      if (res.ok) setModules(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchModules()
  }, [fetchModules])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(t)
    }
  }, [toast])

  const asdModules = modules.filter((m) => m.type === 'ASD')
  const careersModules = modules.filter((m) => m.type === 'CAREERS')

  const toggleActive = async (mod: Module) => {
    setActionLoading(mod.id)
    try {
      const res = await fetch(`/api/super-admin/training/modules/${mod.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !mod.active }),
      })
      if (res.ok) {
        setToast({ message: `Module ${!mod.active ? 'activated' : 'deactivated'}`, type: 'success' })
        await fetchModules()
      }
    } finally {
      setActionLoading(null)
    }
  }

  const swapOrder = async (list: Module[], index: number, direction: 'up' | 'down') => {
    const otherIndex = direction === 'up' ? index - 1 : index + 1
    if (otherIndex < 0 || otherIndex >= list.length) return
    const a = list[index]
    const b = list[otherIndex]
    setActionLoading(a.id)
    try {
      await Promise.all([
        fetch(`/api/super-admin/training/modules/${a.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: b.order }),
        }),
        fetch(`/api/super-admin/training/modules/${b.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: a.order }),
        }),
      ])
      await fetchModules()
    } finally {
      setActionLoading(null)
    }
  }

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

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Training Content</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage training modules and lessons for all training areas.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      ) : (
        <>
          <ModuleSection
            title="ASD Training Modules"
            type="ASD"
            modules={asdModules}
            actionLoading={actionLoading}
            showForm={showAsdForm}
            setShowForm={setShowAsdForm}
            toggleActive={toggleActive}
            swapOrder={swapOrder}
            onCreated={() => {
              fetchModules()
              setShowAsdForm(false)
              setToast({ message: 'Module created', type: 'success' })
            }}
          />
          <ModuleSection
            title="Careers Training Modules"
            type="CAREERS"
            modules={careersModules}
            actionLoading={actionLoading}
            showForm={showCareersForm}
            setShowForm={setShowCareersForm}
            toggleActive={toggleActive}
            swapOrder={swapOrder}
            onCreated={() => {
              fetchModules()
              setShowCareersForm(false)
              setToast({ message: 'Module created', type: 'success' })
            }}
          />
        </>
      )}
    </div>
  )
}

/* ──────────────────────────── Section ──────────────────────────── */

interface SectionProps {
  title: string
  type: string
  modules: Module[]
  actionLoading: string | null
  showForm: boolean
  setShowForm: (v: boolean) => void
  toggleActive: (m: Module) => void
  swapOrder: (list: Module[], index: number, dir: 'up' | 'down') => void
  onCreated: () => void
}

function ModuleSection({
  title,
  type,
  modules,
  actionLoading,
  showForm,
  setShowForm,
  toggleActive,
  swapOrder,
  onCreated,
}: SectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-4 py-2 text-sm font-bold transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Module
        </button>
      </div>

      {showForm && (
        <AddModuleForm type={type} onCreated={onCreated} onCancel={() => setShowForm(false)} />
      )}

      {modules.length === 0 && !showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-8 text-center">
          <BookOpen className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No modules yet. Add one to get started.</p>
        </div>
      )}

      <div className="space-y-3">
        {modules.map((mod, idx) => (
          <div
            key={mod.id}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-6 shadow-sm flex items-start gap-4"
          >
            {/* Order arrows */}
            <div className="flex flex-col gap-1 pt-1">
              <button
                onClick={() => swapOrder(modules, idx, 'up')}
                disabled={idx === 0 || actionLoading === mod.id}
                className="p-1 rounded hover:bg-calm-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronUp className="h-4 w-4 text-slate-500" />
              </button>
              <button
                onClick={() => swapOrder(modules, idx, 'down')}
                disabled={idx === modules.length - 1 || actionLoading === mod.id}
                className="p-1 rounded hover:bg-calm-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-slate-900 dark:text-white truncate">{mod.title}</h3>
                <span
                  className={clsx(
                    'px-2 py-0.5 rounded-full text-xs font-semibold',
                    mod.active
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                  )}
                >
                  {mod.active ? 'Active' : 'Inactive'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  {mod._count.lessons} {mod._count.lessons === 1 ? 'lesson' : 'lessons'}
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                {mod.description}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => toggleActive(mod)}
                disabled={actionLoading === mod.id}
                className="p-2 rounded-xl border border-calm-200 dark:border-slate-700 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                title={mod.active ? 'Deactivate' : 'Activate'}
              >
                {mod.active ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
              </button>
              <Link
                href={`/super-admin/training/${mod.id}`}
                className="inline-flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-4 py-2 text-sm font-bold transition-colors"
              >
                Edit
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ──────────────────────────── Add Form ──────────────────────────── */

interface AddFormProps {
  type: string
  onCreated: () => void
  onCancel: () => void
}

function AddModuleForm({ type, onCreated, onCancel }: AddFormProps) {
  const [id, setId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id.trim() || !title.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/super-admin/training/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id.trim(), title: title.trim(), description: description.trim(), type }),
      })
      if (res.ok) {
        onCreated()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create module')
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
      <h3 className="font-bold text-slate-900 dark:text-white">New Module</h3>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 font-semibold">{error}</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Module ID
          </label>
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="e.g. module-6"
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
            placeholder="Module title"
            required
            className="w-full rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Brief description of the module"
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
          Create Module
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
