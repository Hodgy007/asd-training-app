'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart3, RefreshCw } from 'lucide-react'
import { ASD_MODULE_IDS, CAREERS_MODULE_IDS } from '@/lib/modules'

interface ModuleStat {
  moduleId: string
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

// Short labels for table column headers
const SHORT_LABELS: Record<string, string> = {
  'module-1': 'M1',
  'module-2': 'M2',
  'module-3': 'M3',
  'module-4': 'M4',
  'module-5': 'M5',
  'careers-module-1': 'C1',
  'careers-module-2': 'C2',
  'careers-module-3': 'C3',
  'careers-module-4': 'C4',
}

const ALL_MODULE_IDS = [...ASD_MODULE_IDS, ...CAREERS_MODULE_IDS]

function PctCell({ stat }: { stat: ModuleStat }) {
  if (stat.totalUsers === 0) {
    return <span className="text-slate-300">—</span>
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
      setData(await res.json())
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

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
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="font-semibold text-slate-600">Module columns:</span>
        <span className="font-semibold text-slate-600 mt-1 mr-1">ASD:</span>
        {ASD_MODULE_IDS.map((id) => (
          <span key={id}>
            <span className="font-mono font-semibold text-purple-700">{SHORT_LABELS[id]}</span>
            {' = '}
            {id}
          </span>
        ))}
        <span className="font-semibold text-slate-600 mt-1 mr-1">Careers:</span>
        {CAREERS_MODULE_IDS.map((id) => (
          <span key={id}>
            <span className="font-mono font-semibold text-emerald-700">{SHORT_LABELS[id]}</span>
            {' = '}
            {id}
          </span>
        ))}
      </div>

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
                {/* ASD module columns */}
                {ASD_MODULE_IDS.map((id) => (
                  <th
                    key={id}
                    className="px-3 py-3 font-semibold text-purple-700 text-center whitespace-nowrap"
                    title={id}
                  >
                    {SHORT_LABELS[id]}
                  </th>
                ))}
                {/* Careers module columns */}
                {CAREERS_MODULE_IDS.map((id) => (
                  <th
                    key={id}
                    className="px-3 py-3 font-semibold text-emerald-700 text-center whitespace-nowrap"
                    title={id}
                  >
                    {SHORT_LABELS[id]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={2 + ALL_MODULE_IDS.length}
                    className="px-4 py-12 text-center text-slate-400"
                  >
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading report…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={2 + ALL_MODULE_IDS.length}
                    className="px-4 py-10 text-center text-red-500"
                  >
                    {error}
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={2 + ALL_MODULE_IDS.length}
                    className="px-4 py-12 text-center text-slate-400"
                  >
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No data — no organisations exist yet.
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
                    {ALL_MODULE_IDS.map((moduleId) => {
                      const stat = org.modules.find((m) => m.moduleId === moduleId)
                      return (
                        <td key={moduleId} className="px-3 py-3 text-center">
                          {stat ? (
                            <PctCell stat={stat} />
                          ) : (
                            <span className="text-slate-300">—</span>
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
