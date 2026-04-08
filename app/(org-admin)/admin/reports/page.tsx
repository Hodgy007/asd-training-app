'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { BarChart3, RefreshCw, ChevronDown, ChevronUp, Users, FolderOpen, FileText, Download, ChevronRight, FileCheck } from 'lucide-react'
import { clsx } from 'clsx'

interface ModuleStat {
  moduleId: string
  moduleName: string
  programName: string
  completions: number
  totalUsers: number
  pct: number
}

interface UserSummary {
  id: string
  name: string | null
  email: string | null
  completedModules: string[]
  totalCompleted: number
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

interface ReportData {
  totalUsers: number
  modules: ModuleStat[]
  users: UserSummary[]
  cvStats?: CvStats
  advisorStats?: AdvisorStats
}

// Library report types
interface LibDocStat {
  id: string
  title: string
  fileName: string
  downloads: number
}

interface LibCollectionStat {
  id: string
  title: string
  documentCount: number
  totalDownloads: number
  documents: LibDocStat[]
}

interface LibTotals {
  totalCollections: number
  totalDocuments: number
  totalDownloads: number
}

function PctBar({ stat }: { stat: ModuleStat }) {
  if (stat.totalUsers === 0) {
    return <span className="text-slate-300 text-xs">No users</span>
  }
  const barColor =
    stat.pct >= 80
      ? 'bg-emerald-500'
      : stat.pct >= 40
      ? 'bg-amber-400'
      : 'bg-slate-300'

  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="flex-1 h-2 bg-calm-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${stat.pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-600 whitespace-nowrap w-20 text-right">
        {stat.completions}/{stat.totalUsers} ({stat.pct}%)
      </span>
    </div>
  )
}

