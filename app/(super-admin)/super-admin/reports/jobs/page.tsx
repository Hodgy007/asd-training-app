'use client'

import { useState, useEffect, useCallback } from 'react'
import { Briefcase, RefreshCw } from 'lucide-react'
import { BackToReports } from '../_components/back-link'

interface JobStats {
  byStatus: Record<string, number>
  publishedLast30: number
  assignmentsTotal: number
  assignmentsLast30: number
}

interface ReportResponse {
  jobStats?: JobStats
}

export default function JobsReportPage() {
  const [jobStats, setJobStats] = useState<JobStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/reports')
      if (res.ok) {
        const json: ReportResponse = await res.json()
        if (json.jobStats) setJobStats(json.jobStats)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  return (
    <div className="max-w-full space-y-6 animate-page-enter">
      <BackToReports />
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          Job Openings
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
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
