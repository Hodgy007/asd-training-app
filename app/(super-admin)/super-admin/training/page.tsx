'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  Plus,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Loader2,
  Eye,
  Edit3,
  X,
} from 'lucide-react'
import { clsx } from 'clsx'

/* ──────────────────────────── Types ──────────────────────────── */

interface Module {
  id: string
  title: string
  description: string
  programId: string
  order: number
  active: boolean
  _count: { lessons: number }
}

interface Program {
  id: string
  name: string
  description: string | null
  order: number
  active: boolean
  version: string
  status: 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'ARCHIVED'
  reviewedAt: string | null
  reviewedBy: string | null
  reviewNotes: string | null
  _count: { modules: number }
  modules?: Module[]
}

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  UNDER_REVIEW: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  ARCHIVED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  ARCHIVED: 'Archived',
}

/* ──────────────────────────── Main Page ──────────────────────────── */

export default function TrainingContentPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showNewProgram, setShowNewProgram] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Track expanded programs (shows modules) and programs being edited
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null)
  const [showModuleFormFor, setShowModuleFormFor] = useState<string | null>(null)

  const fetchPrograms = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/training/programs')
      if (res.ok) {
        const data: Program[] = await res.json()
        // For expanded programs, fetch their modules
        const expanded = Array.from(expandedIds)
        const withModules = await Promise.all(
          data.map(async (p) => {
            if (expanded.includes(p.id)) {
              const mRes = await fetch(`/api/super-admin/training/programs/${p.id}`)
              if (mRes.ok) {
                const full = await mRes.json()
                return { ...p, modules: full.modules ?? [] }
              }
            }
            return p
          })
        )
        setPrograms(withModules)
      }
    } finally {
      setLoading(false)
    }
  }, [expandedIds])

  useEffect(() => { fetchPrograms() }, [fetchPrograms])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(t)
    }
  }, [toast])

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
  }

  async function toggleExpand(programId: string) {
    const next = new Set(expandedIds)
    if (next.has(programId)) {
      next.delete(programId)
      setExpandedIds(next)
    } else {
      next.add(programId)
      setExpandedIds(next)
      // Fetch modules for this program
      const res = await fetch(`/api/super-admin/training/programs/${programId}`)
      if (res.ok) {
        const full = await res.json()
        setPrograms((prev) =>
          prev.map((p) => (p.id === programId ? { ...p, modules: full.modules ?? [] } : p))
        )
      }
    }
  }

  async function swapProgramOrder(index: number, direction: 'up' | 'down') {
    const otherIndex = direction === 'up' ? index - 1 : index + 1
    if (otherIndex < 0 || otherIndex >= programs.length) return
    const a = programs[index]
    const b = programs[otherIndex]
    setActionLoading(a.id)
    try {
      await Promise.all([
        fetch(`/api/super-admin/training/programs/${a.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: b.order }),
        }),
        fetch(`/api/super-admin/training/programs/${b.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: a.order }),
        }),
      ])
      await fetchPrograms()
    } finally {
      setActionLoading(null)
    }
  }

  async function swapModuleOrder(programId: string, modules: Module[], index: number, direction: 'up' | 'down') {
    const otherIndex = direction === 'up' ? index - 1 : index + 1
    if (otherIndex < 0 || otherIndex >= modules.length) return
    const a = modules[index]
    const b = modules[otherIndex]
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
      // Re-fetch that program's modules
      const res = await fetch(`/api/super-admin/training/programs/${programId}`)
      if (res.ok) {
        const full = await res.json()
        setPrograms((prev) =>
          prev.map((p) => (p.id === programId ? { ...p, modules: full.modules ?? [] } : p))
        )
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function toggleModuleActive(moduleId: string, currentActive: boolean, programId: string) {
    setActionLoading(moduleId)
    try {
      await fetch(`/api/super-admin/training/modules/${moduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      })
      const res = await fetch(`/api/super-admin/training/programs/${programId}`)
      if (res.ok) {
        const full = await res.json()
        setPrograms((prev) =>
          prev.map((p) => (p.id === programId ? { ...p, modules: full.modules ?? [] } : p))
        )
      }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Training Content</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage training programs, modules, and lessons.
          </p>
        </div>
        <button
          onClick={() => setShowNewProgram(!showNewProgram)}
          className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-4 py-2 text-sm font-bold transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Training Program
        </button>
      </div>

      {/* New Program Form */}
      {showNewProgram && (
        <NewProgramForm
          onCreated={() => {
            fetchPrograms()
            setShowNewProgram(false)
            showToast('Program created', 'success')
          }}
          onCancel={() => setShowNewProgram(false)}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      ) : programs.length === 0 && !showNewProgram ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-8 text-center">
          <BookOpen className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No training programs yet. Create one to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {programs.map((program, idx) => (
            <div
              key={program.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 shadow-sm overflow-hidden"
            >
              {/* Program Header */}
              <div className="p-6">
                <div className="flex items-start gap-4">
                  {/* Reorder arrows */}
                  <div className="flex flex-col gap-1 pt-1 flex-shrink-0">
                    <button
                      onClick={() => swapProgramOrder(idx, 'up')}
                      disabled={idx === 0 || actionLoading === program.id}
                      className="p-1 rounded hover:bg-calm-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronUp className="h-4 w-4 text-slate-500" />
                    </button>
                    <button
                      onClick={() => swapProgramOrder(idx, 'down')}
                      disabled={idx === programs.length - 1 || actionLoading === program.id}
                      className="p-1 rounded hover:bg-calm-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    </button>
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                        {program.name}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                        v{program.version}
                      </span>
                      <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold', STATUS_BADGE[program.status])}>
                        {STATUS_LABEL[program.status]}
                      </span>
                      <span
                        className={clsx(
                          'px-2 py-0.5 rounded-full text-xs font-semibold',
                          program.active
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                        )}
                      >
                        {program.active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        {program._count.modules} {program._count.modules === 1 ? 'module' : 'modules'}
                      </span>
                    </div>
                    {program.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                        {program.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setEditingProgramId(editingProgramId === program.id ? null : program.id)}
                      className="inline-flex items-center gap-1 border border-calm-200 dark:border-slate-700 hover:bg-calm-50 dark:hover:bg-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 transition-colors"
                      title="Edit program"
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit
                    </button>
                    <Link
                      href={`/training/${program.id}`}
                      className="inline-flex items-center gap-1 border border-calm-200 dark:border-slate-700 hover:bg-calm-50 dark:hover:bg-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 transition-colors"
                      target="_blank"
                      title="Preview training as a learner"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Link>
                    <button
                      onClick={() => toggleExpand(program.id)}
                      className={clsx(
                        'p-2 rounded-xl border border-calm-200 dark:border-slate-700 hover:bg-calm-50 dark:hover:bg-slate-700 transition-all',
                        expandedIds.has(program.id) && 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700'
                      )}
                      title={expandedIds.has(program.id) ? 'Collapse modules' : 'Expand modules'}
                    >
                      <ChevronRight
                        className={clsx(
                          'h-4 w-4 text-slate-500 transition-transform',
                          expandedIds.has(program.id) && 'rotate-90'
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Edit Program Inline Section */}
              {editingProgramId === program.id && (
                <EditProgramForm
                  program={program}
                  onSaved={() => {
                    setEditingProgramId(null)
                    fetchPrograms()
                    showToast('Program updated', 'success')
                  }}
                  onCancel={() => setEditingProgramId(null)}
                />
              )}

              {/* Expanded Modules */}
              {expandedIds.has(program.id) && (
                <div className="border-t border-calm-200 dark:border-slate-700 bg-calm-50/50 dark:bg-slate-800/50 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Modules
                    </h3>
                    <button
                      onClick={() => setShowModuleFormFor(showModuleFormFor === program.id ? null : program.id)}
                      className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-3 py-1.5 text-xs font-bold transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Module
                    </button>
                  </div>

                  {showModuleFormFor === program.id && (
                    <AddModuleForm
                      programId={program.id}
                      existingCount={program.modules?.length ?? 0}
                      onCreated={() => {
                        setShowModuleFormFor(null)
                        // Re-fetch this program's modules
                        fetch(`/api/super-admin/training/programs/${program.id}`)
                          .then((r) => r.json())
                          .then((full) => {
                            setPrograms((prev) =>
                              prev.map((p) =>
                                p.id === program.id
                                  ? { ...p, modules: full.modules ?? [], _count: { ...p._count, modules: full.modules?.length ?? 0 } }
                                  : p
                              )
                            )
                          })
                        showToast('Module created', 'success')
                      }}
                      onCancel={() => setShowModuleFormFor(null)}
                    />
                  )}

                  {(!program.modules || program.modules.length === 0) && showModuleFormFor !== program.id && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-calm-200 dark:border-slate-700 p-6 text-center">
                      <BookOpen className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        No modules yet. Add one to get started.
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {(program.modules ?? []).map((mod, midx) => (
                      <div
                        key={mod.id}
                        className="bg-white dark:bg-slate-800 rounded-xl border border-calm-200 dark:border-slate-700 p-4 flex items-start gap-3"
                      >
                        {/* Module order arrows */}
                        <div className="flex flex-col gap-0.5 pt-0.5 flex-shrink-0">
                          <button
                            onClick={() => swapModuleOrder(program.id, program.modules!, midx, 'up')}
                            disabled={midx === 0 || actionLoading === mod.id}
                            className="p-0.5 rounded hover:bg-calm-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                          </button>
                          <button
                            onClick={() => swapModuleOrder(program.id, program.modules!, midx, 'down')}
                            disabled={midx === (program.modules?.length ?? 0) - 1 || actionLoading === mod.id}
                            className="p-0.5 rounded hover:bg-calm-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                          </button>
                        </div>

                        {/* Module content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {mod.title}
                            </h4>
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
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                            {mod.description}
                          </p>
                        </div>

                        {/* Module actions */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => toggleModuleActive(mod.id, mod.active, program.id)}
                            disabled={actionLoading === mod.id}
                            className={clsx(
                              'px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors',
                              mod.active
                                ? 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20'
                                : 'border-green-200 text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20'
                            )}
                          >
                            {mod.active ? 'Disable' : 'Enable'}
                          </button>
                          <Link
                            href={`/training/${program.id}`}
                            className="inline-flex items-center gap-1 border border-calm-200 dark:border-slate-700 hover:bg-calm-50 dark:hover:bg-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors"
                            target="_blank"
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </Link>
                          <Link
                            href={`/super-admin/training/${mod.id}`}
                            className="inline-flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-2.5 py-1 text-xs font-bold transition-colors"
                          >
                            Edit
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────── New Program Form ──────────────────────────── */

function NewProgramForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [version, setVersion] = useState('1.0')
  const [status, setStatus] = useState<string>('DRAFT')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/super-admin/training/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          version: version.trim() || '1.0',
          status,
        }),
      })
      if (res.ok) {
        onCreated()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create program')
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
      className="bg-white dark:bg-slate-800 rounded-2xl border border-purple-200 dark:border-purple-700 p-6 shadow-sm space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-900 dark:text-white">New Training Program</h3>
        <button type="button" onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
          <X className="h-4 w-4" />
        </button>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400 font-semibold">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. ASD Awareness Training"
            required
            className="w-full rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Version
            </label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0"
              className="w-full rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
            >
              <option value="DRAFT">Draft</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="APPROVED">Approved</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
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
          placeholder="Brief description of the training program"
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
          Create Program
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

/* ──────────────────────────── Edit Program Form ──────────────────────────── */

function EditProgramForm({
  program,
  onSaved,
  onCancel,
}: {
  program: Program
  onSaved: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState(program.name)
  const [description, setDescription] = useState(program.description ?? '')
  const [version, setVersion] = useState(program.version)
  const [status, setStatus] = useState(program.status)
  const [active, setActive] = useState(program.active)
  const [reviewedBy, setReviewedBy] = useState(program.reviewedBy ?? '')
  const [reviewedAt, setReviewedAt] = useState(
    program.reviewedAt ? new Date(program.reviewedAt).toISOString().split('T')[0] : ''
  )
  const [reviewNotes, setReviewNotes] = useState(program.reviewNotes ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || null,
        version: version.trim() || '1.0',
        status,
        active,
        reviewedBy: reviewedBy.trim() || null,
        reviewedAt: reviewedAt ? new Date(reviewedAt).toISOString() : null,
        reviewNotes: reviewNotes.trim() || null,
      }
      const res = await fetch(`/api/super-admin/training/programs/${program.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        onSaved()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to save')
      }
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="border-t border-calm-200 dark:border-slate-700 bg-purple-50/50 dark:bg-purple-900/10 p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Edit Program</h3>
          <button type="button" onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X className="h-4 w-4" />
          </button>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400 font-semibold">{error}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="rounded border-calm-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Active</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
          />
        </div>

        {/* Revision section */}
        <div className="border-t border-calm-200 dark:border-slate-700 pt-4">
          <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
            Revision Details
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Version</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Program['status'])}
                className="w-full rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
              >
                <option value="DRAFT">Draft</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="APPROVED">Approved</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Reviewed By</label>
              <input
                type="text"
                value={reviewedBy}
                onChange={(e) => setReviewedBy(e.target.value)}
                placeholder="Reviewer name"
                className="w-full rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Review Date</label>
              <input
                type="date"
                value={reviewedAt}
                onChange={(e) => setReviewedAt(e.target.value)}
                className="w-full rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Review Notes</label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={2}
                placeholder="Optional notes about this revision"
                className="w-full rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
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
    </div>
  )
}

/* ──────────────────────────── Add Module Form ──────────────────────────── */

function AddModuleForm({
  programId,
  existingCount,
  onCreated,
  onCancel,
}: {
  programId: string
  existingCount: number
  onCreated: () => void
  onCancel: () => void
}) {
  const [id, setId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id.trim() || !title.trim() || !description.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/super-admin/training/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: id.trim(),
          title: title.trim(),
          description: description.trim(),
          programId,
          order: existingCount + 1,
        }),
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
      className="bg-white dark:bg-slate-800 rounded-xl border border-calm-200 dark:border-slate-700 p-4 space-y-3"
    >
      <h4 className="font-bold text-sm text-slate-900 dark:text-white">New Module</h4>
      {error && <p className="text-xs text-red-600 dark:text-red-400 font-semibold">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Module ID</label>
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="e.g. module-6"
            required
            className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Module title"
            required
            className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          required
          placeholder="Brief description"
          className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder-slate-400"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
          Create Module
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-calm-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
