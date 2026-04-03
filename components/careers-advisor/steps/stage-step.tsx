'use client'

import { AdvisorStepLayout } from '../advisor-step-layout'
import { PillSelector } from '../pill-selector'
import type { AdvisorAnswers } from '@/types'

const OPTIONS = [
  'Still at school',
  'College or sixth form',
  'University',
  'Looking for work',
  'In an internship or placement',
  'Currently employed',
  'Not sure',
]

interface Props {
  answers: AdvisorAnswers
  onUpdate: (partial: Partial<AdvisorAnswers>) => void
  totalSteps: number
}

export function StageStep({ answers, onUpdate, totalSteps }: Props) {
  return (
    <AdvisorStepLayout
      stepNumber={6}
      totalSteps={totalSteps}
      title="What stage are you at?"
      description="This helps us give advice that's right for where you are now."
    >
      <PillSelector
        options={OPTIONS}
        selected={answers.stage ? [answers.stage] : []}
        onChange={(selected) => onUpdate({ stage: selected[0] ?? '' })}
        singleSelect
      />
    </AdvisorStepLayout>
  )
}
