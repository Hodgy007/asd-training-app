'use client'

import { CheckCircle, Loader2, Circle, AlertTriangle } from 'lucide-react'
import { clsx } from 'clsx'

export type ProgressPhase = 'parsing' | 'outline' | 'content' | 'quiz' | 'complete' | 'error'

interface GenerationProgressProps {
  phase: ProgressPhase
  currentLesson: number
  totalLessons: number
  currentPhase: 'content' | 'quiz'
  errors: string[]
}

const PHASE_ORDER: ProgressPhase[] = ['parsing', 'outline', 'content', 'quiz', 'complete']

function getPhaseIndex(phase: ProgressPhase): number {
  if (phase === 'error') return -1
  return PHASE_ORDER.indexOf(phase)
}

function computeProgressPercent(
  phase: ProgressPhase,
  currentLesson: number,
  totalLessons: number,
  currentPhase: 'content' | 'quiz'
): number {
  if (phase === 'complete') return 100
  if (phase === 'error') return 0
  if (phase === 'parsing') return 5
  if (phase === 'outline') return 15

  // content or quiz — 15% to 95% spread across lessons * 2 phases
  const totalSteps = totalLessons * 2
  const completedSteps =
    currentPhase === 'content'
      ? (currentLesson - 1) * 2
      : (currentLesson - 1) * 2 + 1
  const fraction = totalSteps > 0 ? completedSteps / totalSteps : 0
  return Math.round(15 + fraction * 80)
}

interface Step {
  key: ProgressPhase
  label: (currentLesson: number, totalLessons: number, currentPhase: 'content' | 'quiz') => string
}

const STEPS: Step[] = [
  { key: 'parsing', label: () => 'Parsing files...' },
  { key: 'outline', label: () => 'Creating outline...' },
  {
    key: 'content',
    label: (currentLesson, totalLessons, currentPhase) =>
      currentPhase === 'quiz'
        ? `Generating quiz for lesson ${currentLesson} of ${totalLessons}...`
        : `Generating lesson ${currentLesson} of ${totalLessons}...`,
  },
  { key: 'complete', label: () => 'Complete!' },
]

type StepStatus = 'done' | 'current' | 'pending'

function resolvedStepStatus(stepKey: ProgressPhase, activePhase: ProgressPhase): StepStatus {
  if (activePhase === 'complete' && stepKey !== 'complete') return 'done'

  // Map quiz phase to content step
  const normalizedActive: ProgressPhase =
    activePhase === 'quiz' ? 'content' : activePhase

  const stepIdx = PHASE_ORDER.indexOf(stepKey)
  const activeIdx = PHASE_ORDER.indexOf(normalizedActive)

  if (stepIdx < activeIdx) return 'done'
  if (stepIdx === activeIdx) return 'current'
  return 'pending'
}

export function GenerationProgress({
  phase,
  currentLesson,
  totalLessons,
  currentPhase,
  errors,
}: GenerationProgressProps) {
  const progressPercent = computeProgressPercent(phase, currentLesson, totalLessons, currentPhase)

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Generating content...</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-primary-600 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Step list */}
      <ol className="space-y-3">
        {STEPS.map((step) => {
          const status = resolvedStepStatus(step.key, phase)
          const label = step.label(currentLesson, totalLessons, currentPhase)

          return (
            <li key={step.key} className="flex items-center gap-3">
              {status === 'done' && (
                <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
              )}
              {status === 'current' && (
                <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin text-primary-600" />
              )}
              {status === 'pending' && (
                <Circle className="h-5 w-5 flex-shrink-0 text-slate-300 dark:text-slate-600" />
              )}
              <span
                className={clsx(
                  'text-sm',
                  status === 'done' && 'text-slate-500 dark:text-slate-400 line-through',
                  status === 'current' && 'font-medium text-slate-800 dark:text-slate-100',
                  status === 'pending' && 'text-slate-400 dark:text-slate-500'
                )}
              >
                {label}
              </span>
            </li>
          )
        })}
      </ol>

      {/* Errors banner */}
      {errors.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-700/50 dark:bg-amber-900/20">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {errors.length} lesson{errors.length !== 1 ? 's' : ''} had issues — You can retry or
            upload additional files in the next step.
          </p>
        </div>
      )}
    </div>
  )
}
