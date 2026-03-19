'use client'

import { AlertTriangle, Brain, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { format } from 'date-fns'
import type { AiInsight } from '@/types'

interface InsightsPanelProps {
  insight: AiInsight | null
  loading: boolean
}

function Section({ title, content }: { title: string; content: string }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border border-calm-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-3 bg-calm-50 hover:bg-calm-100 transition-colors text-left"
      >
        <span className="font-semibold text-slate-900 text-sm">{title}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>
      {open && (
        <div className="px-4 py-3">
          <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{content}</p>
        </div>
      )}
    </div>
  )
}

export function InsightsPanel({ insight, loading }: InsightsPanelProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-primary-50 rounded-xl">
          <div className="w-8 h-8 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-primary-800">Generating AI insights...</p>
            <p className="text-xs text-primary-600">
              Analysing 4 weeks of observations with Gemini AI
            </p>
          </div>
        </div>
        <div className="space-y-2 animate-pulse">
          <div className="h-20 bg-calm-100 rounded-xl" />
          <div className="h-20 bg-calm-100 rounded-xl" />
          <div className="h-16 bg-calm-100 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!insight) {
    return (
      <div className="text-center py-10">
        <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Brain className="h-7 w-7 text-primary-500" />
        </div>
        <h3 className="font-semibold text-slate-900 mb-2">No insights generated yet</h3>
        <p className="text-sm text-slate-400 max-w-sm mx-auto">
          Once you&apos;ve logged observations, use the button above to generate an AI-powered
          pattern summary.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <CheckCircle className="h-4 w-4 text-sage-400" />
        <span>Generated {format(new Date(insight.generatedAt), "dd MMM yyyy 'at' HH:mm")}</span>
      </div>

      <Section title="Summary of Observations" content={insight.summary} />
      <Section title="Patterns Identified" content={insight.patterns} />
      <Section title="Recommended Next Steps" content={insight.recommendations} />

      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-800 leading-relaxed">{insight.disclaimer}</p>
      </div>
    </div>
  )
}
