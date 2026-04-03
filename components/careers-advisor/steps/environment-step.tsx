'use client'

import { AdvisorStepLayout } from '../advisor-step-layout'
import { PillSelector } from '../pill-selector'
import type { AdvisorAnswers } from '@/types'

const OPTIONS = [
  'Quiet workspace', 'Working from home', 'Outdoors',
  'Predictable routine', 'Working alone', 'Small team',
  'Clear instructions', 'Flexible hours', 'Minimal interruptions',
  'Hands-on / physical work',
]

interface Props {
  answers: AdvisorAnswers
  onUpdate: (partial: Partial<AdvisorAnswers>) => void
  totalSteps: number
}

export function EnvironmentStep({ answers, onUpdate, totalSteps }: Props) {
  return (
    <AdvisorStepLayout
      stepNumber={3}
      totalSteps={totalSteps}
      title="What kind of work environment suits you best?"
      description="Think about where you feel most comfortable and can do your best work."
    >
      <PillSelector
        options={OPTIONS}
        selected={answers.environment ?? []}
        onChange={(environment) => onUpdate({ environment })}
      />
    </AdvisorStepLayout>
  )
}
