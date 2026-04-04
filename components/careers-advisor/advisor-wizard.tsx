'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'
import { AdvisorProgressBar } from './advisor-progress-bar'
import { InterestsStep } from './steps/interests-step'
import { StrengthsStep } from './steps/strengths-step'
import { EnvironmentStep } from './steps/environment-step'
import { ConcernsStep } from './steps/concerns-step'
import { ExperienceStep } from './steps/experience-step'
import { StageStep } from './steps/stage-step'
import { CommunicationStep } from './steps/communication-step'
import { SensoryStep } from './steps/sensory-step'
import { ValuesStep } from './steps/values-step'
import { OtherStep } from './steps/other-step'
import { ReportStep } from './steps/report-step'
import type { AdvisorAnswers, AdvisorReport } from '@/types'

const TOTAL_STEPS = 11
const REPORT_STEP = 10

interface AdvisorWizardProps {
  sessionId: string
  initialAnswers: AdvisorAnswers
  initialStep: number
  initialReport: AdvisorReport | null
  initialStatus: string
}

export function AdvisorWizard({
  sessionId,
  initialAnswers,
  initialStep,
  initialReport,
  initialStatus,
}: AdvisorWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [answers, setAnswers] = useState<AdvisorAnswers>(initialAnswers)
  const [report, setReport] = useState<AdvisorReport | null>(initialReport)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const isComplete = initialStatus === 'COMPLETE'

  const saveToServer = useCallback(
    async (newAnswers: AdvisorAnswers, step: number) => {
      setSaving(true)
      try {
        await fetch(`/api/careers-advisor/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: newAnswers, currentStep: step }),
        })
        setSavedAt(new Date())
      } catch {
        // silently fail — user can retry
      } finally {
        setSaving(false)
      }
    },
    [sessionId]
  )

  // Debounced auto-save
  const debouncedSave = useCallback(
    (newAnswers: AdvisorAnswers, step: number) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => saveToServer(newAnswers, step), 500)
    },
    [saveToServer]
  )

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  function handleUpdate(partial: Partial<AdvisorAnswers>) {
    const newAnswers = { ...answers, ...partial }
    setAnswers(newAnswers)
    debouncedSave(newAnswers, currentStep)
  }

  function handleNext() {
    if (currentStep < TOTAL_STEPS - 1) {
      const nextStep = currentStep + 1
      setCurrentStep(nextStep)
      saveToServer(answers, nextStep)
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      const prevStep = currentStep - 1
      setCurrentStep(prevStep)
      saveToServer(answers, prevStep)
    }
  }

  function handleReportGenerated(newReport: AdvisorReport) {
    setReport(newReport)
  }

  function renderStep() {
    const stepProps = { answers, onUpdate: handleUpdate, totalSteps: TOTAL_STEPS }

    switch (currentStep) {
      case 0: return <InterestsStep {...stepProps} />
      case 1: return <StrengthsStep {...stepProps} />
      case 2: return <EnvironmentStep {...stepProps} />
      case 3: return <ConcernsStep {...stepProps} />
      case 4: return <ExperienceStep {...stepProps} />
      case 5: return <StageStep {...stepProps} />
      case 6: return <CommunicationStep {...stepProps} />
      case 7: return <SensoryStep {...stepProps} />
      case 8: return <ValuesStep {...stepProps} />
      case 9: return <OtherStep {...stepProps} />
      case 10: return <ReportStep sessionId={sessionId} report={report} onReportGenerated={handleReportGenerated} />
      default: return null
    }
  }

  const isReportStep = currentStep === REPORT_STEP

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Progress bar */}
      <AdvisorProgressBar currentStep={currentStep} />

      {/* Step content */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-6 sm:p-8 shadow-sm">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
          <div>
            {currentStep > 0 && !isComplete && (
              <button
                onClick={handleBack}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Save indicator */}
            {saving && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                Saving...
              </span>
            )}
            {!saving && savedAt && (
              <span className="flex items-center gap-1 text-xs text-green-500">
                <Check className="w-3 h-3" />
                Saved
              </span>
            )}

            {/* Next / Done */}
            {!isReportStep && !isComplete && (
              <button
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-all"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {(isReportStep && report) || isComplete ? (
              <button
                onClick={() => router.push('/careers-advisor')}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-all"
              >
                Done — back to my sessions
              </button>
            ) : null}
          </div>
        </div>
    </div>
  )
}
