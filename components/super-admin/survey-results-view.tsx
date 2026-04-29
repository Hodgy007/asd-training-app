'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

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

interface SurveyResultsViewProps {
  questions: QuestionResult[]
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const CHART_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4']

const TYPE_LABELS: Record<string, string> = {
  MULTIPLE_CHOICE: 'Multiple Choice',
  YES_NO: 'Yes / No',
  FREE_TEXT: 'Free Text',
  RATING_SCALE: 'Rating Scale',
  MULTI_SELECT: 'Multi Select',
}

const TYPE_BADGE: Record<string, string> = {
  MULTIPLE_CHOICE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  YES_NO: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  FREE_TEXT: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
  RATING_SCALE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  MULTI_SELECT: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
}

// ─── Custom Recharts Tooltip ────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; payload: { name: string } }>
  label?: string
}) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-calm-200 p-3 dark:bg-slate-800 dark:border-slate-600">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {payload[0].value} response{payload[0].value !== 1 ? 's' : ''}
        </p>
      </div>
    )
  }
  return null
}

// ─── Per-type Renderers ─────────────────────────────────────────────────────────

function MultipleChoiceChart({ question }: { question: QuestionResult }) {
  const counts: Record<string, number> = {}
  for (const answer of question.answers) {
    counts[answer.value] = (counts[answer.value] || 0) + 1
  }
  const data = Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  if (data.length === 0) {
    return <p className="text-sm text-slate-400">No responses yet.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 40 + 20, 120)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={28}>
          {data.map((_, idx) => (
            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function MultiSelectChart({ question }: { question: QuestionResult }) {
  const counts: Record<string, number> = {}
  for (const answer of question.answers) {
    let values: string[]
    try {
      values = JSON.parse(answer.value) as string[]
    } catch {
      values = [answer.value]
    }
    for (const v of values) {
      counts[v] = (counts[v] || 0) + 1
    }
  }
  const data = Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  if (data.length === 0) {
    return <p className="text-sm text-slate-400">No responses yet.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 40 + 20, 120)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={28}>
          {data.map((_, idx) => (
            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function YesNoBar({ question }: { question: QuestionResult }) {
  const yesCount = question.answers.filter((a) => a.value.toLowerCase() === 'yes').length
  const noCount = question.answers.filter((a) => a.value.toLowerCase() === 'no').length
  const total = yesCount + noCount
  const yesPct = total > 0 ? Math.round((yesCount / total) * 100) : 0
  const noPct = total > 0 ? 100 - yesPct : 0

  if (total === 0) {
    return <p className="text-sm text-slate-400">No responses yet.</p>
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-sm">
        <span className="w-8 text-right font-medium text-slate-700 dark:text-slate-300">Yes</span>
        <div className="flex-1 h-8 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
          {yesPct > 0 && (
            <div
              className="h-full bg-emerald-500 rounded-l-full flex items-center justify-center text-xs font-semibold text-white transition-all"
              style={{ width: `${yesPct}%` }}
            >
              {yesPct >= 10 && `${yesPct}%`}
            </div>
          )}
          {noPct > 0 && (
            <div
              className="h-full bg-red-400 rounded-r-full flex items-center justify-center text-xs font-semibold text-white transition-all"
              style={{ width: `${noPct}%` }}
            >
              {noPct >= 10 && `${noPct}%`}
            </div>
          )}
        </div>
        <span className="w-8 text-left font-medium text-slate-700 dark:text-slate-300">No</span>
      </div>
      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 px-12">
        <span>{yesCount} response{yesCount !== 1 ? 's' : ''}</span>
        <span>{noCount} response{noCount !== 1 ? 's' : ''}</span>
      </div>
    </div>
  )
}

function RatingScaleView({ question }: { question: QuestionResult }) {
  const values = question.answers.map((a) => parseInt(a.value)).filter((v) => !isNaN(v))
  const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0

  const distribution = [1, 2, 3, 4, 5].map((star) => ({
    star: `${star}`,
    count: values.filter((v) => v === star).length,
  }))
  const maxCount = Math.max(...distribution.map((d) => d.count), 1)

  if (values.length === 0) {
    return <p className="text-sm text-slate-400">No responses yet.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold text-amber-500">{avg.toFixed(1)}</span>
        <span className="text-lg text-slate-400 dark:text-slate-500">/ 5</span>
        <span className="text-sm text-slate-500 dark:text-slate-400 ml-2">
          ({values.length} response{values.length !== 1 ? 's' : ''})
        </span>
      </div>
      <div className="space-y-1.5">
        {distribution.map((d) => (
          <div key={d.star} className="flex items-center gap-2 text-sm">
            <span className="w-4 text-right text-slate-600 dark:text-slate-400 font-medium">{d.star}</span>
            <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-700 rounded overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded transition-all"
                style={{ width: `${(d.count / maxCount) * 100}%` }}
              />
            </div>
            <span className="w-8 text-xs text-slate-500 dark:text-slate-400">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FreeTextList({ question }: { question: QuestionResult }) {
  if (question.answers.length === 0) {
    return <p className="text-sm text-slate-400">No responses yet.</p>
  }

  return (
    <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
      {question.answers.map((answer, idx) => (
        <div
          key={idx}
          className="bg-calm-50 dark:bg-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-300"
        >
          {answer.value}
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export function SurveyResultsView({ questions }: SurveyResultsViewProps) {
  if (questions.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        No questions found for this survey.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {questions.map((q, idx) => (
        <div key={q.id} className="card">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              <span className="text-slate-400 dark:text-slate-500 mr-1.5">Q{idx + 1}.</span>
              {q.question}
            </h3>
            <span
              className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_BADGE[q.type] ?? 'bg-slate-100 text-slate-600'}`}
            >
              {TYPE_LABELS[q.type] ?? q.type}
            </span>
          </div>

          {q.type === 'MULTIPLE_CHOICE' && <MultipleChoiceChart question={q} />}
          {q.type === 'MULTI_SELECT' && <MultiSelectChart question={q} />}
          {q.type === 'YES_NO' && <YesNoBar question={q} />}
          {q.type === 'RATING_SCALE' && <RatingScaleView question={q} />}
          {q.type === 'FREE_TEXT' && <FreeTextList question={q} />}

          <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
            {q.answers.length} response{q.answers.length !== 1 ? 's' : ''}
          </p>
        </div>
      ))}
    </div>
  )
}
