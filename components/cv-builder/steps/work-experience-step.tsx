'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Briefcase, Save, X, Check } from 'lucide-react'
import { CvStepLayout } from '@/components/cv-builder/cv-step-layout'
import { ExampleText } from '@/components/cv-builder/example-text'
import { AiAssistButton } from '@/components/cv-builder/ai-assist-button'
import { AiSuggestionModal } from '@/components/cv-builder/ai-suggestion-modal'

interface StepProps {
  cvId: string
  data: any
  onUpdate: (fields: Record<string, any>) => void
  onSectionChange?: () => void
}

interface WorkExperience {
  id: string
  jobTitle: string
  employer: string
  startDate: string
  endDate?: string | null
  isCurrent?: boolean
  description?: string | null
  order: number
}

interface FormData {
  jobTitle: string
  employer: string
  startDate: string
  endDate: string
  isCurrent: boolean
  description: string
}

const INPUT_CLASS =
  'w-full rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors'

const LABEL_CLASS = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'

const EMPTY_FORM: FormData = {
  jobTitle: '',
  employer: '',
  startDate: '',
  endDate: '',
  isCurrent: false,
  description: '',
}

export function WorkExperienceStep({ cvId, data, onSectionChange }: StepProps) {
  // Keep a local copy of experiences so we can update immediately on save
  const [experiences, setExperiences] = useState<WorkExperience[]>(data?.workExperiences || [])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  // AI state
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState('')
  const [showAiModal, setShowAiModal] = useState(false)

  // Sync from parent when data changes (e.g. after parent re-fetches)
  useEffect(() => {
    if (data?.workExperiences) {
      setExperiences(data.workExperiences)
    }
  }, [data?.workExperiences])

  function startAdd() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setIsAdding(true)
    setJustSaved(false)
  }

  function startEdit(exp: WorkExperience) {
    setIsAdding(false)
    setEditingId(exp.id)
    setJustSaved(false)
    setForm({
      jobTitle: exp.jobTitle,
      employer: exp.employer,
      startDate: exp.startDate,
      endDate: exp.endDate || '',
      isCurrent: exp.isCurrent || false,
      description: exp.description || '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setIsAdding(false)
    setForm(EMPTY_FORM)
  }

  async function handleSave() {
    if (!form.jobTitle.trim() || !form.employer.trim() || !form.startDate) return
    setSaving(true)

    try {
      const payload = {
        jobTitle: form.jobTitle,
        employer: form.employer,
        startDate: form.startDate,
        endDate: form.isCurrent ? null : form.endDate || null,
        isCurrent: form.isCurrent,
        description: form.description || null,
      }

      let res: Response

      if (isAdding) {
        res = await fetch(`/api/cv-builder/${cvId}/work-experience`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          const created = await res.json()
          // Add to local list immediately so user sees it
          setExperiences((prev) => [...prev, created])
        }
      } else if (editingId) {
        res = await fetch(`/api/cv-builder/${cvId}/work-experience/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res!.ok) {
          const updated = await res!.json()
          // Update in local list immediately
          setExperiences((prev) => prev.map((e) => (e.id === editingId ? updated : e)))
        }
      }

      // Clear the form and show success
      setEditingId(null)
      setIsAdding(false)
      setForm(EMPTY_FORM)
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 3000)

      // Sync parent in background
      onSectionChange?.()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/cv-builder/${cvId}/work-experience/${id}`, { method: 'DELETE' })
      if (res.ok) {
        // Remove from local list immediately
        setExperiences((prev) => prev.filter((e) => e.id !== id))
      }
      setConfirmDeleteId(null)
      onSectionChange?.()
    } finally {
      setDeletingId(null)
    }
  }

  async function handleAiImprove() {
    if (!form.description || !form.jobTitle || !form.employer) return
    setAiLoading(true)
    try {
      const res = await fetch(`/api/cv-builder/${cvId}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'improve',
          context: {
            description: form.description,
            jobTitle: form.jobTitle,
            employer: form.employer,
          },
        }),
      })
      if (!res.ok) {
        if (res.status === 429) {
          const data = await res.json().catch(() => ({}))
          if (data.code === 'DAILY_LIMIT') {
            alert(data.error || 'You have reached today’s AI usage limit. Please try again tomorrow.')
          }
        }
        throw new Error('AI request failed')
      }
      const json = await res.json()
      setAiResult(json.result)
      setShowAiModal(true)
    } catch {
      // Silently handle
    } finally {
      setAiLoading(false)
    }
  }

  function handleAcceptAi() {
    if (aiResult) {
      setForm((prev) => ({ ...prev, description: aiResult }))
    }
    setShowAiModal(false)
    setAiResult('')
  }

  function formatDateRange(start: string, end?: string | null, isCurrent?: boolean) {
    if (isCurrent) return `${start} – Present`
    if (end) return `${start} – ${end}`
    return start
  }

  const renderForm = () => (
    <div className="space-y-4 bg-calm-50 dark:bg-slate-800/50 rounded-xl p-4 border border-calm-200 dark:border-slate-600">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL_CLASS}>Job title *</label>
          <input
            type="text"
            placeholder="e.g. Shop Assistant"
            value={form.jobTitle}
            onChange={(e) => setForm((prev) => ({ ...prev, jobTitle: e.target.value }))}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Employer *</label>
          <input
            type="text"
            placeholder="e.g. Tesco"
            value={form.employer}
            onChange={(e) => setForm((prev) => ({ ...prev, employer: e.target.value }))}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Start date *</label>
          <input
            type="text"
            placeholder="e.g. Sept 2022"
            value={form.startDate}
            onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>End date</label>
          <input
            type="text"
            placeholder="e.g. June 2024"
            value={form.endDate}
            disabled={form.isCurrent}
            onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
            className={`${INPUT_CLASS} ${form.isCurrent ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          <label className="flex items-center gap-2 mt-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isCurrent}
              onChange={(e) => setForm((prev) => ({ ...prev, isCurrent: e.target.checked }))}
              className="rounded border-calm-300 text-primary-600 focus:ring-primary-500"
            />
            I currently work here
          </label>
        </div>
      </div>

      <div>
        <label className={LABEL_CLASS}>What did you do in this job?</label>
        <textarea
          rows={4}
          placeholder="e.g. Served customers, restocked shelves, handled cash register..."
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          className={`${INPUT_CLASS} resize-none`}
        />
        {form.description && (
          <div className="mt-2">
            <AiAssistButton onClick={handleAiImprove} loading={aiLoading} label="Improve with AI" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={cancelEdit}
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-calm-100 dark:hover:bg-slate-700 transition-colors"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !form.jobTitle.trim() || !form.employer.trim() || !form.startDate}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 text-white px-4 py-1.5 text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )

  return (
    <CvStepLayout
      stepNumber={3}
      title="Work Experience"
      description="List any jobs, work placements, or volunteering you've done. Start with the most recent."
    >
      <ExampleText>
        Include job title, employer name, dates, and what you did. Even short placements, Saturday jobs, or volunteering count!
      </ExampleText>

      {/* Saved entries */}
      {experiences.length > 0 && (
        <div className="mt-4 space-y-3">
          {experiences.map((exp) =>
            editingId === exp.id ? (
              <div key={exp.id}>{renderForm()}</div>
            ) : (
              <div
                key={exp.id}
                className="rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {exp.jobTitle}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{exp.employer}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {formatDateRange(exp.startDate, exp.endDate, exp.isCurrent)}
                    </p>
                    {exp.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 whitespace-pre-line">
                        {exp.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-3 shrink-0">
                    <button
                      onClick={() => startEdit(exp)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {confirmDeleteId === exp.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(exp.id)}
                          disabled={deletingId === exp.id}
                          className="px-2 py-1 rounded-lg text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          {deletingId === exp.id ? 'Deleting...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 rounded-lg text-xs font-medium text-slate-500 hover:bg-calm-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(exp.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Success message after saving */}
      {justSaved && !isAdding && !editingId && (
        <div className="mt-3 flex items-center gap-2 text-sm text-sage-600 dark:text-sage-400">
          <Check className="h-4 w-4" />
          <span>Saved! You can add another entry below or click Next to continue.</span>
        </div>
      )}

      {/* Add form */}
      {isAdding && <div className="mt-3">{renderForm()}</div>}

      {/* Empty state */}
      {experiences.length === 0 && !isAdding && (
        <div className="mt-4 text-center py-6">
          <Briefcase className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No work experience added yet. That&apos;s OK — you can skip this step and come back later.
          </p>
        </div>
      )}

      {/* Add button — always visible when not editing */}
      {!isAdding && !editingId && (
        <button
          onClick={startAdd}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-calm-300 dark:border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:border-primary-300 hover:text-primary-600 dark:hover:border-primary-700 dark:hover:text-primary-400 transition-colors w-full justify-center"
        >
          <Plus className="h-4 w-4" />
          {experiences.length > 0 ? 'Add another role' : 'Add work experience'}
        </button>
      )}

      <AiSuggestionModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        suggestion={aiResult}
        onAccept={handleAcceptAi}
        onRetry={() => {
          setAiResult('')
          handleAiImprove()
        }}
        loading={aiLoading}
      />
    </CvStepLayout>
  )
}
