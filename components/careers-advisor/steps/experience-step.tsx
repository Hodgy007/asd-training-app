'use client'

import { AdvisorStepLayout } from '../advisor-step-layout'
import type { AdvisorAnswers } from '@/types'

interface Props {
  answers: AdvisorAnswers
  onUpdate: (partial: Partial<AdvisorAnswers>) => void
  totalSteps: number
}

export function ExperienceStep({ answers, onUpdate, totalSteps }: Props) {
  return (
    <AdvisorStepLayout
      stepNumber={5}
      totalSteps={totalSteps}
      title="Do you have any experience — work, volunteering, or hobbies?"
      description="This could be a job, helping out at home, a school project, or something you do in your free time. It all counts."
    >
      <div className="space-y-3">
        <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl p-4">
          <p className="text-sm text-primary-700 dark:text-primary-300 font-medium mb-1">Example</p>
          <p className="text-sm text-primary-600 dark:text-primary-400 italic">
            &ldquo;I help my neighbour with their computer every week. At school I was part of the coding club and we built a website for a local charity.&rdquo;
          </p>
        </div>

        <textarea
          value={answers.experience ?? ''}
          onChange={(e) => onUpdate({ experience: e.target.value })}
          rows={4}
          placeholder="Tell us about any experience you have (optional)..."
          className="w-full px-4 py-3 border border-calm-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
        />

        <p className="text-xs text-slate-400 dark:text-slate-500">
          This is optional — skip it if you prefer.
        </p>
      </div>
    </AdvisorStepLayout>
  )
}
