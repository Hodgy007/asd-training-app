'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileCheck, RefreshCw } from 'lucide-react'
import { BackToReports } from '../_components/back-link'

interface CvStats {
  total: number
  byStatus: Record<string, number>
  recentLast30Days: number
  byTemplate: Record<string, number>
}

interface ReportResponse {
  cvStats?: CvStats
}

export default function CvBuilderReportPage() {
  const [cvStats, setCvStats] = useState<CvStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/reports')
      if (res.ok) {
        const json: ReportResponse = await res.json()
        if (json.cvStats) setCvStats(json.cvStats)
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
          <FileCheck className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          CV Builder Reports
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
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
    </div>
  )
}
