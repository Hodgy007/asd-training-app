'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
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
  Trash2,
  Upload,
  Sparkles,
  Package,
} from 'lucide-react'
import { clsx } from 'clsx'
import { ContentGenerationModal } from '@/components/super-admin/content-generation-modal'
import { ScormImportModal } from '@/components/super-admin/scorm-import-modal'
import type { GenerationMode } from '@/lib/content-generator-types'
import { RichDescriptionEditor } from '@/components/ui/rich-description-editor'
import { normaliseHtml, stripHtml } from '@/lib/rich-text'
import { sanitizeHtml } from '@/lib/sanitize'
import { HowToPanel } from '@/components/howto/panel'
import TrainingHowTo from '@/components/howto/super-admin/training'

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
  audience: 'EDUCATION' | 'EMPLOYER'
  reviewedAt: string | null
  reviewedBy: string | null
  reviewNotes: string | null
  priceAmount: number | null
  currency: string
  purchasable: boolean
  stripeProductId: string | null
  stripePriceId: string | null
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

  const [generationModalOpen, setGenerationModalOpen] = useState(false)
  const [generationMode, setGenerationMode] = useState<GenerationMode>('structure')
  const [scormImportOpen, setScormImportOpen] = useState(false)
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const createMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!createMenuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node)) {
        setCreateMenuOpen(false)
      }
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCreateMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [createMenuOpen])

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
        // Preserve already-fetched modules on currently-expanded programs so
        // the expanded panel doesn't flicker to empty during a reorder refetch.
        setPrograms((prev) => {
          const modulesById = new Map<string, Module[] | undefined>()
          for (const p of prev) modulesById.set(p.id, p.modules)
          return data.map((p) => ({ ...p, modules: modulesById.get(p.id) }))
        })
      }
    } finally {
      setLoading(false)
    }
  }, [])

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

  async function deleteModule(moduleId: string, moduleTitle: string, programId: string) {
    const ok = window.confirm(`Delete "${moduleTitle}"? All lessons, quizzes, and any related training progress will be permanently deleted.`)
    if (!ok) return
    setActionLoading(moduleId)
    try {
      const res = await fetch(`/api/super-admin/training/modules/${moduleId}`, { method: 'DELETE' })
      if (res.ok) {
        // Refresh modules for this program
        const progRes = await fetch(`/api/super-admin/training/programs/${programId}`)
        if (progRes.ok) {
          const full = await progRes.json()
          setPrograms((prev) =>
            prev.map((p) => (p.id === programId ? { ...p, modules: full.modules ?? [] } : p))
          )
        }
        showToast('Module deleted', 'success')
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to delete module', 'error')
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
    <div className="space-y-8 animate-page-enter">
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
        <div className="flex items-center gap-2">
          <div className="relative" ref={createMenuRef}>
            <button
              onClick={() => setCreateMenuOpen(!createMenuOpen)}
              aria-haspopup="menu"
              aria-expanded={createMenuOpen}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-4 py-2 text-sm font-bold transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Program
              <ChevronDown className={clsx('h-4 w-4 transition-transform', createMenuOpen && 'rotate-180')} />
            </button>
            {createMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl border border-calm-200 dark:border-slate-700 shadow-lg z-20 overflow-hidden"
              >
                <button
                  role="menuitem"
                  onClick={() => {
                    setShowNewProgram(true)
                    setCreateMenuOpen(false)
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-calm-50 dark:hover:bg-slate-700 flex items-start gap-3 border-b border-calm-100 dark:border-slate-700"
                >
                  <Plus className="h-4 w-4 mt-0.5 text-purple-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">Blank program</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Start with an empty program and add modules manually.
                    </p>
                  </div>
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setGenerationMode('structure')
                    setGenerationModalOpen(true)
                    setCreateMenuOpen(false)
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-calm-50 dark:hover:bg-slate-700 flex items-start gap-3 border-b border-calm-100 dark:border-slate-700"
                >
                  <Upload className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">Import from files</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Build a program structure from uploaded documents.
                    </p>
                  </div>
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setGenerationMode('generate')
                    setGenerationModalOpen(true)
                    setCreateMenuOpen(false)
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-calm-50 dark:hover:bg-slate-700 flex items-start gap-3 border-b border-calm-100 dark:border-slate-700"
                >
                  <Sparkles className="h-4 w-4 mt-0.5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">Generate from files</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      AI generates full lesson content from your source material.
                    </p>
                  </div>
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setScormImportOpen(true)
                    setCreateMenuOpen(false)
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-calm-50 dark:hover:bg-slate-700 flex items-start gap-3"
                >
                  <Package className="h-4 w-4 mt-0.5 text-indigo-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">Import SCORM</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Upload a SCORM 1.2 or 2004 .zip from another LMS.
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
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
        <div className="inline-flex flex-col gap-6 max-w-full animate-stagger">
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
                    {program.description && stripHtml(program.description) && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                        {stripHtml(program.description)}
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
                  onDeleted={() => {
                    setEditingProgramId(null)
                    fetchPrograms()
                    showToast('Program deleted', 'success')
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
                            {stripHtml(mod.description)}
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
                          <button
                            onClick={() => deleteModule(mod.id, mod.title, program.id)}
                            disabled={actionLoading === mod.id}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
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

      <ContentGenerationModal
        mode={generationMode}
        isOpen={generationModalOpen}
        onClose={() => setGenerationModalOpen(false)}
        onComplete={() => fetchPrograms()}
      />

      <ScormImportModal
        open={scormImportOpen}
        onClose={() => setScormImportOpen(false)}
        onCreated={async (programId) => {
          setScormImportOpen(false)
          await fetchPrograms()
          // Auto-expand the new program so the admin can see the scaffolded
          // module/lesson immediately — otherwise it appears at the bottom
          // of the list and is easy to miss.
          await toggleExpand(programId)
          showToast('SCORM program created', 'success')
        }}
      />

      <HowToPanel>
        <TrainingHowTo />
      </HowToPanel>
    </div>
  )
}

/* ──────────────────────────── New Program Form ──────────────────────────── */

function NewProgramForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [version, setVersion] = useState('1.0')
  const [status, setStatus] = useState<string>('DRAFT')
  const [audience, setAudience] = useState<'EDUCATION' | 'EMPLOYER'>('EDUCATION')
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
          description: normaliseHtml(description) || undefined,
          version: version.trim() || '1.0',
          status,
          audience,
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
          Audience
        </label>
        <div className="inline-flex rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 p-1">
          <button
            type="button"
            onClick={() => setAudience('EDUCATION')}
            className={clsx(
              'px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors',
              audience === 'EDUCATION'
                ? 'bg-purple-600 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-600'
            )}
          >
            Education
          </button>
          <button
            type="button"
            onClick={() => setAudience('EMPLOYER')}
            className={clsx(
              'px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors',
              audience === 'EMPLOYER'
                ? 'bg-purple-600 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-600'
            )}
          >
            Employer
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Description
        </label>
        <RichDescriptionEditor
          value={description}
          onChange={setDescription}
          placeholder="Brief description of the training program"
          minHeight={120}
          ariaLabel="Program description"
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
  onDeleted,
  onCancel,
}: {
  program: Program
  onSaved: () => void
  onDeleted: () => void
  onCancel: () => void
}) {
  const { data: session } = useSession()
  const [name, setName] = useState(program.name)
  const [description, setDescription] = useState(program.description ?? '')
  const [version, setVersion] = useState(program.version)
  const [status, setStatus] = useState(program.status)
  const [audience, setAudience] = useState<'EDUCATION' | 'EMPLOYER'>(program.audience ?? 'EDUCATION')
  const [active, setActive] = useState(program.active)
  const [reviewedBy, setReviewedBy] = useState(program.reviewedBy ?? '')
  const [reviewedAt, setReviewedAt] = useState(
    program.reviewedAt ? new Date(program.reviewedAt).toISOString().split('T')[0] : ''
  )
  const [reviewNotes, setReviewNotes] = useState(program.reviewNotes ?? '')
  const [priceGbp, setPriceGbp] = useState(
    program.priceAmount !== null ? (program.priceAmount / 100).toFixed(2) : ''
  )
  const [currency, setCurrency] = useState(program.currency || 'gbp')
  const [purchasable, setPurchasable] = useState(program.purchasable)
  const [stripeProductId, setStripeProductId] = useState(program.stripeProductId ?? '')
  const [stripePriceId, setStripePriceId] = useState(program.stripePriceId ?? '')
  const [publishing, setPublishing] = useState(false)
  const [publishMessage, setPublishMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError('')

    const today = new Date().toISOString().split('T')[0]
    const currentUserLabel =
      session?.user?.name?.trim() || session?.user?.email?.trim() || ''
    const effectiveReviewedBy = reviewedBy.trim() || currentUserLabel
    const effectiveReviewedAt = reviewedAt || today
    // Keep the form fields in sync so the UI reflects what was saved
    if (!reviewedBy.trim() && currentUserLabel) setReviewedBy(currentUserLabel)
    if (!reviewedAt) setReviewedAt(today)

    const priceNumber = priceGbp.trim() ? Number(priceGbp) : null
    const priceAmountPence =
      priceNumber !== null && Number.isFinite(priceNumber) && priceNumber >= 0
        ? Math.round(priceNumber * 100)
        : null

    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        description: normaliseHtml(description) || null,
        version: version.trim() || '1.0',
        status,
        audience,
        active,
        reviewedBy: effectiveReviewedBy || null,
        reviewedAt: effectiveReviewedAt ? new Date(effectiveReviewedAt).toISOString() : null,
        reviewNotes: reviewNotes.trim() || null,
        priceAmount: priceAmountPence,
        currency: currency.toLowerCase() || 'gbp',
        purchasable,
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

  const handlePublishToStripe = async () => {
    setPublishing(true)
    setPublishMessage(null)
    try {
      const res = await fetch(`/api/super-admin/training/programs/${program.id}/stripe-publish`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        setPublishMessage({ type: 'error', text: data.error || 'Failed to publish' })
      } else {
        setStripeProductId(data.stripeProductId ?? '')
        setStripePriceId(data.stripePriceId ?? '')
        setPublishMessage({ type: 'success', text: 'Published to Stripe.' })
      }
    } catch {
      setPublishMessage({ type: 'error', text: 'Network error' })
    } finally {
      setPublishing(false)
    }
  }

  const handleUnpublishFromStripe = async () => {
    const ok = window.confirm(
      'Unpublish from Stripe? The Stripe price + product will be archived and the program will be removed from the /courses catalogue. You can re-publish later.'
    )
    if (!ok) return
    setPublishing(true)
    setPublishMessage(null)
    try {
      const res = await fetch(`/api/super-admin/training/programs/${program.id}/stripe-publish`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPublishMessage({ type: 'error', text: data.error || 'Failed to unpublish' })
      } else {
        setStripeProductId('')
        setStripePriceId('')
        setPurchasable(false)
        setPublishMessage({ type: 'success', text: 'Unpublished from Stripe.' })
      }
    } catch {
      setPublishMessage({ type: 'error', text: 'Network error' })
    } finally {
      setPublishing(false)
    }
  }

  const handleDelete = async () => {
    const moduleCount = program._count?.modules ?? 0
    const msg = moduleCount > 0
      ? `Delete "${program.name}"? This program has ${moduleCount} module${moduleCount > 1 ? 's' : ''} assigned. All modules, lessons, quizzes, and any related training progress will be permanently deleted. Are you sure?`
      : `Delete "${program.name}"? This cannot be undone.`
    const ok = window.confirm(msg)
    if (!ok) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/super-admin/training/programs/${program.id}`, { method: 'DELETE' })
      if (res.ok) {
        onDeleted()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to delete')
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
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Audience</label>
          <div className="inline-flex rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 p-1">
            <button
              type="button"
              onClick={() => setAudience('EDUCATION')}
              className={clsx(
                'px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors',
                audience === 'EDUCATION'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-600'
              )}
            >
              Education
            </button>
            <button
              type="button"
              onClick={() => setAudience('EMPLOYER')}
              className={clsx(
                'px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors',
                audience === 'EMPLOYER'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-600'
              )}
            >
              Employer
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
          <RichDescriptionEditor
            value={description}
            onChange={setDescription}
            placeholder="Brief description of the training program"
            minHeight={100}
            ariaLabel="Program description"
          />
        </div>

        {/* Pricing section */}
        <div className="border-t border-calm-200 dark:border-slate-700 pt-4">
          <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
            Pricing
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Price ({currency.toUpperCase()})
              </label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={priceGbp}
                onChange={(e) => setPriceGbp(e.target.value)}
                placeholder="49.00"
                className="w-full rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
              >
                <option value="gbp">GBP</option>
                <option value="usd">USD</option>
                <option value="eur">EUR</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={purchasable}
                  onChange={(e) => setPurchasable(e.target.checked)}
                  className="rounded border-calm-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Listed on /courses
                </span>
              </label>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handlePublishToStripe}
              disabled={publishing}
              className="inline-flex items-center gap-2 border border-purple-600 text-purple-700 dark:text-purple-300 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors disabled:opacity-50"
            >
              {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
              {stripePriceId ? 'Re-publish to Stripe' : 'Publish to Stripe'}
            </button>
            {stripePriceId || stripeProductId ? (
              <button
                type="button"
                onClick={handleUnpublishFromStripe}
                disabled={publishing}
                className="inline-flex items-center gap-2 border border-red-300 text-red-700 dark:text-red-300 dark:border-red-700/60 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
              >
                Unpublish from Stripe
              </button>
            ) : null}
            {stripePriceId ? (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Product: <code>{stripeProductId}</code> · Price: <code>{stripePriceId}</code>
              </span>
            ) : (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Not yet on Stripe. Save the price first, then publish.
              </span>
            )}
          </div>
          {publishMessage ? (
            <p
              className={clsx(
                'mt-2 text-sm font-semibold',
                publishMessage.type === 'success'
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-red-600 dark:text-red-400'
              )}
            >
              {publishMessage.text}
            </p>
          ) : null}
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

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
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
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="inline-flex items-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl px-3 py-2 text-sm font-bold transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete Program
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
    const descValue = normaliseHtml(description)
    if (!id.trim() || !title.trim() || !descValue) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/super-admin/training/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: id.trim(),
          title: title.trim(),
          description: descValue,
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
        <RichDescriptionEditor
          value={description}
          onChange={setDescription}
          placeholder="Brief description"
          minHeight={100}
          ariaLabel="Module description"
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
