'use client'

import { clsx } from 'clsx'
import {
  User,
  FileText,
  Briefcase,
  GraduationCap,
  Wrench,
  Heart,
  Users,
  CheckCircle,
  Check,
} from 'lucide-react'

const STEPS = [
  { label: 'Your Details', icon: User },
  { label: 'About You', icon: FileText },
  { label: 'Work Experience', icon: Briefcase },
  { label: 'Education', icon: GraduationCap },
  { label: 'Skills', icon: Wrench },
  { label: 'Interests', icon: Heart },
  { label: 'References', icon: Users },
  { label: 'Review', icon: CheckCircle },
]

interface CvProgressBarProps {
  currentStep: number
  completedSteps: Set<number>
}

export function CvProgressBar({ currentStep, completedSteps }: CvProgressBarProps) {
  return (
    <nav aria-label="CV Builder progress" className="w-full">
      <ol className="flex items-center justify-between gap-1">
        {STEPS.map((step, index) => {
          const Icon = step.icon
          const isCompleted = completedSteps.has(index)
          const isCurrent = index === currentStep

          return (
            <li key={step.label} className="flex flex-col items-center flex-1 min-w-0">
              {/* Icon circle */}
              <div
                className={clsx(
                  'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all',
                  isCompleted
                    ? 'bg-sage-500 border-sage-500 text-white'
                    : isCurrent
                      ? 'border-primary-500 bg-primary-50 text-primary-600 ring-2 ring-primary-200 dark:bg-primary-900/30 dark:ring-primary-800'
                      : 'border-calm-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500'
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>

              {/* Label - hidden on mobile, shown on md+ */}
              <span
                className={clsx(
                  'hidden md:block mt-1.5 text-xs font-bold text-center truncate max-w-full',
                  isCompleted
                    ? 'text-sage-600 dark:text-sage-400'
                    : isCurrent
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-slate-400 dark:text-slate-500'
                )}
              >
                {step.label}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
