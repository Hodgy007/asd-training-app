'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Check, CheckCircle, ClipboardList, Loader2, Star } from 'lucide-react'
import { clsx } from 'clsx'

type QuestionType = 'MULTIPLE_CHOICE' | 'YES_NO' | 'FREE_TEXT' | 'RATING_SCALE' | 'MULTI_SELECT'

interface SurveyQuestion {
  id: string
  type: QuestionType
  question: string
  options: string | null
  required: boolean
  order: number
}

interface TrainingSurvey {
  id: string
  title: string
  description: string | null
  status: string
  closesAt: string | null
  questions: SurveyQuestion[]
  responses?: Array<{ id: string; completedAt: string | null }>
}

interface SurveyLessonProps {
  lessonId: string
  survey: TrainingSurvey | null
  onComplete: () => void
}

function parseOptions(options: string | null): string[] {
  if (!options) return []
  try {
    const parsed = JSON.parse(options)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function getMultiSelectValue(raw: string | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function isAnswered(value: string | undefined): boolean {
  if (!value) return false
  if (value.trim() === '') return false
  if (value.trim() === '[]') return false
  return true
}

export function SurveyLesson({ lessonId, survey, onComplete }: SurveyLessonProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(() =>
    Boolean(survey?.responses?.some((response) => response.completedAt))
  )

  const questions = useMemo(
    () => (survey?.questions ?? []).slice().sort((a, b) => a.order - b.order),
    [survey?.questions]
  )

  useEffect(() => {
    if (!submitted || !survey) return
    let cancelled = false
    fetch(`/api/training/lessons/${lessonId}/survey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: [] }),
    })
      .then((res) => {
        if (res.ok && !cancelled) onComplete()
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [lessonId, onComplete, submitted, survey])

  const setAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleSubmit = async () => {
    if (!survey) return

    const missing = questions.filter((question) => question.required && !isAnswered(answers[question.id]))
    if (missing.length > 0) {
      setError(`Please answer ${missing.length} required question${missing.length === 1 ? '' : 's'}.`)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/training/lessons/${lessonId}/survey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: Object.entries(answers).map(([questionId, value]) => ({ questionId, value })),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to submit survey' }))
        throw new Error(data.error || 'Failed to submit survey')
      }

      setSubmitted(true)
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit survey')
    } finally {
      setSubmitting(false)
    }
  }

  if (!survey) {
    return (
      <div className="card text-center py-10">
        <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Survey not linked</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          This training step needs a survey before learners can complete it.
        </p>
      </div>
    )
  }

  const closesAt = survey.closesAt ? new Date(survey.closesAt) : null
  const isOpen = survey.status === 'PUBLISHED' && (!closesAt || closesAt > new Date())

  if (!isOpen) {
    return (
      <div className="card text-center py-10">
        <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Survey unavailable</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          This survey is not currently open. Please ask an administrator to publish or reopen it.
        </p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="card text-center py-10">
        <div className="w-14 h-14 bg-sage-100 dark:bg-sage-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-sage-600 dark:text-sage-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Survey complete</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Thank you. You can now continue with the next training step.
        </p>
      </div>
    )
  }

  return (
    <div className="card space-y-6">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
          <ClipboardList className="h-6 w-6 text-primary-600 dark:text-primary-400" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Before you continue</p>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{survey.title}</h2>
          {survey.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              {survey.description}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-6">
        {questions.map((question) => {
          const options = parseOptions(question.options)

          return (
            <div key={question.id} className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900 dark:text-white">
                {question.question}
                {question.required && <span className="text-red-500 ml-1">*</span>}
              </label>

              {question.type === 'MULTIPLE_CHOICE' && (
                <div className="space-y-1">
                  {options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setAnswer(question.id, option)}
                      className={clsx(
                        'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-left transition-colors',
                        answers[question.id] === option
                          ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-300 dark:bg-primary-900/30 dark:text-primary-400 dark:ring-primary-700'
                          : 'bg-calm-50 text-slate-900 hover:bg-calm-100 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600'
                      )}
                    >
                      <span
                        className={clsx(
                          'w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                          answers[question.id] === option
                            ? 'border-primary-500 bg-primary-500'
                            : 'border-slate-300 dark:border-slate-500'
                        )}
                      >
                        {answers[question.id] === option && <Check className="h-3 w-3 text-white" />}
                      </span>
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {question.type === 'YES_NO' && (
                <div className="flex gap-2">
                  {['yes', 'no'].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAnswer(question.id, value)}
                      className={clsx(
                        'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                        answers[question.id] === value
                          ? 'bg-primary-500 text-white'
                          : 'bg-calm-50 text-slate-900 hover:bg-calm-100 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600'
                      )}
                    >
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </button>
                  ))}
                </div>
              )}

              {question.type === 'FREE_TEXT' && (
                <textarea
                  value={answers[question.id] || ''}
                  onChange={(e) => setAnswer(question.id, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-300 focus:border-primary-300 resize-none"
                  rows={3}
                  placeholder="Type your response..."
                />
              )}

              {question.type === 'RATING_SCALE' && (
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAnswer(question.id, String(value))}
                      className="flex flex-col items-center gap-1"
                    >
                      <Star
                        className={clsx(
                          'h-8 w-8 transition-colors',
                          Number(answers[question.id]) >= value
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300 dark:text-slate-500'
                        )}
                      />
                      <span className="text-xs text-slate-500">{value}</span>
                    </button>
                  ))}
                </div>
              )}

              {question.type === 'MULTI_SELECT' && (
                <div className="space-y-1">
                  {options.map((option) => {
                    const selected = getMultiSelectValue(answers[question.id])
                    const isSelected = selected.includes(option)
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          const next = isSelected
                            ? selected.filter((item) => item !== option)
                            : [...selected, option]
                          setAnswer(question.id, JSON.stringify(next))
                        }}
                        className={clsx(
                          'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-left transition-colors',
                          isSelected
                            ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-300 dark:bg-primary-900/30 dark:text-primary-400 dark:ring-primary-700'
                            : 'bg-calm-50 text-slate-900 hover:bg-calm-100 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600'
                        )}
                      >
                        <span
                          className={clsx(
                            'w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center',
                            isSelected
                              ? 'border-primary-500 bg-primary-500'
                              : 'border-slate-300 dark:border-slate-500'
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </span>
                        {option}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="pt-4 border-t border-calm-200 dark:border-slate-700 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="btn-primary px-6 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Submit survey
        </button>
      </div>
    </div>
  )
}
