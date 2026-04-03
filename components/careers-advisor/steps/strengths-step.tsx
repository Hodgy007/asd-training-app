'use client'

import { AdvisorStepLayout } from '../advisor-step-layout'
import { PillSelector } from '../pill-selector'
import type { AdvisorAnswers } from '@/types'

const OPTIONS = [
  'Attention to detail', 'Problem solving', 'Creative thinking',
  'Following processes', 'Remembering facts', 'Organising things',
  'Working with my hands', 'Using computers', 'Being reliable',
  'Staying focused', 'Pattern spotting',
]

interface Props {
  answers: AdvisorAnswers
  onUpdate: (partial: Partial<AdvisorAnswers>) => void
  totalSteps: number
}

export function StrengthsStep({ answers, onUpdate, totalSteps }: Props) {
  return (
    <AdvisorStepLayout
      stepNumber={2}
      totalSteps={totalSteps}
      title="What are you good at?"
      description="Think about things people compliment you on, or activities where you lose track of time."
    >
      <PillSelector
        options={OPTIONS}
        selected={answers.strengths ?? []}
        onChange={(strengths) => onUpdate({ strengths })}
        allowOther
      />
    </AdvisorStepLayout>
  )
}
