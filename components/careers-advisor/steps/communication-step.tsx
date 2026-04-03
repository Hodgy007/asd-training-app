'use client'

import { AdvisorStepLayout } from '../advisor-step-layout'
import { PillSelector } from '../pill-selector'
import type { AdvisorAnswers } from '@/types'

const OPTIONS = [
  'Writing (email/chat)',
  'Face to face (one-on-one)',
  'Face to face (groups)',
  'Phone/video calls',
  'Visual aids (diagrams/pictures)',
  'I prefer to listen rather than talk',
]

interface Props {
  answers: AdvisorAnswers
  onUpdate: (partial: Partial<AdvisorAnswers>) => void
  totalSteps: number
}

export function CommunicationStep({ answers, onUpdate, totalSteps }: Props) {
  return (
    <AdvisorStepLayout
      stepNumber={7}
      totalSteps={totalSteps}
      title="How do you prefer to communicate?"
      description="There's no right answer — different jobs suit different styles."
    >
      <PillSelector
        options={OPTIONS}
        selected={answers.communication ?? []}
        onChange={(communication) => onUpdate({ communication })}
      />
    </AdvisorStepLayout>
  )
}
