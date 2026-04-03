'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Users, Save, X, Check } from 'lucide-react'
import { CvStepLayout } from '@/components/cv-builder/cv-step-layout'
import { ExampleText } from '@/components/cv-builder/example-text'

interface StepProps {
  cvId: string
  data: any
  onUpdate: (fields: Record<string, any>) => void
  onSectionChange?: () => void
}

interface Reference {
  id: string
  name: string
  jobTitle?: string | null
  organisation?: string | null
  email?: string | null
  phone?: string | null
  relationship?: string | null
  order: number
}

interface FormData {
  name: string
  jobTitle: string
  organisation: string
  email: string
  phone: string
  relationship: string
}

const INPUT_CLASS =
  'w-full rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors'

const LABEL_CLASS = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'

const EMPTY_FORM: FormData = {
  name: '',
  jobTitle: '',
  organisation: '',
  email: '',
  phone: '',
  relationship: '',
}

export function ReferencesStep({ cvId, data, onUpdate, onSectionChange }: StepProps) {
  // Keep a local copy of refs so we can update immediately on save
  const [refs, setRefs] = useState<Reference[]>(data?.references || [])
  const refsOnRequest = data?.refsAvailableOnRequest ?? false

  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  // Sync from parent when data changes (e.g. after parent re-fetches)
  useEffect(() => {
    if (data?.references) {
      setRefs(data.references)
    }
  }, [data?.references])

  function handleToggle(checked: boolean) {
    onUpdate({ refsAvailableOnRequest: checked })
  }

  function startAdd() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setIsAdding(true)
    setJustSaved(false)
  }

  function startEdit(ref: Reference) {
    setIsAdding(false)
    setEditingId(ref.id)
    setJustSaved(false)
    setForm({
      name: ref.name,
      jobTitle: ref.jobTitle || '',
      organisation: ref.organisation || '',
      email: ref.email || '',
      phone: ref.phone || '',
      relationship: ref.relationship || '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setIsAdding(false)
    setForm(EMPTY_FORM)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)

    try {
      const payload = {
        name: form.name,
        jobTitle: form.jobTitle || null,
        organisation: form.organisation || null,
        email: form.email || null,
        phone: form.phone || null,
        relationship: form.relationship || null,
      }

      let res: Response

      if (isAdding) {
        res = await fetch(`/api/cv-builder/${cvId}/references`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          const created = await res.json()
          // Add to local list immediately so user sees it
          setRefs((prev) => [...prev, created])
        }
      } else if (editingId) {
        res = await fetch(`/api/cv-builder/${cvId}/references/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res!.ok) {
          const updated = await res!.json()
          // Update in local list immediately
          setRefs((prev) => prev.map((r) => (r.id === editingId ? updated : r)))
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
      const res = await fetch(`/api/cv-builder/${cvId}/references/${id}`, { method: 'DELETE' })
      if (res.ok) {
        // Remove from local list immediately
        setRefs((prev) => prev.filter((r) => r.id !== id))
      }
      setConfirmDeleteId(null)
      onSectionChange?.()
    } finally {
      setDeletingId(null)
    }
  }

  const renderForm = () => (
    <div className="space-y-4 bg-calm-50 dark:bg-slate-800/50 rounded-xl p-4 border border-calm-200 dark:border-slate-600">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL_CLASS}>Full name *</label>
          <input
            type="text"
            placeholder="e.g. Mrs Sarah Thompson"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Relationship</label>
          <input
            type="text"
            placeholder="e.g. Tutor, Line Manager, Mentor"
            value={form.relationship}
            onChange={(e) => setForm((prev) => ({ ...prev, relationship: e.target.value }))}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Job title</label>
          <input
            type="text"
            placeholder="e.g. Head of Department"
            value={form.jobTitle}
            onChange={(e) => setForm((prev) => ({ ...prev, jobTitle: e.target.value }))}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Organisation</label>
          <input
            type="text"
            placeholder="e.g. City College Manchester"
            value={form.organisation}
            onChange={(e) => setForm((prev) => ({ ...prev, organisation: e.target.value }))}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Email</label>
          <input
            type="email"
            placeholder="e.g. s.thompson@college.ac.uk"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Phone</label>
          <input
            type="tel"
            placeholder="e.g. 0161 234 5678"
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            className={INPUT_CLASS}
          />
        </div>
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
          disabled={saving || !form.name.trim()}
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
      stepNumber={7}
      title="References"
      description="Most employers will ask for references. You can provide them here or just say they're available on request."
    >
      <ExampleText>
        A reference is someone who can talk about your skills and character — like a teacher,
        manager, or mentor. Always ask them first!
      </ExampleText>

      {/* Toggle */}
      <div className="mt-4 flex items-center gap-3 rounded-xl bg-calm-50 dark:bg-slate-800/50 border border-calm-200 dark:border-slate-600 px-4 py-3">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={refsOnRequest}
            onChange={(e) => handleToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-calm-300 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-calm-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" />
        </label>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          References available on request
        </span>
      </div>

      {/* Reference cards - only shown if not "on request" */}
      {!refsOnRequest && (
        <div className="mt-4">
          {/* Saved entries */}
          {refs.length > 0 && (
            <div className="space-y-3">
              {refs.map((ref) =>
                editingId === ref.id ? (
                  <div key={ref.id}>{renderForm()}</div>
                ) : (
                  <div
                    key={ref.id}
                    className="rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {ref.name}
                        </h4>
                        {ref.jobTitle && (
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {ref.jobTitle}
                            {ref.organisation && ` at ${ref.organisation}`}
                          </p>
                        )}
                        {ref.relationship && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                            {ref.relationship}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5">
                          {ref.email && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {ref.email}
                            </span>
                          )}
                          {ref.phone && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {ref.phone}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-3 shrink-0">
                        <button
                          onClick={() => startEdit(ref)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {confirmDeleteId === ref.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(ref.id)}
                              disabled={deletingId === ref.id}
                              className="px-2 py-1 rounded-lg text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              {deletingId === ref.id ? 'Deleting...' : 'Confirm'}
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
                            onClick={() => setConfirmDeleteId(ref.id)}
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
              <span>Saved! You can add another reference below or click Next to continue.</span>
            </div>
          )}

          {/* Add form */}
          {isAdding && <div className="mt-3">{renderForm()}</div>}

          {/* Empty state */}
          {refs.length === 0 && !isAdding && (
            <div className="text-center py-6">
              <Users className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No references added yet. Add at least one reference or toggle the option above.
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
              {refs.length > 0 ? 'Add another reference' : 'Add a reference'}
            </button>
          )}
        </div>
      )}
    </CvStepLayout>
  )
}
