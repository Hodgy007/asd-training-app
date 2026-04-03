'use client'

import { Sparkles, ArrowRight } from 'lucide-react'

interface Props {
  onContinue: () => void
  onSkipToReport: () => void
}

export function OptionalIntroStep({ onContinue, onSkipToReport }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-8 space-y-6">
      <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-green-600 dark:text-green-400" />
      </div>

      <div className="space-y-2 max-w-lg">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          You&apos;ve answered enough for your report!
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Answer a few more questions below for even better suggestions, or skip straight to your results.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onContinue}
          className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-700 border-2 border-calm-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-medium text-sm hover:border-primary-300 dark:hover:border-primary-500 transition-all"
        >
          Answer more questions
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={onSkipToReport}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium text-sm hover:bg-primary-700 transition-all"
        >
          <Sparkles className="w-4 h-4" />
          Skip to my report
        </button>
      </div>
    </div>
  )
}
