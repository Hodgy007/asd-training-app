'use client'

import { AdvisorStepLayout } from '../advisor-step-layout'
import { PillSelector } from '../pill-selector'
import type { AdvisorAnswers } from '@/types'

const OPTIONS = [
  'Helping others', 'Good pay', 'Learning new things',
  'Making things', 'Being creative', 'Working with a purpose',
  'Stability and routine', 'Independence', 'Being part of a team',
]

interface Props {
  answers: AdvisorAnswers
  onUpdate: (partial: Partial<AdvisorAnswers>) => void
  totalSteps: number
}

export function ValuesStep({ answers, onUpdate, totalSteps }: Props) {
  return (
    <AdvisorStepLayout
      stepNumber={9}
      totalSteps={totalSteps}
      title="What matters most to you in a job?"
      description="Pick the 2 or 3 that feel most important."
    >
      <PillSelector
        options={OPTIONS}
        selected={answers.values ?? []}
        onChange={(values) => onUpdate({ values })}
        maxSelect={3}
      />
    </AdvisorStepLayout>
  )
}
