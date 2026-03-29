'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart3, RefreshCw } from 'lucide-react'

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

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

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

      {/* Table */}
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
    </div>
  )
}
