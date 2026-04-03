'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, GraduationCap, Save, X, Check } from 'lucide-react'
import { CvStepLayout } from '@/components/cv-builder/cv-step-layout'

interface StepProps {
  cvId: string
  data: any
  onUpdate: (fields: Record<string, any>) => void
  onSectionChange?: () => void
}

interface Education {
  id: string
  institution: string
  qualification: string
  grade?: string | null
  startDate: string
  endDate?: string | null
  description?: string | null
  order: number
}

interface FormData {
  institution: string
  qualification: string
  grade: string
  startDate: string
  endDate: string
  description: string
}

const QUALIFICATIONS = [
  'GCSE',
  'A-Level',
  'BTEC',
  'T-Level',
  'Diploma',
  'Foundation Degree',
  'Degree',
  'Masters',
  'PhD',
  'Other',
]

const INPUT_CLASS =
  'w-full rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors'

const LABEL_CLASS = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'

const EMPTY_FORM: FormData = {
  institution: '',
  qualification: '',
  grade: '',
  startDate: '',
  endDate: '',
  description: '',
}

export function EducationStep({ cvId, data, onSectionChange }: StepProps) {
  // Keep a local copy of entries so we can update immediately on save
  const [entries, setEntries] = useState<Education[]>(data?.educationEntries || [])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  // Sync from parent when data changes (e.g. after parent re-fetches)
  useEffect(() => {
    if (data?.educationEntries) {
      setEntries(data.educationEntries)
    }
  }, [data?.educationEntries])

  function startAdd() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setIsAdding(true)
    setJustSaved(false)
  }

  function startEdit(entry: Education) {
    setIsAdding(false)
    setEditingId(entry.id)
    setJustSaved(false)
    setForm({
      institution: entry.institution,
      qualification: entry.qualification,
      grade: entry.grade || '',
      startDate: entry.startDate,
      endDate: entry.endDate || '',
      description: entry.description || '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setIsAdding(false)
    setForm(EMPTY_FORM)
  }

  async function handleSave() {
    if (!form.institution.trim() || !form.qualification.trim() || !form.startDate) return
    setSaving(true)

    try {
      const payload = {
        institution: form.institution,
        qualification: form.qualification,
        grade: form.grade || null,
        startDate: form.startDate,
        endDate: form.endDate || null,
        description: form.description || null,
      }

      let res: Response

      if (isAdding) {
        res = await fetch(`/api/cv-builder/${cvId}/education`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          const created = await res.json()
          // Add to local list immediately so user sees it
          setEntries((prev) => [...prev, created])
        }
      } else if (editingId) {
        res = await fetch(`/api/cv-builder/${cvId}/education/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res!.ok) {
          const updated = await res!.json()
          // Update in local list immediately
          setEntries((prev) => prev.map((e) => (e.id === editingId ? updated : e)))
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
      const res = await fetch(`/api/cv-builder/${cvId}/education/${id}`, { method: 'DELETE' })
      if (res.ok) {
        // Remove from local list immediately
        setEntries((prev) => prev.filter((e) => e.id !== id))
      }
      setConfirmDeleteId(null)
      onSectionChange?.()
    } finally {
      setDeletingId(null)
    }
  }

  function formatDateRange(start: string, end?: string | null) {
    const fmt = (d: string) => {
      const date = new Date(d + '-01')
      return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    }
    const startStr = fmt(start)
    if (end) return `${startStr} - ${fmt(end)}`
    return `${startStr} - Present`
  }

  const renderForm = () => (
    <div className="space-y-4 bg-calm-50 dark:bg-slate-800/50 rounded-xl p-4 border border-calm-200 dark:border-slate-600">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={LABEL_CLASS}>School, college or university *</label>
          <input
            type="text"
            placeholder="e.g. City College Manchester"
            value={form.institution}
            onChange={(e) => setForm((prev) => ({ ...prev, institution: e.target.value }))}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Qualification *</label>
          <select
            value={form.qualification}
            onChange={(e) => setForm((prev) => ({ ...prev, qualification: e.target.value }))}
            className={INPUT_CLASS}
          >
            <option value="">Select qualification...</option>
            {QUALIFICATIONS.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL_CLASS}>Grade (optional)</label>
          <input
            type="text"
            placeholder="e.g. A*, Distinction, 2:1"
            value={form.grade}
            onChange={(e) => setForm((prev) => ({ ...prev, grade: e.target.value }))}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Start date *</label>
          <input
            type="month"
            value={form.startDate}
            onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>End date</label>
          <input
            type="month"
            value={form.endDate}
            onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div>
        <label className={LABEL_CLASS}>Additional details (optional)</label>
        <textarea
          rows={3}
          placeholder="e.g. Key subjects, projects, or achievements..."
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          className={`${INPUT_CLASS} resize-none`}
        />
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
          disabled={saving || !form.institution.trim() || !form.qualification.trim() || !form.startDate}
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
      stepNumber={4}
      title="Education"
      description="List your qualifications, starting with the most recent. Include any courses you're currently studying."
    >
      {/* Saved entries */}
      {entries.length > 0 && (
        <div className="space-y-3">
          {entries.map((entry) =>
            editingId === entry.id ? (
              <div key={entry.id}>{renderForm()}</div>
            ) : (
              <div
                key={entry.id}
                className="rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {entry.qualification}
                      {entry.grade && (
                        <span className="font-normal text-slate-500 dark:text-slate-400">
                          {' '}
                          — {entry.grade}
                        </span>
                      )}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{entry.institution}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {formatDateRange(entry.startDate, entry.endDate)}
                    </p>
                    {entry.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 whitespace-pre-line">
                        {entry.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-3 shrink-0">
                    <button
                      onClick={() => startEdit(entry)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {confirmDeleteId === entry.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(entry.id)}
                          disabled={deletingId === entry.id}
                          className="px-2 py-1 rounded-lg text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          {deletingId === entry.id ? 'Deleting...' : 'Confirm'}
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
                        onClick={() => setConfirmDeleteId(entry.id)}
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
      {entries.length === 0 && !isAdding && (
        <div className="text-center py-8">
          <GraduationCap className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No education entries yet. Add your qualifications to strengthen your CV.
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
          {entries.length > 0 ? 'Add another qualification' : 'Add education'}
        </button>
      )}
    </CvStepLayout>
  )
}
