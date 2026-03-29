'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart3, RefreshCw, ChevronDown, ChevronUp, Users } from 'lucide-react'

const MODULE_NAMES: Record<string, string> = {
  'module-1': 'Understanding ASD: An Introduction',
  'module-2': 'Social Communication',
  'module-3': 'Behaviour and Play',
  'module-4': 'Sensory Processing Differences',
  'module-5': 'Next Steps: Referrals & Support',
  'careers-module-1': 'Understanding Autism in Careers',
  'careers-module-2': 'Autism-Inclusive Careers Planning',
  'careers-module-3': 'Employer Engagement & Work Experience',
  'careers-module-4': 'Collaboration & Referral Pathways',
}

function getModuleLabel(moduleId: string): string {
  return MODULE_NAMES[moduleId] ?? moduleId
}

function getTrainingPlan(moduleId: string): string {
  return moduleId.startsWith('careers-') ? 'Careers CPD Training' : 'ASD Awareness Training'
}

interface ModuleStat {
  moduleId: string
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

interface ReportData {
  totalUsers: number
  modules: ModuleStat[]
  users: UserSummary[]
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
          <p className="font-medium text-slate-800 text-sm">{getModuleLabel(stat.moduleId)}</p>
          <p className="text-xs text-slate-400">{getTrainingPlan(stat.moduleId)}</p>
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
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/reports')
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
                    Loading report…
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
                    <td className="px-4 py-3 font-medium text-slate-800">{u.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{u.email ?? '—'}</td>
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
    </div>
  )
}
