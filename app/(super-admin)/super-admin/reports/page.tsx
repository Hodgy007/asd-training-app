'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart3, RefreshCw, FolderOpen, FileText, Download, ChevronDown, ChevronRight, ClipboardList, FileDown, FileCheck, Target, Briefcase } from 'lucide-react'
import { clsx } from 'clsx'
import { getRoleLabel } from '@/lib/rbac'
import { GATSBY_BENCHMARK_CODES, GATSBY_BENCHMARKS } from '@/lib/gatsby-benchmarks'

interface ModuleStat {
  moduleId: string
  moduleName: string
  programName: string
  completions: number
  totalUsers: number
  pct: number
}

interface OrgReport {
  orgId: string
  orgName: string
  orgSlug: string
  totalUsers: number
  modules: ModuleStat[]
}

interface ModuleMeta {
  id: string
  title: string
  programId: string
  programName: string
  gatsbyBenchmarks?: string[]
}

interface CvStats {
  total: number
  byStatus: Record<string, number>
  recentLast30Days: number
  byTemplate: Record<string, number>
}

interface AdvisorStats {
  total: number
  byStatus: Record<string, number>
  recentLast30Days: number
}

interface JobStats {
  byStatus: Record<string, number>
  publishedLast30: number
  assignmentsTotal: number
  assignmentsLast30: number
}

interface ReportResponse {
  report: OrgReport[]
  moduleMeta: ModuleMeta[]
  cvStats?: CvStats
  advisorStats?: AdvisorStats
  jobStats?: JobStats
}

// Library report types
interface LibDocStat {
  id: string
  title: string
  fileName: string
  downloads: number
}

interface LibOrgBreakdown {
  orgName: string
  downloads: number
}

interface LibCollectionStat {
  id: string
  title: string
  active: boolean
  documentCount: number
  totalDownloads: number
  orgBreakdown: LibOrgBreakdown[]
  documents: LibDocStat[]
}

interface LibTotals {
  totalCollections: number
  activeCollections: number
  totalDocuments: number
  totalDownloads: number
}

// Survey report types
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

function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function PctCell({ stat }: { stat: ModuleStat }) {
  if (stat.totalUsers === 0) {
    return <span className="text-slate-300">&mdash;</span>
  }
  const color =
    stat.pct >= 80
      ? 'text-emerald-700 bg-emerald-50'
      : stat.pct >= 40
      ? 'text-amber-700 bg-amber-50'
      : 'text-slate-500 bg-calm-50'
  return (
    <span className={`inline-block text-xs font-medium px-1.5 py-0.5 rounded ${color}`}>
      {stat.completions}/{stat.totalUsers}
      <span className="ml-1 opacity-70">({stat.pct}%)</span>
    </span>
  )
}

