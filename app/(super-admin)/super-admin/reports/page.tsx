'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart3, RefreshCw, FolderOpen, FileText, Eye, Download, ChevronDown, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'

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
}

interface ReportResponse {
  report: OrgReport[]
  moduleMeta: ModuleMeta[]
}

// Library report types
interface LibDocStat {
  id: string
  title: string
  fileName: string
  views: number
  downloads: number
}

interface LibOrgBreakdown {
  orgName: string
  views: number
  downloads: number
}

interface LibCollectionStat {
  id: string
  title: string
  active: boolean
  documentCount: number
  totalViews: number
  totalDownloads: number
  orgBreakdown: LibOrgBreakdown[]
  documents: LibDocStat[]
}

interface LibTotals {
  totalCollections: number
  activeCollections: number
  totalDocuments: number
  totalViews: number
  totalDownloads: number
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

  // Library report state
  const [libTotals, setLibTotals] = useState<LibTotals | null>(null)
  const [libCollections, setLibCollections] = useState<LibCollectionStat[]>([])
  const [libLoading, setLibLoading] = useState(true)
  const [expandedLib, setExpandedLib] = useState<string | null>(null)

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

  useEffect(() => {
    fetchReport()
    fetchLibraryReport()
  }, [fetchReport, fetchLibraryReport])

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
    <div className="max-w-full space-y-6">
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
            <tbody>
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

      {/* ── Document Library Reports ── */}
      <div className="pt-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          Document Library Reports
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Views and downloads across all document collections.
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <Eye className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{libTotals.totalViews}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Views</p>
              </div>
              <div className="card text-center">
                <Download className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{libTotals.totalDownloads}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Downloads</p>
              </div>
            </div>
          )}

          {/* Library collections table */}
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-calm-200 dark:border-slate-700 bg-calm-50 dark:bg-slate-800">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 w-8"></th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Collection</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Docs</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Views</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Downloads</th>
                  </tr>
                </thead>
                <tbody>
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
    </div>
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
          <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
            <Eye className="h-3.5 w-3.5" /> {col.totalViews}
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
          <td colSpan={5} className="px-6 py-4 bg-calm-50/50 dark:bg-slate-800/30 space-y-3">
            {col.orgBreakdown && col.orgBreakdown.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">By Organisation</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {col.orgBreakdown.map((ob, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white dark:bg-slate-700 rounded-lg px-3 py-2 border border-calm-200 dark:border-slate-600">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate mr-3">{ob.orgName}</span>
                      <div className="flex items-center gap-3 text-xs flex-shrink-0">
                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400"><Eye className="h-3 w-3" /> {ob.views}</span>
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><Download className="h-3 w-3" /> {ob.downloads}</span>
                      </div>
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
                      <div className="flex items-center gap-3 text-xs flex-shrink-0">
                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400"><Eye className="h-3 w-3" /> {doc.views}</span>
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><Download className="h-3 w-3" /> {doc.downloads}</span>
                      </div>
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
