'use client'

import { useState, useCallback } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical, Save, X } from 'lucide-react'
import { clsx } from 'clsx'
import { SurveyTargetPicker } from '@/components/super-admin/survey-target-picker'
import type { SurveyTargetConfig } from '@/components/super-admin/survey-target-picker'

// ─── Types ─────────────────────────────────────────────────────────────────────

type QuestionType = 'MULTIPLE_CHOICE' | 'YES_NO' | 'FREE_TEXT' | 'RATING_SCALE' | 'MULTI_SELECT'

interface QuestionDraft {
  id: string
  type: QuestionType
  question: string
  options: string[]
  required: boolean
  order: number
}

interface SurveyBuilderProps {
  initialData?: {
    id?: string
    title: string
    description: string | null
    closesAt: string | null
    questions: Array<{
      id: string
      type: string
      question: string
      options: string | null
      required: boolean
      order: number
    }>
    targets: Array<{ role: string | null; organisationId: string | null }>
  }
  onSave: (data: {
    title: string
    description: string | null
    closesAt: string | null
    questions: Array<{ type: string; question: string; options?: string[]; required: boolean; order: number }>
    targets: Array<{ role: string | null; organisationId: string | null }>
  }) => Promise<void>
  onCancel: () => void
  saving?: boolean
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: 'Multiple Choice',
  YES_NO: 'Yes / No',
  FREE_TEXT: 'Free Text',
  RATING_SCALE: 'Rating Scale (1–5)',
  MULTI_SELECT: 'Multi Select',
}

const QUESTION_TYPES: QuestionType[] = [
  'MULTIPLE_CHOICE',
  'YES_NO',
  'FREE_TEXT',
  'RATING_SCALE',
  'MULTI_SELECT',
]

const HAS_OPTIONS: Set<QuestionType> = new Set(['MULTIPLE_CHOICE', 'MULTI_SELECT'])

// ─── Helpers ───────────────────────────────────────────────────────────────────

