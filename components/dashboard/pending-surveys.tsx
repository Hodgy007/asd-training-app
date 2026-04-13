'use client'

import { useState, useEffect, useCallback } from 'react'
import { ClipboardList, Loader2, X, ChevronRight, Star, Check, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { clsx } from 'clsx'

interface PendingSurvey {
  id: string
  title: string
  description: string | null
  closesAt: string | null
  _count: { questions: number }
}

interface SurveyQuestion {
  id: string
  type: 'MULTIPLE_CHOICE' | 'YES_NO' | 'FREE_TEXT' | 'RATING_SCALE' | 'MULTI_SELECT'
  question: string
  options: string | null
  required: boolean
  order: number
}

export function PendingSurveys() {
  const [surveys, setSurveys] = useState<PendingSurvey[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSurvey, setActiveSurvey] = useState<{ id: string; title: string; questions: SurveyQuestion[] } | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const fetchPending = useCallback(() => {
    fetch('/api/surveys/pending')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSurveys(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchPending() }, [fetchPending])

  const openSurvey = async (surveyId: string) => {
    try {
      const res = await fetch(`/api/surveys/${surveyId}`)
      if (!res.ok) throw new Error('Failed to load survey')
      const data = await res.json()
      setActiveSurvey({ id: data.id, title: data.title, questions: data.questions })
      setAnswers({})
      setError(null)
      setSubmitted(false)
    } catch {
      setError('Failed to load survey')
    }
  }

  const setAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleSubmit = async () => {
    if (!activeSurvey) return
    setSubmitting(true)
    setError(null)

    const answerArray = Object.entries(answers).map(([questionId, value]) => ({
      questionId,
      value,
    }))

    try {
      const res = await fetch(`/api/surveys/${activeSurvey.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answerArray }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit')
      }

      setSubmitted(true)
      fetchPending()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit survey')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      </div>
    )
  }

  if (surveys.length === 0 && !activeSurvey) return null

  return (
    <>
      {surveys.length > 0 && !activeSurvey && (
        <div className="card space-y-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Pending Surveys
              <span className="ml-2 text-sm font-normal text-slate-500">({surveys.length})</span>
            </h2>
          </div>
          <div className="space-y-2">
            {surveys.map((s) => (
              <button
                key={s.id}
                onClick={() => openSurvey(s.id)}
                className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-xl transition-colors w-full text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {s.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {s._count.questions} question{s._count.questions !== 1 ? 's' : ''}
                    {s.closesAt && ` · Closes ${format(new Date(s.closesAt), 'MMM d')}`}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-amber-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {activeSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
            <div className="bg-white dark:bg-slate-800 border-b border-calm-200 dark:border-slate-700 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{activeSurvey.title}</h3>
              <button
                onClick={() => setActiveSurvey(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-calm-100 dark:hover:bg-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {submitted ? (
              <div className="p-6 text-center space-y-3 overflow-y-auto flex-1 min-h-0">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                  <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-lg font-medium text-slate-900 dark:text-white">Thank you!</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Your response has been recorded.</p>
                <button
                  onClick={() => setActiveSurvey(null)}
                  className="mt-4 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {activeSurvey.questions.map((q) => (
                  <div key={q.id} className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      {q.question}
                      {q.required && <span className="text-red-500 ml-1">*</span>}
                    </label>

                    {q.type === 'MULTIPLE_CHOICE' && (
                      <div className="space-y-1">
                        {(JSON.parse(q.options || '[]') as string[]).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setAnswer(q.id, opt)}
                            className={clsx(
                              'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-left transition-colors',
                              answers[q.id] === opt
                                ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-300 dark:bg-primary-900/30 dark:text-primary-400 dark:ring-primary-700'
                                : 'bg-calm-50 text-slate-600 hover:bg-calm-100 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                            )}
                          >
                            <div className={clsx(
                              'w-4 h-4 rounded-full border-2 flex-shrink-0',
                              answers[q.id] === opt
                                ? 'border-primary-500 bg-primary-500'
                                : 'border-slate-300 dark:border-slate-500'
                            )}>
                              {answers[q.id] === opt && <Check className="h-3 w-3 text-white" />}
                            </div>
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}

                    {q.type === 'YES_NO' && (
                      <div className="flex gap-2">
                        {['yes', 'no'].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setAnswer(q.id, val)}
                            className={clsx(
                              'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                              answers[q.id] === val
                                ? 'bg-primary-500 text-white'
                                : 'bg-calm-50 text-slate-600 hover:bg-calm-100 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                            )}
                          >
                            {val.charAt(0).toUpperCase() + val.slice(1)}
                          </button>
                        ))}
                      </div>
                    )}

                    {q.type === 'FREE_TEXT' && (
                      <textarea
                        value={answers[q.id] || ''}
                        onChange={(e) => setAnswer(q.id, e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-300 focus:border-primary-300 resize-none"
                        rows={3}
                        placeholder="Type your response..."
                      />
                    )}

                    {q.type === 'RATING_SCALE' && (
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setAnswer(q.id, String(val))}
                            className="flex flex-col items-center gap-1"
                          >
                            <Star
                              className={clsx(
                                'h-8 w-8 transition-colors',
                                Number(answers[q.id]) >= val
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-300 dark:text-slate-500'
                              )}
                            />
                            <span className="text-xs text-slate-500">{val}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {q.type === 'MULTI_SELECT' && (
                      <div className="space-y-1">
                        {(JSON.parse(q.options || '[]') as string[]).map((opt) => {
                          const selected: string[] = (() => { try { return JSON.parse(answers[q.id] || '[]') } catch { return [] } })()
                          const isSelected = selected.includes(opt)
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                const next = isSelected
                                  ? selected.filter((s) => s !== opt)
                                  : [...selected, opt]
                                setAnswer(q.id, JSON.stringify(next))
                              }}
                              className={clsx(
                                'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-left transition-colors',
                                isSelected
                                  ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-300 dark:bg-primary-900/30 dark:text-primary-400 dark:ring-primary-700'
                                  : 'bg-calm-50 text-slate-600 hover:bg-calm-100 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                              )}
                            >
                              <div className={clsx(
                                'w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center',
                                isSelected
                                  ? 'border-primary-500 bg-primary-500'
                                  : 'border-slate-300 dark:border-slate-500'
                              )}>
                                {isSelected && <Check className="h-3 w-3 text-white" />}
                              </div>
                              {opt}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}

                <div className="pt-4 border-t border-calm-200 dark:border-slate-700 flex justify-end gap-3">
                  <button
                    onClick={() => setActiveSurvey(null)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Submit Survey
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
