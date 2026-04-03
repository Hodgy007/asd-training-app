'use client'

import { AdvisorStepLayout } from '../advisor-step-layout'
import { PillSelector } from '../pill-selector'
import type { AdvisorAnswers } from '@/types'

const OPTIONS = [
  'Animals', 'Technology', 'Art & Design', 'Music', 'Science',
  'Sport', 'Nature', 'Food & Cooking', 'Numbers & Data',
  'Building & Making', 'Reading & Writing', 'Helping People',
  'Gaming', 'History', 'Cars & Transport',
]

interface Props {
  answers: AdvisorAnswers
  onUpdate: (partial: Partial<AdvisorAnswers>) => void
  totalSteps: number
}

export function InterestsStep({ answers, onUpdate, totalSteps }: Props) {
  return (
    <AdvisorStepLayout
      stepNumber={1}
      totalSteps={totalSteps}
      title="What are you interested in?"
      description="Pick as many as you like. There are no wrong answers."
    >
      <PillSelector
        options={OPTIONS}
        selected={answers.interests ?? []}
        onChange={(interests) => onUpdate({ interests })}
        allowOther
        otherValue={answers.other ?? ''}
        onOtherChange={(other) => onUpdate({ other })}
      />
    </AdvisorStepLayout>
  )
}
