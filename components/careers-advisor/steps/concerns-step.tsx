'use client'

import { AdvisorStepLayout } from '../advisor-step-layout'
import { PillSelector } from '../pill-selector'
import type { AdvisorAnswers } from '@/types'

const OPTIONS = [
  'Job interviews', 'Meeting new people', 'Noisy environments',
  'Unexpected changes', 'Travelling to work', 'Phone calls',
  'Tight deadlines', 'Not sure what I want to do', 'Nothing specific',
]

interface Props {
  answers: AdvisorAnswers
  onUpdate: (partial: Partial<AdvisorAnswers>) => void
  totalSteps: number
}

export function ConcernsStep({ answers, onUpdate, totalSteps }: Props) {
  return (
    <AdvisorStepLayout
      stepNumber={4}
      totalSteps={totalSteps}
      title="Is there anything about work that worries you?"
      description="It's completely OK to have concerns. Knowing them helps us suggest the right support."
    >
      <PillSelector
        options={OPTIONS}
        selected={answers.concerns ?? []}
        onChange={(concerns) => onUpdate({ concerns })}
      />
      <div className="mt-4">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Anything else you&apos;d like to mention? (optional)
        </label>
        <textarea
          value={answers.concernsOther ?? ''}
          onChange={(e) => onUpdate({ concernsOther: e.target.value })}
          rows={2}
          placeholder="Type here if you want to..."
          className="w-full max-w-md px-4 py-2 border border-calm-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
        />
      </div>
    </AdvisorStepLayout>
  )
}
