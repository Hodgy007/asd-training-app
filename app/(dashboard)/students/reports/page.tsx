'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, BarChart3, Users, FileText, Compass, BookOpen, Loader2,
} from 'lucide-react'
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
  role: string
  totalCompleted: number
  completedModules: string[]
}

interface ReportData {
  totalStudents: number
  byRole: { STUDENT: number; INTERN: number; EMPLOYEE: number }
  modules: ModuleStat[]
  users: UserSummary[]
  cvStats: {
    total: number
    byStatus: Record<string, number>
    recentLast30Days: number
    byTemplate: Record<string, number>
  }
  advisorStats: {
    total: number
    byStatus: Record<string, number>
    recentLast30Days: number
  }
}

function PctBar({ pct, totalUsers }: { pct: number; totalUsers: number }) {
  if (totalUsers === 0) return <span className="text-slate-300 text-xs">No students</span>
  const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-400' : 'bg-slate-300'
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="flex-1 h-2 bg-calm-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={clsx('h-full transition-all', barColor)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-10 text-right">{pct}%</span>
    </div>
  )
}

export default function CdoReportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && session?.user?.role !== 'CAREER_DEV_OFFICER') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/careers/reports')
        if (!res.ok) {
          setError('Failed to load reports')
          return
        }
        setData(await res.json())
      } catch {
        setError('Failed to load reports')
      } finally {
        setLoading(false)
      }
    }
    if (status === 'authenticated') load()
  }, [status])

  if (status !== 'authenticated' || session?.user?.role !== 'CAREER_DEV_OFFICER') return null

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-page-enter">
      <div>
        <Link
          href="/students"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to students
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary-600" />
          Student Reports
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Training progress, CVs, and Careers Advisor activity for your students.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
        </div>
      ) : error ? (
        <div className="card text-center py-16">
          <p className="text-red-500">{error}</p>
        </div>
      ) : data ? (
        <>
          {/* Summary stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Students" value={data.totalStudents} sublabel={`${data.byRole.STUDENT} · ${data.byRole.INTERN} · ${data.byRole.EMPLOYEE}`} sublabelHint="Student · Intern · Employee" />
            <StatCard icon={BookOpen} label="Modules tracked" value={data.modules.length} />
            <StatCard icon={FileText} label="CVs" value={data.cvStats.total} sublabel={`+${data.cvStats.recentLast30Days} in last 30 days`} />
            <StatCard icon={Compass} label="Advisor sessions" value={data.advisorStats.total} sublabel={`+${data.advisorStats.recentLast30Days} in last 30 days`} />
          </div>

          {/* Module progress */}
          <section className="card">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary-600" />
              Training module completion
            </h2>
            {data.modules.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No modules available for this organisation.</p>
            ) : (
              <div className="space-y-4">
                {data.modules.map((m) => (
                  <div key={m.moduleId}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <div>
                        <span className="font-medium text-slate-900 dark:text-slate-100">{m.moduleName}</span>
                        <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">{m.programName}</span>
                      </div>
                      <span className="text-slate-500 dark:text-slate-400">
                        {m.completions} / {m.totalUsers}
                      </span>
                    </div>
                    <PctBar pct={m.pct} totalUsers={m.totalUsers} />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* CV + Advisor stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="card">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary-600" />
                CV Builder
              </h2>
              <dl className="space-y-2 text-sm">
                <Row label="Total CVs" value={data.cvStats.total} />
                <Row label="Last 30 days" value={data.cvStats.recentLast30Days} />
                {Object.entries(data.cvStats.byStatus).map(([k, v]) => (
                  <Row key={k} label={`Status: ${k}`} value={v} />
                ))}
                {Object.entries(data.cvStats.byTemplate).map(([k, v]) => (
                  <Row key={k} label={`Template: ${k}`} value={v} />
                ))}
              </dl>
            </section>

            <section className="card">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Compass className="h-5 w-5 text-primary-600" />
                Careers Advisor
              </h2>
              <dl className="space-y-2 text-sm">
                <Row label="Total sessions" value={data.advisorStats.total} />
                <Row label="Last 30 days" value={data.advisorStats.recentLast30Days} />
                {Object.entries(data.advisorStats.byStatus).map(([k, v]) => (
                  <Row key={k} label={`Status: ${k}`} value={v} />
                ))}
              </dl>
            </section>
          </div>

          {/* Per-student rollup */}
          <section className="card overflow-hidden p-0">
            <div className="px-6 py-4 border-b border-calm-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Per-student training</h2>
            </div>
            {data.users.length === 0 ? (
              <p className="px-6 py-6 text-sm text-slate-500 dark:text-slate-400">No students yet.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-calm-200 dark:border-slate-700">
                    <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-6 py-3">Name</th>
                    <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-6 py-3 hidden sm:table-cell">Email</th>
                    <th className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-6 py-3">Role</th>
                    <th className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-6 py-3">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-calm-100 dark:divide-slate-700/50">
                  {data.users.map((u) => (
                    <tr key={u.id} className="hover:bg-calm-50 dark:hover:bg-slate-800/50">
                      <td className="px-6 py-3 font-medium text-slate-900 dark:text-slate-100">{u.name || 'Unnamed'}</td>
                      <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400 hidden sm:table-cell">{u.email}</td>
                      <td className="px-6 py-3 text-center text-xs text-slate-600 dark:text-slate-300">{u.role}</td>
                      <td className="px-6 py-3 text-center text-sm font-semibold text-slate-700 dark:text-slate-200">{u.totalCompleted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}

function StatCard({
  icon: Icon, label, value, sublabel, sublabelHint,
}: {
  icon: React.ElementType
  label: string
  value: number
  sublabel?: string
  sublabelHint?: string
}) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      {sublabel && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1" title={sublabelHint}>
          {sublabel}
        </p>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="font-semibold text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  )
}
