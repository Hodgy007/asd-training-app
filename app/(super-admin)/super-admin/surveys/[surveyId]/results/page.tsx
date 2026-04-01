'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { sanitizeHtml } from '@/lib/sanitize'
import { ArrowLeft, Loader2, BarChart3, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react'
import { SurveyResultsView } from '@/components/super-admin/survey-results-view'

// ─── Types ──────────────────────────────────────────────────────────────────────

interface QuestionResult {
  id: string
  question: string
  type: string
  options: string | null
  answers: Array<{
    value: string
    user: {
      role: string
      organisation: { name: string } | null
    }
  }>
}

interface SurveyResult {
  survey: {
    id: string
    title: string
    description: string | null
    status: 'DRAFT' | 'PUBLISHED' | 'CLOSED'
    questions: Array<{
      id: string
      question: string
      type: string
      options: string | null
    }>
    responses: Array<{
      answers: Array<{
        questionId: string
        value: string
      }>
      user: {
        role: string
        organisation: { name: string } | null
      }
    }>
  }
  targetedCount: number
  responseCount: number
  responseRate: number
}

interface Insight {
  id: string
  type: 'SUMMARY' | 'COMPARATIVE' | 'RECOMMENDATIONS'
  content: string
  generatedAt: string
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  PUBLISHED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  CLOSED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const INSIGHT_META: Record<string, { title: string; icon: string }> = {
  SUMMARY: { title: 'Summary', icon: '📊' },
  COMPARATIVE: { title: 'Comparative Analysis', icon: '🔍' },
  RECOMMENDATIONS: { title: 'Recommendations', icon: '💡' },
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function SurveyResultsPage() {
  const params = useParams()
  const surveyId = params.surveyId as string

  const [results, setResults] = useState<SurveyResult | null>(null)
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatingInsights, setGeneratingInsights] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [resultsRes, insightsRes] = await Promise.all([
        fetch(`/api/super-admin/surveys/${surveyId}/results`),
        fetch(`/api/super-admin/surveys/${surveyId}/insights`),
      ])
      if (!resultsRes.ok) {
        const d = await resultsRes.json().catch(() => ({}))
        setError(d.error ?? 'Failed to load results.')
        return
      }
      const resultsData: SurveyResult = await resultsRes.json()
      setResults(resultsData)

      if (insightsRes.ok) {
        const insightsData: Insight[] = await insightsRes.json()
        setInsights(insightsData)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [surveyId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleGenerateInsights() {
    setGeneratingInsights(true)
    try {
      const res = await fetch(`/api/super-admin/surveys/${surveyId}/insights`, {
        method: 'POST',
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Failed to generate insights.')
        return
      }
      const newInsights: Insight[] = await res.json()
      setInsights(newInsights)
    } catch {
      setError('Failed to generate insights. Please try again.')
    } finally {
      setGeneratingInsights(false)
    }
  }

  // Transform survey data into QuestionResult[] for the results view
  const questionResults: QuestionResult[] =
    results?.survey.questions.map((q) => ({
      id: q.id,
      question: q.question,
      type: q.type,
      options: q.options,
      answers: results.survey.responses.flatMap((r) =>
        r.answers
          .filter((a) => a.questionId === q.id)
          .map((a) => ({
            value: a.value,
            user: r.user,
          }))
      ),
    })) ?? []

  // ─── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 bg-calm-200 rounded animate-pulse" />
          <div className="h-5 w-32 bg-calm-200 rounded animate-pulse" />
        </div>
        <div className="h-8 w-64 bg-calm-200 rounded animate-pulse" />
        <div className="h-32 bg-calm-200 rounded-2xl animate-pulse" />
        <div className="h-64 bg-calm-200 rounded-2xl animate-pulse" />
      </div>
    )
  }

  // ─── Error state ────────────────────────────────────────────────────────────

  if (error && !results) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Link
          href="/super-admin/surveys"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Surveys
        </Link>
        <div className="card text-center py-12">
          <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-3" />
          <p className="text-red-500">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 text-sm text-slate-500 hover:text-slate-700 underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!results) return null

  const { survey, targetedCount, responseCount, responseRate } = results

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back link + title */}
      <div>
        <Link
          href="/super-admin/surveys"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Surveys
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-purple-600" />
            {survey.title}
          </h1>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_BADGE[survey.status] ?? ''}`}
          >
            {survey.status}
          </span>
        </div>
        {survey.description && (
          <p className="text-slate-500 dark:text-slate-400 mt-1">{survey.description}</p>
        )}
      </div>

      {/* Error banner (non-fatal) */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Response rate card */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Response Rate</h2>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">{responseCount}</span>
          <span className="text-slate-400 dark:text-slate-500">/ {targetedCount} responses</span>
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400 ml-1">
            ({responseRate}%)
          </span>
        </div>
        <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(responseRate, 100)}%` }}
          />
        </div>
        {targetedCount === 0 && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            No targeted users found. Check the survey target configuration.
          </p>
        )}
      </div>

      {/* Per-question results */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Per-Question Breakdown
        </h2>
        <SurveyResultsView questions={questionResults} />
      </div>

      {/* AI Insights section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            AI Insights
          </h2>
          <button
            onClick={handleGenerateInsights}
            disabled={generatingInsights || responseCount === 0}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingInsights ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : insights.length > 0 ? (
              <>
                <RefreshCw className="h-4 w-4" />
                Regenerate Insights
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Insights
              </>
            )}
          </button>
        </div>

        {responseCount === 0 && (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Insights require at least one response. Publish the survey and collect responses first.
          </p>
        )}

        {generatingInsights && (
          <div className="card text-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Analysing responses and generating insights... This may take a moment.
            </p>
          </div>
        )}

        {!generatingInsights && insights.length > 0 && (
          <div className="space-y-4">
            {(['SUMMARY', 'COMPARATIVE', 'RECOMMENDATIONS'] as const).map((type) => {
              const insight = insights.find((i) => i.type === type)
              if (!insight) return null
              const meta = INSIGHT_META[type]
              return (
                <div key={type} className="card">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                    <span>{meta.icon}</span>
                    {meta.title}
                  </h3>
                  <div
                    className="prose prose-sm prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300
                      [&_table]:w-full [&_table]:text-sm [&_table]:border-collapse
                      [&_td]:border [&_td]:border-calm-200 [&_td]:dark:border-slate-600 [&_td]:px-2 [&_td]:py-1
                      [&_th]:border [&_th]:border-calm-200 [&_th]:dark:border-slate-600 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-semibold
                      [&_tr]:border-b [&_tr]:border-calm-100 [&_tr]:dark:border-slate-700"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(insight.content) }}
                  />
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
                    Generated {new Date(insight.generatedAt).toLocaleString()}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