function parseInitialQuestions(
  questions: SurveyBuilderProps['initialData'] extends undefined
    ? never
    : NonNullable<SurveyBuilderProps['initialData']>['questions']
): QuestionDraft[] {
  return questions
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((q) => ({
      id: q.id,
      type: q.type as QuestionType,
      question: q.question,
      options: q.options ? (JSON.parse(q.options) as string[]) : [],
      required: q.required,
      order: q.order,
    }))
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function SurveyBuilder({ initialData, onSave, onCancel, saving }: SurveyBuilderProps) {
  // ── Form state ──────────────────────────────────────────────────────────────

  const [title, setTitle] = useState(initialData?.title ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [closesAt, setClosesAt] = useState(initialData?.closesAt ?? '')
  const [targets, setTargets] = useState<SurveyTargetConfig[]>(initialData?.targets ?? [])
  const [questions, setQuestions] = useState<QuestionDraft[]>(
    initialData?.questions ? parseInitialQuestions(initialData.questions) : []
  )
  const [errors, setErrors] = useState<string[]>([])

  // ── Question mutations ──────────────────────────────────────────────────────

  const addQuestion = useCallback(() => {
    setQuestions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: 'MULTIPLE_CHOICE',
        question: '',
        options: [''],
        required: true,
        order: prev.length,
      },
    ])
  }, [])

  const removeQuestion = useCallback((id: string) => {
    setQuestions((prev) =>
      prev
        .filter((q) => q.id !== id)
        .map((q, i) => ({ ...q, order: i }))
    )
  }, [])

  const updateQuestion = useCallback((id: string, patch: Partial<QuestionDraft>) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q
        const updated = { ...q, ...patch }
        // When switching to a type without options, clear them; when switching to one that needs them, seed one blank option
        if (patch.type !== undefined && patch.type !== q.type) {
          if (HAS_OPTIONS.has(patch.type)) {
            updated.options = updated.options.length > 0 ? updated.options : ['']
          } else {
            updated.options = []
          }
        }
        return updated
      })
    )
  }, [])

  const moveQuestion = useCallback((id: string, direction: 'up' | 'down') => {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === id)
      if (idx < 0) return prev
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= prev.length) return prev
      const next = [...prev]
      const tmp = next[idx]
      next[idx] = next[targetIdx]
      next[targetIdx] = tmp
      return next.map((q, i) => ({ ...q, order: i }))
    })
  }, [])

  // ── Option mutations ────────────────────────────────────────────────────────

  const addOption = useCallback((questionId: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId ? { ...q, options: [...q.options, ''] } : q
      )
    )
  }, [])

  const removeOption = useCallback((questionId: string, optIdx: number) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? { ...q, options: q.options.filter((_, i) => i !== optIdx) }
          : q
      )
    )
  }, [])

  const updateOption = useCallback((questionId: string, optIdx: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? { ...q, options: q.options.map((o, i) => (i === optIdx ? value : o)) }
          : q
      )
    )
  }, [])

  // ── Validation & submit ─────────────────────────────────────────────────────

  const validate = useCallback((): string[] => {
    const errs: string[] = []
    if (!title.trim()) errs.push('Survey title is required.')
    if (questions.length === 0) errs.push('Add at least one question.')
    questions.forEach((q, i) => {
      if (!q.question.trim()) errs.push(`Question ${i + 1} is missing question text.`)
      if (HAS_OPTIONS.has(q.type)) {
        const nonEmpty = q.options.filter((o) => o.trim().length > 0)
        if (nonEmpty.length < 2)
          errs.push(`Question ${i + 1} (${QUESTION_TYPE_LABELS[q.type]}) needs at least 2 options.`)
      }
    })
    return errs
  }, [title, questions])

  const handleSave = useCallback(async () => {
    const errs = validate()
    if (errs.length > 0) {
      setErrors(errs)
      return
    }
    setErrors([])
    await onSave({
      title: title.trim(),
      description: description.trim() || null,
      closesAt: closesAt || null,
      questions: questions.map((q) => ({
        type: q.type,
        question: q.question.trim(),
        ...(HAS_OPTIONS.has(q.type)
          ? { options: q.options.map((o) => o.trim()).filter(Boolean) }
          : {}),
        required: q.required,
        order: q.order,
      })),
      targets,
    })
  }, [validate, onSave, title, description, closesAt, questions, targets])

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ── Validation errors ──────────────────────────────────────────────── */}
      {errors.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <ul className="list-inside list-disc space-y-1 text-sm text-red-700 dark:text-red-400">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Survey details card ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-calm-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
          Survey Details
        </h2>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="survey-title" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="survey-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter survey title"
              className="w-full rounded-lg border border-calm-200 bg-calm-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-primary-500 dark:focus:ring-primary-500"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="survey-description" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Description
            </label>
            <textarea
              id="survey-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
              className="w-full rounded-lg border border-calm-200 bg-calm-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-primary-500 dark:focus:ring-primary-500"
            />
          </div>

          {/* Close date */}
          <div>
            <label htmlFor="survey-closes-at" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Closes At
            </label>
            <input
              id="survey-closes-at"
              type="datetime-local"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
              className="w-full rounded-lg border border-calm-200 bg-calm-50 px-3 py-2 text-sm text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* ── Target picker card ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-calm-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
          Target Audience
        </h2>
        <SurveyTargetPicker value={targets} onChange={setTargets} />
      </div>

      {/* ── Questions ──────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Questions
        </h2>

        {questions.length === 0 && (
          <div className="rounded-xl border border-dashed border-calm-300 bg-calm-50 p-8 text-center dark:border-slate-600 dark:bg-slate-800/50">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No questions yet. Click &quot;Add Question&quot; to get started.
            </p>
          </div>
        )}

        {questions.map((q, idx) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={idx}
            total={questions.length}
            onUpdate={(patch) => updateQuestion(q.id, patch)}
            onMove={(dir) => moveQuestion(q.id, dir)}
            onRemove={() => removeQuestion(q.id)}
            onAddOption={() => addOption(q.id)}
            onRemoveOption={(optIdx) => removeOption(q.id, optIdx)}
            onUpdateOption={(optIdx, val) => updateOption(q.id, optIdx, val)}
          />
        ))}

        <button
          type="button"
          onClick={addQuestion}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-primary-300 bg-primary-50 px-4 py-2.5 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100 dark:border-primary-600 dark:bg-primary-900/20 dark:text-primary-400 dark:hover:bg-primary-900/40"
        >
          <Plus className="h-4 w-4" />
          Add Question
        </button>
      </div>

      {/* ── Footer actions ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 border-t border-calm-200 pt-6 dark:border-slate-700">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg border border-calm-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-calm-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50 dark:bg-primary-500 dark:hover:bg-primary-600"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save Survey'}
        </button>
      </div>
    </div>
  )
}

// ─── Question Card ─────────────────────────────────────────────────────────────

interface QuestionCardProps {
  question: QuestionDraft
  index: number
  total: number
  onUpdate: (patch: Partial<QuestionDraft>) => void
  onMove: (direction: 'up' | 'down') => void
  onRemove: () => void
  onAddOption: () => void
  onRemoveOption: (optIdx: number) => void
  onUpdateOption: (optIdx: number, value: string) => void
}

function QuestionCard({
  question,
  index,
  total,
  onUpdate,
  onMove,
  onRemove,
  onAddOption,
  onRemoveOption,
  onUpdateOption,
}: QuestionCardProps) {
  const showOptions = HAS_OPTIONS.has(question.type)

  return (
    <div className="rounded-xl border border-calm-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      {/* ── Card header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-calm-100 px-4 py-3 dark:border-slate-700">
        <GripVertical className="h-4 w-4 flex-shrink-0 text-slate-400 dark:text-slate-500" />
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Q{index + 1}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => onMove('up')}
          disabled={index === 0}
          className="rounded p-1 text-slate-400 transition-colors hover:bg-calm-50 hover:text-slate-600 disabled:opacity-30 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          title="Move up"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onMove('down')}
          disabled={index === total - 1}
          className="rounded p-1 text-slate-400 transition-colors hover:bg-calm-50 hover:text-slate-600 disabled:opacity-30 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          title="Move down"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="rounded p-1 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          title="Delete question"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* ── Card body ────────────────────────────────────────────────────── */}
      <div className="space-y-4 p-4">
        {/* Type selector */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Type
          </label>
          <select
            value={question.type}
            onChange={(e) => onUpdate({ type: e.target.value as QuestionType })}
            className="w-full rounded-lg border border-calm-200 bg-calm-50 px-3 py-2 text-sm text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-500"
          >
            {QUESTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {QUESTION_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        {/* Question text */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Question <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={question.question}
            onChange={(e) => onUpdate({ question: e.target.value })}
            placeholder="Enter your question"
            className="w-full rounded-lg border border-calm-200 bg-calm-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-primary-500 dark:focus:ring-primary-500"
          />
        </div>

        {/* Options editor (MULTIPLE_CHOICE / MULTI_SELECT) */}
        {showOptions && (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Options
            </label>
            <div className="space-y-2">
              {question.options.map((opt, optIdx) => (
                <div key={optIdx} className="flex items-center gap-2">
                  <span className="w-6 flex-shrink-0 text-center text-xs font-medium text-slate-400 dark:text-slate-500">
                    {optIdx + 1}.
                  </span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => onUpdateOption(optIdx, e.target.value)}
                    placeholder={`Option ${optIdx + 1}`}
                    className="flex-1 rounded-lg border border-calm-200 bg-calm-50 px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-primary-500 dark:focus:ring-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveOption(optIdx)}
                    disabled={question.options.length <= 1}
                    className={clsx(
                      'rounded p-1 transition-colors',
                      question.options.length <= 1
                        ? 'text-slate-300 dark:text-slate-600'
                        : 'text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400'
                    )}
                    title="Remove option"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={onAddOption}
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >
              <Plus className="h-3.5 w-3.5" />
              Add option
            </button>
          </div>
        )}

        {/* Rating scale hint */}
        {question.type === 'RATING_SCALE' && (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Respondents will rate on a scale from 1 to 5.
          </p>
        )}

        {/* Required toggle */}
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={question.required}
            onChange={(e) => onUpdate({ required: e.target.checked })}
            className="h-4 w-4 rounded border-calm-300 text-primary-600 focus:ring-primary-500 dark:border-slate-500 dark:bg-slate-700"
          />
          <span className="text-sm text-slate-600 dark:text-slate-400">Required</span>
        </label>
      </div>
    </div>
  )
}
