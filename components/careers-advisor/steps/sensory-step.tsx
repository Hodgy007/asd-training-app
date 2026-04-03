'use client'

import { AdvisorStepLayout } from '../advisor-step-layout'
import { PillSelector } from '../pill-selector'
import type { AdvisorAnswers } from '@/types'

const OPTIONS = [
  'Bright or flickering lights',
  'Loud or sudden noises',
  'Strong smells',
  'Crowded spaces',
  'Uncomfortable clothing (e.g. uniforms)',
  'Sitting still for long periods',
  'None of these',
]

interface Props {
  answers: AdvisorAnswers
  onUpdate: (partial: Partial<AdvisorAnswers>) => void
  totalSteps: number
}

export function SensoryStep({ answers, onUpdate, totalSteps }: Props) {
  return (
    <AdvisorStepLayout
      stepNumber={8}
      totalSteps={totalSteps}
      title="Are there any sensory things that affect you at work or school?"
      description="This helps us suggest workplaces where you'd feel comfortable."
    >
      <PillSelector
        options={OPTIONS}
        selected={answers.sensory ?? []}
        onChange={(sensory) => onUpdate({ sensory })}
      />
    </AdvisorStepLayout>
  )
}