function ModuleRow({
  stat,
  users,
}: {
  stat: ModuleStat
  users: UserSummary[]
}) {
  const [expanded, setExpanded] = useState(false)
  const completedUsers = users.filter((u) => u.completedModules.includes(stat.moduleId))

  return (
    <>
      <tr className="border-b border-calm-100 hover:bg-calm-50 transition-colors">
        <td className="px-4 py-3">
          <p className="font-medium text-slate-800 text-sm">{stat.moduleName}</p>
          <p className="text-xs text-slate-400">{stat.programName}</p>
        </td>
        <td className="px-4 py-3 w-64">
          <PctBar stat={stat} />
        </td>
        <td className="px-4 py-3 text-center">
          <button
            onClick={() => setExpanded((v) => !v)}
            disabled={stat.totalUsers === 0}
            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors"
          >
            {expanded ? (
              <><ChevronUp className="h-3.5 w-3.5" />Hide</>
            ) : (
              <><ChevronDown className="h-3.5 w-3.5" />Show who</>
            )}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-calm-100 bg-emerald-50/40">
          <td colSpan={3} className="px-6 py-3">
            {completedUsers.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No users have completed this module yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {completedUsers.map((u) => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full"
                  >
                    <Users className="h-3 w-3" />
                    {u.name ?? u.email ?? u.id}
                  </span>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

export default function OrgReportsPage() {
  const { data: session } = useSession()
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Library report state
  const [libTotals, setLibTotals] = useState<LibTotals | null>(null)
  const [libCollections, setLibCollections] = useState<LibCollectionStat[]>([])
  const [libLoading, setLibLoading] = useState(true)
  const [expandedLib, setExpandedLib] = useState<string | null>(null)

  // Parent org selector
  const [schools, setSchools] = useState<{id: string; name: string}[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState<string>('')
  const isParentOrg = session?.user?.isParentOrg ?? false

  useEffect(() => {
    if (isParentOrg) {
      fetch('/api/admin/schools').then(r => r.json()).then(data => setSchools(data.children ?? []))
    }
  }, [isParentOrg])

  const fetchReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const orgParam = selectedOrgId ? `?orgId=${selectedOrgId}` : '?orgId=all'
      const res = await fetch(`/api/admin/reports${orgParam}`)
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Failed to load report.')
        return
      }
      setData(await res.json())
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [selectedOrgId])

  const fetchLibraryReport = useCallback(async () => {
    setLibLoading(true)
    try {
      const orgParam = selectedOrgId ? `?orgId=${selectedOrgId}` : '?orgId=all'
      const res = await fetch(`/api/admin/library/reports${orgParam}`)
      if (res.ok) {
        const d = await res.json()
        setLibTotals(d.totals)
        setLibCollections(d.collections)
      }
    } finally {
      setLibLoading(false)
    }
  }, [selectedOrgId])

  useEffect(() => {
    fetchReport()
    fetchLibraryReport()
  }, [fetchReport, fetchLibraryReport])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-emerald-600" />
            Training Reports
          </h1>
          <p className="text-slate-500 mt-1">Module completion overview for your organisation.</p>
        </div>
        <button
          onClick={fetchReport}
          className="p-2 rounded-xl border border-calm-200 hover:bg-calm-50 transition-colors text-slate-500"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Org selector for parent orgs */}
      {isParentOrg && (
        <select
          value={selectedOrgId}
          onChange={(e) => setSelectedOrgId(e.target.value)}
          className="px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
        >
          <option value="">All Organisations</option>
          {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}

      {/* Summary cards */}
      {data && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="card text-center">
            <p className="text-3xl font-bold text-emerald-600">{data.totalUsers}</p>
            <p className="text-sm text-slate-500 mt-1">Total members</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-emerald-600">{data.modules.length}</p>
            <p className="text-sm text-slate-500 mt-1">Assigned modules</p>
          </div>
          <div className="card text-center col-span-2 sm:col-span-1">
            <p className="text-3xl font-bold text-emerald-600">
              {data.modules.length > 0
                ? Math.round(
                    data.modules.reduce((sum, m) => sum + m.pct, 0) / data.modules.length
                  )
                : 0}%
            </p>
            <p className="text-sm text-slate-500 mt-1">Avg. completion</p>
          </div>
        </div>
      )}

      {/* Module table */}
      <div className="card overflow-hidden p-0">
        <div className="px-4 py-3 border-b border-calm-200 bg-calm-50">
          <p className="text-sm font-semibold text-slate-600">Module Completion</p>
          <p className="text-xs text-slate-400 mt-0.5">Click &quot;Show who&quot; to see which members completed each module.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-calm-200 bg-calm-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Module</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Progress</th>
                <th className="px-4 py-3 font-semibold text-slate-600 text-center">Detail</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading report...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-red-500">
                    {error}
                  </td>
                </tr>
              ) : !data || data.modules.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center text-slate-400">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    {data?.totalUsers === 0
                      ? 'No members in this organisation yet.'
                      : 'No modules are assigned to this organisation.'}
                  </td>
                </tr>
              ) : (
                data.modules.map((stat) => (
                  <ModuleRow key={stat.moduleId} stat={stat} users={data.users} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-user summary */}
      {data && data.users.length > 0 && !loading && (
        <div className="card overflow-hidden p-0">
          <div className="px-4 py-3 border-b border-calm-200 bg-calm-50">
            <p className="text-sm font-semibold text-slate-600">Per-member Summary</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-calm-200 bg-calm-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Member</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden sm:table-cell">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Completed</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.id} className="border-b border-calm-100 hover:bg-calm-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{u.name ?? '\u2014'}</td>
                    <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{u.email ?? '\u2014'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                          u.totalCompleted === 0
                            ? 'bg-calm-100 text-slate-500'
                            : u.totalCompleted >= (data.modules.length ?? 1)
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {u.totalCompleted}/{data.modules.length} modules
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Document Library Reports ── */}
      <div className="pt-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          Document Library Reports
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Document downloads for your organisation.
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
                <FolderOpen className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
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
            <div className="px-4 py-3 border-b border-calm-200 dark:border-slate-700 bg-calm-50 dark:bg-slate-800">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Collection Activity</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Click a collection to see per-document stats.</p>
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
                <tbody>
                  {libCollections.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                        <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        No document collections available.
                      </td>
                    </tr>
                  ) : (
                    libCollections.map((col) => {
                      const isExpanded = expandedLib === col.id
                      return (
                        <OrgLibCollectionRow key={col.id} col={col} isExpanded={isExpanded} onToggle={() => setExpandedLib(isExpanded ? null : col.id)} />
                      )
                    })
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
          <FileCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          CV Builder Reports
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          CV creation activity for your organisation.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
          Loading CV reports...
        </div>
      ) : data?.cvStats ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card text-center">
              <FileCheck className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{data.cvStats.total}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total CVs</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{data.cvStats.byStatus['COMPLETE'] ?? 0}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Complete</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{data.cvStats.byStatus['DRAFT'] ?? 0}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Draft</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{data.cvStats.recentLast30Days}</p>
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
                const count = data.cvStats!.byTemplate[tmpl] ?? 0
                const pct = data.cvStats!.total > 0 ? Math.round((count / data.cvStats!.total) * 100) : 0
                return (
                  <div key={tmpl} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{tmpl.charAt(0) + tmpl.slice(1).toLowerCase()}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-calm-100 dark:bg-slate-600 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
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
          Careers advisor session activity for your organisation.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
          Loading advisor reports...
        </div>
      ) : data?.advisorStats ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card text-center">
            <BarChart3 className="h-5 w-5 text-indigo-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{data.advisorStats.total}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Sessions</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{data.advisorStats.byStatus['COMPLETE'] ?? 0}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Complete</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{data.advisorStats.byStatus['IN_PROGRESS'] ?? 0}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">In Progress</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{data.advisorStats.recentLast30Days}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Last 30 days</p>
          </div>
        </div>
      ) : (
        <div className="card text-center py-10 text-slate-400 dark:text-slate-500">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
          No careers advisor data available.
        </div>
      )}
    </div>
  )
}

function OrgLibCollectionRow({ col, isExpanded, onToggle }: { col: LibCollectionStat; isExpanded: boolean; onToggle: () => void }) {
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
          <td colSpan={4} className="px-6 py-4 bg-calm-50/50 dark:bg-slate-800/30">
            {col.documents.length > 0 ? (
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
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic">No documents in this collection.</p>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
