'use client'

import { AdvisorStepLayout } from '../advisor-step-layout'
import type { AdvisorAnswers } from '@/types'

interface Props {
  answers: AdvisorAnswers
  onUpdate: (partial: Partial<AdvisorAnswers>) => void
  totalSteps: number
}

export function OtherStep({ answers, onUpdate, totalSteps }: Props) {
  return (
    <AdvisorStepLayout
      stepNumber={10}
      totalSteps={totalSteps}
      title="Is there anything else you'd like us to know?"
      description="Anything at all — a dream job, something you've been thinking about, or something that's been on your mind."
    >
      <div className="space-y-3">
        <textarea
          value={answers.other ?? ''}
          onChange={(e) => onUpdate({ other: e.target.value })}
          rows={4}
          placeholder="Type here if you want to (optional)..."
          className="w-full px-4 py-3 border border-calm-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
        />

        <p className="text-xs text-slate-400 dark:text-slate-500">
          This is completely optional — you can skip this if you prefer.
        </p>
      </div>
    </AdvisorStepLayout>
  )
}
