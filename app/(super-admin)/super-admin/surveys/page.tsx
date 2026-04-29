'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Loader2, BarChart3, Pencil, Trash2, Send, XCircle, Sparkles, Eye, X } from 'lucide-react'
import { format } from 'date-fns'
import { clsx } from 'clsx'
import { SurveyBuilder } from '@/components/super-admin/survey-builder'
import { SurveyAiModal } from '@/components/super-admin/survey-ai-modal'
import Link from 'next/link'
import { HowToPanel } from '@/components/howto/panel'
import SurveysHowTo from '@/components/howto/super-admin/surveys'

/* ──────────────────────────── Types ──────────────────────────── */

interface SurveyTarget {
  role: string | null
  organisationId: string | null
  organisation?: { id: string; name: string } | null
}

interface SurveyQuestion {
  id: string
  type: string
  question: string
  options: string | null
  required: boolean
  order: number
}

interface Survey {
  id: string
  title: string
  description: string | null
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED'
  closesAt: string | null
  createdAt: string
  _count: { questions: number; responses: number }
  targets: SurveyTarget[]
  questions?: SurveyQuestion[]
  createdBy?: { id: string; name: string | null; email: string } | null
}

interface GeneratedSurvey {
  title: string
  description: string
  questions: Array<{
    type: string
    question: string
    options?: string[]
    required: boolean
    order: number
  }>
}

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  PUBLISHED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  CLOSED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  CLOSED: 'Closed',
}

/* ──────────────────────────── Helpers ──────────────────────────── */

function getTargetSummary(
  targets: Array<{
    role: string | null
    organisationId: string | null
    organisation?: { name: string } | null
  }>
): string {
  if (targets.length === 0) return 'No targets'

  const allRoles = targets.some((t) => !t.role)
  const allOrgs = targets.some((t) => !t.organisationId)
  const roleCount = new Set(targets.map((t) => t.role).filter(Boolean)).size
  const orgNames = [...new Set(targets.map((t) => t.organisation?.name).filter(Boolean))]

  const rolePart = allRoles ? 'All roles' : `${roleCount} role${roleCount !== 1 ? 's' : ''}`
  const orgPart = allOrgs ? 'all orgs' : orgNames.join(', ')
  return `${rolePart} \u00b7 ${orgPart}`
}

