'use client'

import { useState } from 'react'
import { Sparkles, Download, Loader2, AlertCircle, Briefcase, ArrowRight, Shield, Star } from 'lucide-react'
import type { AdvisorReport } from '@/types'

interface Props {
  sessionId: string
  report: AdvisorReport | null
  onReportGenerated: (report: AdvisorReport) => void
}

export function ReportStep({ sessionId, report, onReportGenerated }: Props) {
  const [generating, setGenerating] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    try {
      const res = await fetch(`/api/careers-advisor/${sessionId}/generate`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to generate report')
      }
      const data = await res.json()
      onReportGenerated(data.report as AdvisorReport)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  async function handleDownloadPdf() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/careers-advisor/${sessionId}/pdf`)
      if (!res.ok) throw new Error('Failed to download PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'careers-report.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Failed to download PDF. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 space-y-6">
        <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
          <Sparkles className="w-10 h-10 text-primary-600 dark:text-primary-400" />
        </div>

        <div className="space-y-2 max-w-md">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Ready to generate your report
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            We&apos;ll use your answers to create a personalised careers report with suggestions tailored to you.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3 max-w-md">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 px-8 py-3 bg-primary-600 text-white rounded-xl font-medium text-sm hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating your report...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate my report
            </>
          )}
        </button>

        {generating && (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            This usually takes 10-20 seconds
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Your Careers Report
        </h2>
        <button
          onClick={handleDownloadPdf}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-calm-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-medium hover:bg-calm-50 dark:hover:bg-slate-600 transition-all disabled:opacity-50"
        >
          {downloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Download PDF
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Strengths */}
      <section className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-5 h-5 text-green-600 dark:text-green-400" />
          <h3 className="text-lg font-bold text-green-800 dark:text-green-300">Your Strengths</h3>
        </div>
        <p className="text-sm text-green-700 dark:text-green-300 leading-relaxed">
          {report.strengths}
        </p>
      </section>

      {/* Career Suggestions */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Suggested Career Areas</h3>
        </div>
        <div className="grid gap-3">
          {report.careers.map((career, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 border border-calm-200 dark:border-slate-700 rounded-xl p-5">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-1">{career.name}</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{career.explanation}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Next Steps */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <ArrowRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Next Steps</h3>
        </div>
        <ol className="space-y-2">
          {report.nextSteps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl px-4 py-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-bold">
                {i + 1}
              </span>
              <span className="text-sm text-blue-700 dark:text-blue-300">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Workplace Support */}
      <section className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-bold text-purple-800 dark:text-purple-300">Workplace Support</h3>
        </div>
        <p className="text-sm text-purple-700 dark:text-purple-300 leading-relaxed">
          {report.workplaceSupport}
        </p>
      </section>

      {/* Disclaimer */}
      <div className="bg-calm-50 dark:bg-slate-800 border border-calm-200 dark:border-slate-700 rounded-xl p-4">
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          This report is for guidance only and does not constitute professional careers advice. Share it with your careers professional to discuss next steps.
        </p>
      </div>
    </div>
  )
}
