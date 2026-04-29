'use client'

import { useState, useEffect, useCallback } from 'react'
import { ClipboardList, BarChart3, ChevronDown, ChevronRight, RefreshCw, FileDown } from 'lucide-react'
import { clsx } from 'clsx'
import { getRoleLabel } from '@/lib/rbac'
import { downloadCsv, escapeCsv } from '../_lib/csv'
import { BackToReports } from '../_components/back-link'

interface SurveyQuestionStat {
  questionId: string
  question: string
  type: string
  totalAnswers: number
  optionCounts?: Record<string, number>
  average?: number
  distribution?: Record<string, number>
  sampleAnswers?: string[]
}

interface SurveyOrgBreakdown {
  orgName: string
  responses: number
}

interface SurveyQuestion {
  id: string
  question: string
  type: string
  order: number
}

interface SurveyResponseRow {
  userName: string
  userRole: string
  orgName: string
  completedAt: string | null
  answers: { questionId: string; value: string }[]
}

interface SurveyReport {
  id: string
  title: string
  description: string | null
  status: string
  createdAt: string
  closesAt: string | null
  createdBy: string
  questionCount: number
  targetedCount: number
  responseCount: number
  responseRate: number
  questionStats: SurveyQuestionStat[]
  orgBreakdown: SurveyOrgBreakdown[]
  responses: SurveyResponseRow[]
  questions: SurveyQuestion[]
}

interface SurveyTotals {
  totalSurveys: number
  published: number
  closed: number
  draft: number
  totalResponses: number
}

