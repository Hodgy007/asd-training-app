'use client'

import { useState, useEffect, useCallback } from 'react'
import { Target, RefreshCw, FileDown } from 'lucide-react'
import { clsx } from 'clsx'
import { GATSBY_BENCHMARK_CODES, GATSBY_BENCHMARKS } from '@/lib/gatsby-benchmarks'
import { downloadCsv, escapeCsv } from '../_lib/csv'
import { BackToReports } from '../_components/back-link'

interface ModuleMeta {
  id: string
  title: string
  programId: string
  programName: string
  gatsbyBenchmarks?: string[]
}

interface ReportResponse {
  moduleMeta: ModuleMeta[]
}

export default function GatsbyReportPage() {
  const [moduleMeta, setModuleMeta] = useState<ModuleMeta[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/reports')
      if (res.ok) {
        const json: ReportResponse = await res.json()
        setModuleMeta(json.moduleMeta)
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
          <Target className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          Gatsby Benchmark Coverage
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
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
        {loading ? (
          <div className="text-center py-10 text-slate-400">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
            Loading...
          </div>
        ) : (
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
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{GATSBY_BENCHMARKS[code].full}</td>
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
        )}
      </div>
    </div>
  )
}