export default function SuperAdminReportsPage() {
  const [data, setData] = useState<OrgReport[]>([])
  const [moduleMeta, setModuleMeta] = useState<ModuleMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cvStats, setCvStats] = useState<CvStats | null>(null)
  const [advisorStats, setAdvisorStats] = useState<AdvisorStats | null>(null)
  const [jobStats, setJobStats] = useState<JobStats | null>(null)

  // Library report state
  const [libTotals, setLibTotals] = useState<LibTotals | null>(null)
  const [libCollections, setLibCollections] = useState<LibCollectionStat[]>([])
  const [libLoading, setLibLoading] = useState(true)
  const [expandedLib, setExpandedLib] = useState<string | null>(null)

  // Survey report state
  const [surveyTotals, setSurveyTotals] = useState<SurveyTotals | null>(null)
  const [surveyReports, setSurveyReports] = useState<SurveyReport[]>([])
  const [surveyLoading, setSurveyLoading] = useState(true)
  const [expandedSurvey, setExpandedSurvey] = useState<string | null>(null)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/super-admin/reports')
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Failed to load report.')
        return
      }
      const json: ReportResponse = await res.json()
      setData(json.report)
      setModuleMeta(json.moduleMeta)
      if (json.cvStats) setCvStats(json.cvStats)
      if (json.advisorStats) setAdvisorStats(json.advisorStats)
      if (json.jobStats) setJobStats(json.jobStats)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchLibraryReport = useCallback(async () => {
    setLibLoading(true)
    try {
      const res = await fetch('/api/super-admin/library/reports')
      if (res.ok) {
        const d = await res.json()
        setLibTotals(d.totals)
        setLibCollections(d.collections)
      }
    } finally {
      setLibLoading(false)
    }
  }, [])

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
    fetchReport()
    fetchLibraryReport()
    fetchSurveyReport()
  }, [fetchReport, fetchLibraryReport, fetchSurveyReport])

  // Group modules by program for the legend and column headers
  const programGroups = moduleMeta.reduce<Record<string, ModuleMeta[]>>((acc, m) => {
    if (!acc[m.programId]) acc[m.programId] = []
    acc[m.programId].push(m)
    return acc
  }, {})

  // Create short labels like P1-M1, P1-M2, P2-M1 etc.
  const shortLabels = new Map<string, string>()
  Object.entries(programGroups).forEach(([, modules], pIdx) => {
    modules.forEach((m, mIdx) => {
      shortLabels.set(m.id, `P${pIdx + 1}-M${mIdx + 1}`)
    })
  })

  const allModuleIds = moduleMeta.map((m) => m.id)

  return (
    <div className="max-w-full space-y-6 animate-page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-purple-600" />
            Training Reports
          </h1>
          <p className="text-slate-500 mt-1">Cross-organisation module completion overview.</p>
        </div>
        <button
          onClick={fetchReport}
          className="p-2 rounded-xl border border-calm-200 hover:bg-calm-50 transition-colors text-slate-500"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Legend */}
      {moduleMeta.length > 0 && !loading && (
        <div className="flex flex-wrap items-start gap-4 text-xs text-slate-500">
          <span className="font-semibold text-slate-600">Module columns:</span>
          {Object.entries(programGroups).map(([programId, modules]) => (
            <div key={programId} className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-600">{modules[0]?.programName}:</span>
              {modules.map((m) => (
                <span key={m.id}>
                  <span className="font-mono font-semibold text-purple-700">{shortLabels.get(m.id)}</span>
                  {' = '}
                  {m.title}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Training Table */}
      <div className="card overflow-hidden p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-calm-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Training Completion by Organisation</h3>
          <button
            onClick={() => {
              const headers = ['Organisation', 'Slug', 'Users', ...moduleMeta.map((m) => escapeCsv(m.title))]
              const rows = [headers.join(',')]
              for (const org of data) {
                const row = [escapeCsv(org.orgName), org.orgSlug, String(org.totalUsers)]
                for (const m of moduleMeta) {
                  const stat = org.modules.find((mod) => mod.moduleId === m.id)
                  row.push(stat ? `${stat.completions}/${stat.totalUsers} (${stat.pct}%)` : '-')
                }
                rows.push(row.join(','))
              }
              downloadCsv('training-report.csv', rows.join('\n'))
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
              <tr className="border-b border-calm-200 bg-calm-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">
                  Organisation
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">
                  Users
                </th>
                {allModuleIds.map((id) => (
                  <th
                    key={id}
                    className="px-3 py-3 font-semibold text-purple-700 text-center whitespace-nowrap"
                    title={moduleMeta.find((m) => m.id === id)?.title ?? id}
                  >
                    {shortLabels.get(id) ?? id}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={!loading && !error && data.length > 0 ? 'animate-stagger' : ''}>
              {loading ? (
                <tr>
                  <td
                    colSpan={2 + allModuleIds.length}
                    className="px-4 py-12 text-center text-slate-400"
                  >
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading report...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={2 + allModuleIds.length}
                    className="px-4 py-10 text-center text-red-500"
                  >
                    {error}
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={2 + allModuleIds.length}
                    className="px-4 py-12 text-center text-slate-400"
                  >
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No data &mdash; no organisations exist yet.
                  </td>
                </tr>
              ) : (
                data.map((org) => (
                  <tr
                    key={org.orgId}
                    className="border-b border-calm-100 hover:bg-calm-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{org.orgName}</p>
                      <p className="text-xs text-slate-400 font-mono">{org.orgSlug}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{org.totalUsers}</td>
                    {allModuleIds.map((moduleId) => {
                      const stat = org.modules.find((m) => m.moduleId === moduleId)
                      return (
                        <td key={moduleId} className="px-3 py-3 text-center">
                          {stat ? (
                            <PctCell stat={stat} />
                          ) : (
                            <span className="text-slate-300">&mdash;</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Gatsby Benchmark Coverage ── */}
      <div className="pt-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          Gatsby Benchmark Coverage
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Which training modules cover each of the 8 Gatsby Benchmarks. Use the CSV export for CEC Compass+ alignment uploads.
        </p>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-calm-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Coverage by Benchmark</h3>
          <button
            onClick={() => {
              const headers = ['benchmark_code', 'benchmark_name', 'module_id', 'module_title', 'program_name']
              const rows = [headers.join(',')]
              for (const code of GATSBY_BENCHMARK_CODES) {
                const matching = moduleMeta.filter((m) => m.gatsbyBenchmarks?.includes(code))
                if (matching.length === 0) {
                  rows.push([code, escapeCsv(GATSBY_BENCHMARKS[code].full), '', '', ''].join(','))
                  continue
                }
                for (const m of matching) {
                  rows.push([
                    code,
                    escapeCsv(GATSBY_BENCHMARKS[code].full),
                    escapeCsv(m.id),
                    escapeCsv(m.title),
                    escapeCsv(m.programName),
                  ].join(','))
                }
              }
              downloadCsv('gatsby-benchmark-coverage.csv', rows.join('\n'))
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
              <tr className="border-b border-calm-200 bg-calm-50 dark:bg-slate-800/50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap w-20">Code</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Benchmark</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 whitespace-nowrap w-24">Modules</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Covered by</th>
              </tr>
            </thead>
            <tbody>
              {GATSBY_BENCHMARK_CODES.map((code) => {
                const matching = moduleMeta.filter((m) => m.gatsbyBenchmarks?.includes(code))
                return (
                  <tr key={code} className="border-b border-calm-100 dark:border-slate-700/50">
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-primary-700 dark:text-primary-400">{code}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {GATSBY_BENCHMARKS[code].full}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={clsx(
                          'inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-bold',
                          matching.length === 0
                            ? 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'
                            : 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                        )}
                      >
                        {matching.length}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {matching.length === 0 ? (
                        <span className="italic">No modules tagged</span>
                      ) : (
                        matching.map((m) => m.title).join(', ')
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Document Library Reports ── */}
      <div className="pt-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          Document Library Reports
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Downloads across all document collections.
        </p>
      </div>

      {libLoading ? (
        <div className="text-center py-10 text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
          Loading library reports...
        </div>
      ) : (
        <>
          {/* Library summary cards */}
          {libTotals && (
            <div className="grid grid-cols-3 gap-4">
              <div className="card text-center">
                <FolderOpen className="h-5 w-5 text-primary-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{libTotals.totalCollections}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Collections</p>
              </div>
              <div className="card text-center">
                <FileText className="h-5 w-5 text-slate-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{libTotals.totalDocuments}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Documents</p>
              </div>
              <div className="card text-center">
                <Download className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{libTotals.totalDownloads}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Downloads</p>
              </div>
            </div>
          )}

          {/* Library collections table */}
          <div className="card overflow-hidden p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-calm-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Collections &amp; Downloads</h3>
              <button
                onClick={() => {
                  const rows = ['Collection,Documents,Total Downloads,Org Breakdown']
                  for (const col of libCollections) {
                    const orgBd = col.orgBreakdown.map((o) => `${o.orgName}: ${o.downloads}`).join('; ')
                    rows.push([escapeCsv(col.title), String(col.documentCount), String(col.totalDownloads), escapeCsv(orgBd)].join(','))
                  }
                  downloadCsv('library-report.csv', rows.join('\n'))
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
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Collection</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Docs</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Downloads</th>
                  </tr>
                </thead>
                <tbody className={libCollections.length > 0 ? 'animate-stagger' : ''}>
                  {libCollections.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                        <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        No document collections yet.
                      </td>
                    </tr>
                  ) : (
                    libCollections.map((col) => {
                      const isExpanded = expandedLib === col.id
                      return (
                        <LibCollectionRow key={col.id} col={col} isExpanded={isExpanded} onToggle={() => setExpandedLib(isExpanded ? null : col.id)} />
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Survey Reports ── */}
      <div className="pt-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          Survey Reports
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
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
          {/* Survey summary cards */}
          {surveyTotals && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="card text-center">
                <ClipboardList className="h-5 w-5 text-purple-500 mx-auto mb-1" />
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

          {/* Survey overview table */}
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

      {/* ── CV Builder Reports ── */}
      <div className="pt-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          CV Builder Reports
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          CV creation activity across all users.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
          Loading CV reports...
        </div>
      ) : cvStats ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card text-center">
              <FileCheck className="h-5 w-5 text-primary-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{cvStats.total}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total CVs</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{cvStats.byStatus['COMPLETE'] ?? 0}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Complete</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{cvStats.byStatus['DRAFT'] ?? 0}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Draft</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{cvStats.recentLast30Days}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Last 30 days</p>
            </div>
          </div>

          {/* Template breakdown */}
          <div className="card overflow-hidden p-0">
            <div className="px-4 py-3 border-b border-calm-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">CVs by Template</h3>
            </div>
            <div className="divide-y divide-calm-100 dark:divide-slate-700">
              {['ACCESSIBLE', 'MODERN', 'CLASSIC'].map((tmpl) => {
                const count = cvStats.byTemplate[tmpl] ?? 0
                const pct = cvStats.total > 0 ? Math.round((count / cvStats.total) * 100) : 0
                return (
                  <div key={tmpl} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{tmpl.charAt(0) + tmpl.slice(1).toLowerCase()}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-calm-100 dark:bg-slate-600 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 w-16 text-right">{count} ({pct}%)</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="card text-center py-10 text-slate-400 dark:text-slate-500">
          <FileCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />
          No CV data available.
        </div>
      )}

      {/* ── Careers Advisor Reports ── */}
      <div className="pt-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          Careers Advisor Reports
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Careers advisor session activity across all users.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
          Loading advisor reports...
        </div>
      ) : advisorStats ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card text-center">
            <BarChart3 className="h-5 w-5 text-indigo-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{advisorStats.total}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Sessions</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{advisorStats.byStatus['COMPLETE'] ?? 0}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Complete</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{advisorStats.byStatus['IN_PROGRESS'] ?? 0}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">In Progress</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{advisorStats.recentLast30Days}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Last 30 days</p>
          </div>
        </div>
      ) : (
        <div className="card text-center py-10 text-slate-400 dark:text-slate-500">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
          No careers advisor data available.
        </div>
      )}

      {/* ── Job Openings Reports ── */}
      <div className="pt-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          Job Openings
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Published jobs and learner assignments across the platform.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
          Loading job reports...
        </div>
      ) : jobStats ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card text-center">
              <Briefcase className="h-5 w-5 text-primary-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{jobStats.publishedLast30}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Published (last 30 days)</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{jobStats.assignmentsTotal}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total assignments</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{jobStats.assignmentsLast30}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Assignments (last 30 days)</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {(jobStats.byStatus['PUBLISHED'] ?? 0) + (jobStats.byStatus['DRAFT'] ?? 0) + (jobStats.byStatus['CLOSED'] ?? 0) + (jobStats.byStatus['ARCHIVED'] ?? 0)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total jobs</p>
            </div>
          </div>

          <div className="card overflow-hidden p-0">
            <div className="px-4 py-3 border-b border-calm-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Jobs by Status</h3>
            </div>
            <div className="divide-y divide-calm-100 dark:divide-slate-700">
              {['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'].map((status) => {
                const count = jobStats.byStatus[status] ?? 0
                const total = Object.values(jobStats.byStatus).reduce((a, b) => a + b, 0)
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                return (
                  <div key={status} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{status.charAt(0) + status.slice(1).toLowerCase()}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-calm-100 dark:bg-slate-600 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 w-16 text-right">{count} ({pct}%)</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="card text-center py-10 text-slate-400 dark:text-slate-500">
          <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-30" />
          No job openings data available.
        </div>
      )}

    </div>
  )
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
            {/* Export buttons */}
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
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
              >
                <FileDown className="h-3.5 w-3.5" />
                Export Question Stats CSV
              </button>
            </div>

            {/* Org breakdown */}
            {survey.orgBreakdown.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Responses by Organisation</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {survey.orgBreakdown.map((ob, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white dark:bg-slate-700 rounded-lg px-3 py-2 border border-calm-200 dark:border-slate-600">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate mr-3">{ob.orgName}</span>
                      <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 flex-shrink-0">{ob.responses}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Question breakdown */}
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
                                    <div className="h-full bg-purple-500 dark:bg-purple-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {qs.average !== undefined && qs.distribution && (
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">Average: {qs.average}/5</p>
                          <div className="flex items-end gap-1">
                            {Object.entries(qs.distribution).map(([rating, count]) => {
                              const pct = qs.totalAnswers > 0 ? Math.round((count / qs.totalAnswers) * 100) : 0
                              return (
                                <div key={rating} className="flex-1 text-center">
                                  <div className="h-12 flex items-end justify-center">
                                    <div
                                      className="w-full max-w-[24px] bg-purple-400 dark:bg-purple-500 rounded-t transition-all"
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

function LibCollectionRow({ col, isExpanded, onToggle }: { col: LibCollectionStat; isExpanded: boolean; onToggle: () => void }) {
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
        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{col.title}</td>
        <td className="px-4 py-3 text-center">
          <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 font-semibold">
            <FileText className="h-3.5 w-3.5" /> {col.documentCount}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
            <Download className="h-3.5 w-3.5" /> {col.totalDownloads}
          </span>
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-b border-calm-100 dark:border-slate-700">
          <td colSpan={4} className="px-6 py-4 bg-calm-50/50 dark:bg-slate-800/30 space-y-3">
            {col.orgBreakdown && col.orgBreakdown.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">By Organisation</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {col.orgBreakdown.map((ob, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white dark:bg-slate-700 rounded-lg px-3 py-2 border border-calm-200 dark:border-slate-600">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate mr-3">{ob.orgName}</span>
                      <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                        <Download className="h-3 w-3" /> {ob.downloads}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {col.documents.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Documents</p>
                <div className="space-y-1">
                  {col.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 bg-white dark:bg-slate-700 rounded-lg px-3 py-2 border border-calm-200 dark:border-slate-600">
                      <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{doc.title}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{doc.fileName}</p>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                        <Download className="h-3 w-3" /> {doc.downloads}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic">No documents in this collection.</p>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