function SurveyReportRow({ survey, isExpanded, onToggle }: { survey: SurveyReport; isExpanded: boolean; onToggle: () => void }) {
  const statusColor = survey.status === 'PUBLISHED'
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
    : survey.status === 'CLOSED'
    ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'

  const rateColor = survey.responseRate >= 70
    ? 'text-emerald-600 dark:text-emerald-400'
    : survey.responseRate >= 40
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-slate-500 dark:text-slate-400'

  function exportResponsesCsv() {
    const headers = ['Respondent', 'Role', 'Organisation', 'Completed']
    for (const q of survey.questions) {
      headers.push(escapeCsv(q.question))
    }
    const rows = [headers.join(',')]
    for (const r of survey.responses) {
      const row = [
        escapeCsv(r.userName ?? 'Anonymous'),
        getRoleLabel(r.userRole),
        escapeCsv(r.orgName),
        r.completedAt ? new Date(r.completedAt).toLocaleDateString('en-GB') : '',
      ]
      for (const q of survey.questions) {
        const answer = r.answers.find((a) => a.questionId === q.id)
        row.push(escapeCsv(answer?.value ?? ''))
      }
      rows.push(row.join(','))
    }
    downloadCsv(`survey-responses-${survey.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.csv`, rows.join('\n'))
  }

  function exportQuestionStatsCsv() {
    const rows = ['Question,Type,Total Answers,Breakdown']
    for (const qs of survey.questionStats) {
      let breakdown = ''
      if (qs.optionCounts) {
        breakdown = Object.entries(qs.optionCounts).map(([k, v]) => `${k}: ${v}`).join('; ')
      } else if (qs.average !== undefined) {
        breakdown = `Avg: ${qs.average}`
      } else if (qs.sampleAnswers) {
        breakdown = `${qs.totalAnswers} free-text responses`
      }
      rows.push([escapeCsv(qs.question), qs.type, String(qs.totalAnswers), escapeCsv(breakdown)].join(','))
    }
    downloadCsv(`survey-questions-${survey.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.csv`, rows.join('\n'))
  }

  return (
    <>
      <tr
        className={clsx(
          'border-b border-calm-100 dark:border-slate-700 hover:bg-calm-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer',
          isExpanded && 'bg-calm-50 dark:bg-slate-800/50'
        )}
        onClick={onToggle}
      >
        <td className="px-4 py-3 text-slate-400">
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </td>
        <td className="px-4 py-3">
          <p className="font-medium text-slate-800 dark:text-slate-200">{survey.title}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">{survey.questionCount} questions · Created {new Date(survey.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </td>
        <td className="px-4 py-3 text-center">
          <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>
            {survey.status}
          </span>
        </td>
        <td className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">
          {survey.responseCount}/{survey.targetedCount}
        </td>
        <td className={`px-4 py-3 text-center font-semibold ${rateColor}`}>
          {survey.responseRate}%
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-b border-calm-100 dark:border-slate-700">
          <td colSpan={5} className="px-6 py-4 bg-calm-50/50 dark:bg-slate-800/30 space-y-4">
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); exportResponsesCsv() }}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
              >
                <FileDown className="h-3.5 w-3.5" />
                Export Responses CSV
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); exportQuestionStatsCsv() }}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
              >
                <FileDown className="h-3.5 w-3.5" />
                Export Question Stats CSV
              </button>
            </div>

            {survey.orgBreakdown.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Responses by Organisation</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {survey.orgBreakdown.map((ob, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white dark:bg-slate-700 rounded-lg px-3 py-2 border border-calm-200 dark:border-slate-600">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate mr-3">{ob.orgName}</span>
                      <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 flex-shrink-0">{ob.responses}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {survey.questionStats.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Question Breakdown</p>
                <div className="space-y-2">
                  {survey.questionStats.map((qs) => (
                    <div key={qs.questionId} className="bg-white dark:bg-slate-700 rounded-lg px-4 py-3 border border-calm-200 dark:border-slate-600">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{qs.question}</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-calm-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300 flex-shrink-0">
                          {qs.type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">{qs.totalAnswers} answer{qs.totalAnswers !== 1 ? 's' : ''}</p>

                      {qs.optionCounts && (
                        <div className="space-y-1">
                          {Object.entries(qs.optionCounts).map(([option, count]) => {
                            const pct = qs.totalAnswers > 0 ? Math.round((count / qs.totalAnswers) * 100) : 0
                            return (
                              <div key={option} className="flex items-center gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between text-xs mb-0.5">
                                    <span className="text-slate-600 dark:text-slate-300 truncate">{option}</span>
                                    <span className="text-slate-400 dark:text-slate-500 ml-2 flex-shrink-0">{count} ({pct}%)</span>
                                  </div>
                                  <div className="h-1.5 bg-calm-100 dark:bg-slate-600 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary-500 dark:bg-primary-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {qs.average !== undefined && qs.distribution && (
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-primary-600 dark:text-primary-400">Average: {qs.average}/5</p>
                          <div className="flex items-end gap-1">
                            {Object.entries(qs.distribution).map(([rating, count]) => {
                              const pct = qs.totalAnswers > 0 ? Math.round((count / qs.totalAnswers) * 100) : 0
                              return (
                                <div key={rating} className="flex-1 text-center">
                                  <div className="h-12 flex items-end justify-center">
                                    <div
                                      className="w-full max-w-[24px] bg-primary-400 dark:bg-primary-500 rounded-t transition-all"
                                      style={{ height: `${Math.max(pct, 4)}%` }}
                                    />
                                  </div>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{rating}</p>
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500">{count}</p>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {qs.sampleAnswers && qs.sampleAnswers.length > 0 && (
                        <div className="space-y-1">
                          {qs.sampleAnswers.map((answer, idx) => (
                            <p key={idx} className="text-xs text-slate-600 dark:text-slate-300 bg-calm-50 dark:bg-slate-600/50 rounded px-2 py-1 italic line-clamp-2">
                              &ldquo;{answer}&rdquo;
                            </p>
                          ))}
                          {qs.totalAnswers > 5 && (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">+ {qs.totalAnswers - 5} more (export CSV for full list)</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

export default function SurveysReportPage() {
  const [surveyTotals, setSurveyTotals] = useState<SurveyTotals | null>(null)
  const [surveyReports, setSurveyReports] = useState<SurveyReport[]>([])
  const [surveyLoading, setSurveyLoading] = useState(true)
  const [expandedSurvey, setExpandedSurvey] = useState<string | null>(null)

  const fetchSurveyReport = useCallback(async () => {
    setSurveyLoading(true)
    try {
      const res = await fetch('/api/super-admin/surveys/reports')
      if (res.ok) {
        const d = await res.json()
        setSurveyTotals(d.totals)
        setSurveyReports(d.surveys)
      }
    } finally {
      setSurveyLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSurveyReport()
  }, [fetchSurveyReport])

  return (
    <div className="max-w-full space-y-6 animate-page-enter">
      <BackToReports />
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          Survey Reports
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Response rates and answer breakdowns across all surveys.
        </p>
      </div>

      {surveyLoading ? (
        <div className="text-center py-10 text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
          Loading survey reports...
        </div>
      ) : (
        <>
          {surveyTotals && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="card text-center">
                <ClipboardList className="h-5 w-5 text-primary-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{surveyTotals.totalSurveys}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Surveys</p>
              </div>
              <div className="card text-center">
                <span className="inline-block h-5 w-5 mx-auto mb-1 text-emerald-500 text-lg font-bold leading-5">P</span>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{surveyTotals.published}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Published</p>
              </div>
              <div className="card text-center">
                <span className="inline-block h-5 w-5 mx-auto mb-1 text-slate-400 text-lg font-bold leading-5">C</span>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{surveyTotals.closed}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Closed</p>
              </div>
              <div className="card text-center">
                <BarChart3 className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{surveyTotals.totalResponses}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Responses</p>
              </div>
            </div>
          )}

          <div className="card overflow-hidden p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-calm-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Survey Overview</h3>
              <button
                onClick={() => {
                  const rows = [['Survey', 'Status', 'Questions', 'Targeted', 'Responses', 'Response Rate', 'Created', 'Created By'].join(',')]
                  for (const s of surveyReports) {
                    rows.push([
                      escapeCsv(s.title),
                      s.status,
                      String(s.questionCount),
                      String(s.targetedCount),
                      String(s.responseCount),
                      `${s.responseRate}%`,
                      new Date(s.createdAt).toLocaleDateString('en-GB'),
                      escapeCsv(s.createdBy),
                    ].join(','))
                  }
                  downloadCsv('survey-overview.csv', rows.join('\n'))
                }}
                className="flex items-center gap-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
              >
                <FileDown className="h-3.5 w-3.5" />
                Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-calm-200 dark:border-slate-700 bg-calm-50 dark:bg-slate-800">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 w-8"></th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Survey</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Responses</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Rate</th>
                  </tr>
                </thead>
                <tbody className={surveyReports.length > 0 ? 'animate-stagger' : ''}>
                  {surveyReports.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                        <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        No surveys yet.
                      </td>
                    </tr>
                  ) : (
                    surveyReports.map((s) => (
                      <SurveyReportRow
                        key={s.id}
                        survey={s}
                        isExpanded={expandedSurvey === s.id}
                        onToggle={() => setExpandedSurvey(expandedSurvey === s.id ? null : s.id)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
