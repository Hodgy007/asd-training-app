'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart3, RefreshCw } from 'lucide-react'
import { BackToReports } from '../_components/back-link'

interface AdvisorStats {
  total: number
  byStatus: Record<string, number>
  recentLast30Days: number
}

interface ReportResponse {
  advisorStats?: AdvisorStats
}

export default function CareersAdvisorReportPage() {
  const [advisorStats, setAdvisorStats] = useState<AdvisorStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/reports')
      if (res.ok) {
        const json: ReportResponse = await res.json()
        if (json.advisorStats) setAdvisorStats(json.advisorStats)
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
          <BarChart3 className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          Careers Advisor Reports
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
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
            <BarChart3 className="h-5 w-5 text-primary-500 mx-auto mb-1" />
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
    </div>
  )
}
