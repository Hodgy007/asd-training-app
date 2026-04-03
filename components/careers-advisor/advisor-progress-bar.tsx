'use client'

import { clsx } from 'clsx'
import {
  Heart, Star, Building2, Shield, Briefcase, GraduationCap,
  MoreHorizontal, MessageSquare, Eye, Target, FileText, Sparkles,
} from 'lucide-react'

const STEPS = [
  { label: 'Interests', icon: Heart },
  { label: 'Strengths', icon: Star },
  { label: 'Environment', icon: Building2 },
  { label: 'Concerns', icon: Shield },
  { label: 'Experience', icon: Briefcase },
  { label: 'Stage', icon: GraduationCap },
  { label: 'Optional', icon: MoreHorizontal },
  { label: 'Communication', icon: MessageSquare },
  { label: 'Sensory', icon: Eye },
  { label: 'Values', icon: Target },
  { label: 'Other', icon: FileText },
  { label: 'Report', icon: Sparkles },
]

interface AdvisorProgressBarProps {
  currentStep: number
}

export function AdvisorProgressBar({ currentStep }: AdvisorProgressBarProps) {
  return (
    <div className="w-full">
      {/* Mobile: simple bar */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {STEPS[currentStep]?.label ?? 'Report'}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {currentStep + 1} / {STEPS.length}
          </span>
        </div>
        <div className="h-2 bg-calm-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop: step icons */}
      <div className="hidden sm:flex items-center justify-between gap-1">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          const isActive = i === currentStep
          const isComplete = i < currentStep

          return (
            <div key={step.label} className="flex flex-col items-center gap-1 flex-1 min-w-0">
              <div
                className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                  isActive
                    ? 'bg-primary-500 text-white shadow-md'
                    : isComplete
                    ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400'
                    : 'bg-calm-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span
                className={clsx(
                  'text-[10px] font-medium truncate max-w-full',
                  isActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-slate-400 dark:text-slate-500'
                )}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