/* ──────────────────────────── Main Page ──────────────────────────── */

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null)
  const [showAiModal, setShowAiModal] = useState(false)
  const [aiGeneratedData, setAiGeneratedData] = useState<GeneratedSurvey | null>(null)
  const [saving, setSaving] = useState(false)
  const [viewingSurvey, setViewingSurvey] = useState<Survey | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  /* ── Fetch surveys ──────────────────────────────────────────────── */

  const fetchSurveys = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/surveys')
      if (res.ok) {
        const data: Survey[] = await res.json()
        setSurveys(data)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSurveys()
  }, [fetchSurveys])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(t)
    }
  }, [toast])

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
  }

  /* ── Create / update survey ─────────────────────────────────────── */

  const handleSave = useCallback(
    async (data: {
      title: string
      description: string | null
      closesAt: string | null
      questions: Array<{ type: string; question: string; options?: string[]; required: boolean; order: number }>
      targets: Array<{ role: string | null; organisationId: string | null }>
    }) => {
      setSaving(true)
      try {
        const isEdit = !!editingSurvey
        const url = isEdit
          ? `/api/super-admin/surveys/${editingSurvey.id}`
          : '/api/super-admin/surveys'
        const method = isEdit ? 'PATCH' : 'POST'

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        if (res.ok) {
          showToast(isEdit ? 'Survey updated' : 'Survey created', 'success')
          setShowBuilder(false)
          setEditingSurvey(null)
          setAiGeneratedData(null)
          await fetchSurveys()
        } else {
          const err = await res.json().catch(() => ({ error: 'Something went wrong' }))
          showToast(err.error ?? 'Failed to save survey', 'error')
        }
      } finally {
        setSaving(false)
      }
    },
    [editingSurvey, fetchSurveys]
  )

  /* ── Cancel builder ─────────────────────────────────────────────── */

  const handleCancel = useCallback(() => {
    setShowBuilder(false)
    setEditingSurvey(null)
    setAiGeneratedData(null)
  }, [])

  /* ── Edit survey ────────────────────────────────────────────────── */

  async function startEdit(surveyId: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/super-admin/surveys/${surveyId}`)
      if (res.ok) {
        const full: Survey = await res.json()
        setEditingSurvey(full)
        setShowBuilder(false)
      } else {
        showToast('Failed to load survey', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  /* ── View survey ─────────────────────────────────────────────────── */

  async function viewSurvey(surveyId: string) {
    try {
      const res = await fetch(`/api/super-admin/surveys/${surveyId}`)
      if (res.ok) {
        const full: Survey = await res.json()
        setViewingSurvey(full)
      } else {
        showToast('Failed to load survey', 'error')
      }
    } catch {
      showToast('Failed to load survey', 'error')
    }
  }

  /* ── Publish / close ────────────────────────────────────────────── */

  async function publishSurvey(surveyId: string, title: string) {
    const ok = window.confirm(`Publish "${title}"? It will become visible to targeted users.`)
    if (!ok) return
    const res = await fetch(`/api/super-admin/surveys/${surveyId}/publish`, { method: 'POST' })
    if (res.ok) {
      showToast('Survey published', 'success')
      await fetchSurveys()
    } else {
      const err = await res.json().catch(() => ({ error: 'Failed to publish' }))
      showToast(err.error ?? 'Failed to publish survey', 'error')
    }
  }

  async function closeSurvey(surveyId: string, title: string) {
    const ok = window.confirm(`Close "${title}"? No more responses will be accepted.`)
    if (!ok) return
    const res = await fetch(`/api/super-admin/surveys/${surveyId}/close`, { method: 'POST' })
    if (res.ok) {
      showToast('Survey closed', 'success')
      await fetchSurveys()
    } else {
      const err = await res.json().catch(() => ({ error: 'Failed to close' }))
      showToast(err.error ?? 'Failed to close survey', 'error')
    }
  }

  /* ── Delete ─────────────────────────────────────────────────────── */

  async function deleteSurvey(surveyId: string, title: string) {
    const ok = window.confirm(`Delete "${title}"? This cannot be undone.`)
    if (!ok) return
    const res = await fetch(`/api/super-admin/surveys/${surveyId}`, { method: 'DELETE' })
    if (res.ok) {
      showToast('Survey deleted', 'success')
      await fetchSurveys()
    } else {
      const err = await res.json().catch(() => ({ error: 'Failed to delete' }))
      showToast(err.error ?? 'Failed to delete survey', 'error')
    }
  }

  /* ── AI generation callback ─────────────────────────────────────── */

  function handleAiGenerated(survey: GeneratedSurvey) {
    setAiGeneratedData(survey)
    setShowBuilder(true)
    setEditingSurvey(null)
  }

  /* ── Compute builder initial data ───────────────────────────────── */

  const builderInitialData = editingSurvey
    ? {
        id: editingSurvey.id,
        title: editingSurvey.title,
        description: editingSurvey.description,
        closesAt: editingSurvey.closesAt,
        questions: (editingSurvey.questions ?? []).map((q) => ({
          id: q.id,
          type: q.type,
          question: q.question,
          options: q.options,
          required: q.required,
          order: q.order,
        })),
        targets: editingSurvey.targets.map((t) => ({
          role: t.role,
          organisationId: t.organisationId,
        })),
      }
    : aiGeneratedData
      ? {
          title: aiGeneratedData.title,
          description: aiGeneratedData.description,
          closesAt: null,
          questions: aiGeneratedData.questions.map((q, i) => ({
            id: crypto.randomUUID(),
            type: q.type,
            question: q.question,
            options: q.options ? JSON.stringify(q.options) : null,
            required: q.required,
            order: q.order ?? i,
          })),
          targets: [],
        }
      : undefined

  const showBuilderView = showBuilder || !!editingSurvey

  /* ──────────────────────────── Render ──────────────────────────── */

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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Surveys</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Create and manage surveys for your organisation users.
          </p>
        </div>
        {!showBuilderView && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAiModal(true)}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2 text-sm font-bold transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              Generate with AI
            </button>
            <button
              onClick={() => {
                setShowBuilder(true)
                setEditingSurvey(null)
                setAiGeneratedData(null)
              }}
              className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl px-4 py-2 text-sm font-bold transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Survey
            </button>
          </div>
        )}
      </div>

      {/* Builder view */}
      {showBuilderView ? (
        <SurveyBuilder
          initialData={builderInitialData}
          onSave={handleSave}
          onCancel={handleCancel}
          saving={saving}
        />
      ) : loading ? (
        /* Loading state */
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      ) : surveys.length === 0 ? (
        /* Empty state */
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-8 text-center">
          <BarChart3 className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No surveys yet. Create one to start gathering feedback.
          </p>
        </div>
      ) : (
        /* Survey list */
        <div className="space-y-4 animate-stagger">
          {surveys.map((survey) => (
            <div
              key={survey.id}
              className="bg-white dark:bg-slate-800 rounded-xl border border-calm-200 dark:border-slate-700 shadow-sm p-5"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white truncate">
                      {survey.title}
                    </h3>
                    <span
                      className={clsx(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        STATUS_BADGE[survey.status] ?? STATUS_BADGE.DRAFT
                      )}
                    >
                      {STATUS_LABEL[survey.status] ?? survey.status}
                    </span>
                  </div>

                  {survey.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 line-clamp-2">
                      {survey.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 dark:text-slate-500">
                    <span>{survey._count.questions} question{survey._count.questions !== 1 ? 's' : ''}</span>
                    <span>{survey._count.responses} response{survey._count.responses !== 1 ? 's' : ''}</span>
                    <span>{getTargetSummary(survey.targets)}</span>
                    <span>Created {format(new Date(survey.createdAt), 'dd MMM yyyy')}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => viewSurvey(survey.id)}
                    title="View survey"
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-calm-50 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </button>

                  {survey.status === 'DRAFT' && (
                    <>
                      <button
                        onClick={() => startEdit(survey.id)}
                        title="Edit"
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-calm-50 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => publishSurvey(survey.id, survey.title)}
                        title="Publish"
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20 transition-colors"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Publish
                      </button>
                    </>
                  )}

                  {survey.status === 'PUBLISHED' && (
                    <button
                      onClick={() => closeSurvey(survey.id, survey.title)}
                      title="Close"
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Close
                    </button>
                  )}

                  {(survey.status === 'PUBLISHED' || survey.status === 'CLOSED') && (
                    <Link
                      href={`/super-admin/surveys/${survey.id}/results`}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20 transition-colors"
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      Results
                    </Link>
                  )}

                  <button
                    onClick={() => deleteSurvey(survey.id, survey.title)}
                    title="Delete"
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Generation Modal */}
      <SurveyAiModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        onGenerated={handleAiGenerated}
      />

      {/* View Survey Modal */}
      {viewingSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-calm-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div className="flex items-center gap-3 min-w-0">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                  {viewingSurvey.title}
                </h3>
                <span
                  className={clsx(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium flex-shrink-0',
                    STATUS_BADGE[viewingSurvey.status] ?? STATUS_BADGE.DRAFT
                  )}
                >
                  {STATUS_LABEL[viewingSurvey.status] ?? viewingSurvey.status}
                </span>
              </div>
              <button
                onClick={() => setViewingSurvey(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-calm-100 dark:hover:bg-slate-700 flex-shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Description */}
              {viewingSurvey.description && (
                <div>
                  <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Description</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{viewingSurvey.description}</p>
                </div>
              )}

              {/* Meta info */}
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
                <span>Created {format(new Date(viewingSurvey.createdAt), 'dd MMM yyyy')}</span>
                {viewingSurvey.closesAt && (
                  <span>Closes {format(new Date(viewingSurvey.closesAt), 'dd MMM yyyy, HH:mm')}</span>
                )}
                <span>{viewingSurvey._count.responses} response{viewingSurvey._count.responses !== 1 ? 's' : ''}</span>
                <span>{getTargetSummary(viewingSurvey.targets)}</span>
              </div>

              {/* Questions */}
              <div>
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                  Questions ({viewingSurvey.questions?.length ?? 0})
                </p>
                <div className="space-y-3">
                  {(viewingSurvey.questions ?? [])
                    .slice()
                    .sort((a, b) => a.order - b.order)
                    .map((q, idx) => {
                      const parsedOptions: string[] = q.options ? (() => { try { return JSON.parse(q.options) } catch { return [] } })() : []
                      return (
                        <div
                          key={q.id}
                          className="rounded-lg border border-calm-200 dark:border-slate-700 p-4 bg-calm-50 dark:bg-slate-700/50"
                        >
                          <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs font-bold flex items-center justify-center mt-0.5">
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-white">
                                {q.question}
                                {q.required && <span className="text-red-500 ml-1">*</span>}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-500 dark:bg-slate-600 dark:text-slate-400">
                                  {q.type.replace(/_/g, ' ')}
                                </span>
                                {!q.required && (
                                  <span className="text-xs text-slate-400 dark:text-slate-500">Optional</span>
                                )}
                              </div>
                              {parsedOptions.length > 0 && (
                                <ul className="mt-2 space-y-1">
                                  {parsedOptions.map((opt, oi) => (
                                    <li key={oi} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-500 flex-shrink-0" />
                                      {opt}
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {q.type === 'RATING_SCALE' && (
                                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Scale: 1 to 5</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-calm-200 dark:border-slate-700 px-6 py-4 flex justify-end">
              <button
                onClick={() => setViewingSurvey(null)}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <HowToPanel>
        <SurveysHowTo />
      </HowToPanel>
    </div>
  )
}
