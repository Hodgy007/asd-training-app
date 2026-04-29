'use client'

import { useCallback, useEffect, useState } from 'react'
import { ClipboardList, RefreshCw, FileDown } from 'lucide-react'
import { downloadCsv, escapeCsv } from '../_lib/csv'
import { BackToReports } from '../_components/back-link'

interface QuestionAggregate {
  id: string
  description?: string
  attempts: number
  correct: number
  pctCorrect: number
  avgLatencySeconds: number | null
}

interface LessonAnalytics {
  lessonId: string
  lessonTitle: string
  moduleTitle: string
  programName: string
  learnerCount: number
  questions: QuestionAggregate[]
}

function PctBadge({ pct }: { pct: number }) {
  const tone =
    pct >= 80
      ? 'bg-emerald-50 text-emerald-700'
      : pct >= 50
      ? 'bg-amber-50 text-amber-700'
      : 'bg-rose-50 text-rose-700'
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${tone}`}>
      {pct}%
    </span>
  )
}

function formatLatency(sec: number | null): string {
  if (sec === null) return '—'
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = Math.round(sec - m * 60)
  return s === 0 ? `${m}m` : `${m}m ${s}s`
}

export default function ScormQuizzesReport() {
  const [data, setData] = useState<LessonAnalytics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/super-admin/reports/scorm-quizzes')
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Failed to load report.')
        return
      }
      const json = (await res.json()) as { lessons: LessonAnalytics[] }
      setData(json.lessons)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="max-w-full space-y-6 animate-page-enter">
      <BackToReports />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            SCORM Quiz Analytics
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Per-question correctness rates across all learners — sorted worst
            first to surface material that may need updating. Anonymised; no
            individual learner data shown.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="p-2 rounded-xl border border-calm-200 dark:border-slate-700 hover:bg-calm-50 dark:hover:bg-slate-800 transition-colors text-slate-500"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="card text-center text-slate-400 py-12">
          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
          Loading report...
        </div>
      ) : error ? (
        <div className="card text-red-500">{error}</div>
      ) : data.length === 0 ? (
        <div className="card text-center text-slate-400 py-12">
          <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-30" />
          No SCORM lessons found yet.
        </div>
      ) : (
        data.map((lesson) => (
          <LessonCard key={lesson.lessonId} lesson={lesson} />
        ))
      )}
    </div>
  )
}

function LessonCard({ lesson }: { lesson: LessonAnalytics }) {
  const hasData = lesson.questions.length > 0

  function exportCsv() {
    const headers = ['Question id', 'Question text', 'Attempts', 'Correct', '% correct', 'Avg time (s)']
    const rows = [headers.map(escapeCsv).join(',')]
    for (const q of lesson.questions) {
      rows.push([
        escapeCsv(q.id),
        escapeCsv(q.description ?? ''),
        q.attempts,
        q.correct,
        q.pctCorrect,
        q.avgLatencySeconds ?? '',
      ].join(','))
    }
    downloadCsv(`scorm-quiz-${lesson.lessonId}.csv`, rows.join('\n'))
  }

  return (
    <div className="card overflow-hidden p-0">
      <div className="px-4 py-3 border-b border-calm-200 dark:border-slate-700 flex items-center justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">
            {lesson.lessonTitle}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            {lesson.programName} &middot; {lesson.moduleTitle} &middot;{' '}
            {lesson.learnerCount} {lesson.learnerCount === 1 ? 'learner' : 'learners'} attempted
          </p>
        </div>
        {hasData && (
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
          >
            <FileDown className="h-3.5 w-3.5" />
            Export CSV
          </button>
        )}
      </div>
      {!hasData ? (
        <div className="px-4 py-8 text-center text-sm text-slate-400">
          {lesson.learnerCount === 0
            ? 'No learners have attempted this lesson yet.'
            : "This SCORM package doesn't report per-question results (interactions). Most authoring tools include them by default; some — like Articulate Rise — only report overall completion."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-calm-200 bg-calm-50 dark:bg-slate-900">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">
                  Question
                </th>
                <th className="px-3 py-3 font-semibold text-slate-600 whitespace-nowrap text-right">
                  Attempts
                </th>
                <th className="px-3 py-3 font-semibold text-slate-600 whitespace-nowrap text-right">
                  Correct
                </th>
                <th className="px-3 py-3 font-semibold text-slate-600 whitespace-nowrap text-center">
                  % correct
                </th>
                <th className="px-3 py-3 font-semibold text-slate-600 whitespace-nowrap text-right">
                  Avg time
                </th>
              </tr>
            </thead>
            <tbody>
              {lesson.questions.map((q) => (
                <tr
                  key={q.id}
                  className="border-b border-calm-100 hover:bg-calm-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <td className="px-4 py-3 align-top">
                    <p className="text-slate-900 dark:text-slate-100">
                      {q.description ?? <span className="font-mono text-xs">{q.id}</span>}
                    </p>
                    {q.description && (
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{q.id}</p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-700 dark:text-slate-300">
                    {q.attempts}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-700 dark:text-slate-300">
                    {q.correct}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <PctBadge pct={q.pctCorrect} />
                  </td>
                  <td className="px-3 py-3 text-right text-slate-500 dark:text-slate-400">
                    {formatLatency(q.avgLatencySeconds)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
