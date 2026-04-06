'use client'

import Link from 'next/link'
import { CheckCircle, Lock, BookOpen } from 'lucide-react'

export interface JourneyModule {
  id: string
  title: string
  order: number
  programId: string
  programName: string
  totalLessons: number
  completedLessons: number
  status: 'locked' | 'in-progress' | 'complete'
}

interface LearningJourneyProps {
  modules: JourneyModule[]
  programId: string
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + '...'
}

function StepCircle({ module }: { module: JourneyModule }) {
  if (module.status === 'complete') {
    return (
      <div className="relative flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/40 border-2 border-green-500 dark:border-green-400">
        <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
      </div>
    )
  }

  if (module.status === 'in-progress') {
    return (
      <div className="relative flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 dark:bg-primary-900/40 border-2 border-primary-500 dark:border-primary-400">
        <div className="absolute inset-0 rounded-full border-2 border-primary-400 dark:border-primary-300 animate-pulse" />
        <BookOpen className="h-5 w-5 text-primary-600 dark:text-primary-400" />
      </div>
    )
  }

  // Locked
  return (
    <div className="relative flex items-center justify-center h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-500">
      <Lock className="h-5 w-5 text-slate-400 dark:text-slate-500" />
    </div>
  )
}

function ConnectingLine({ status, isLast }: { status: 'complete' | 'in-progress' | 'locked'; isLast: boolean }) {
  if (isLast) return null

  const baseClasses = 'sm:h-0.5 sm:w-full h-6 w-0.5'

  if (status === 'complete') {
    return <div className={`${baseClasses} bg-green-400 dark:bg-green-600`} />
  }

  return (
    <div
      className={`${baseClasses} border-dashed sm:border-t-2 sm:border-l-0 border-l-2 border-slate-300 dark:border-slate-600`}
    />
  )
}

function StepLabel({ module }: { module: JourneyModule }) {
  return (
    <div className="text-center sm:max-w-[100px]">
      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-tight">
        <span className="sm:hidden">{truncate(module.title, 30)}</span>
        <span className="hidden sm:inline">{truncate(module.title, 15)}</span>
      </p>
      {module.status === 'in-progress' && (
        <p className="text-[10px] text-primary-600 dark:text-primary-400 font-medium mt-0.5">
          {module.completedLessons}/{module.totalLessons} lessons
        </p>
      )}
      {module.status === 'complete' && (
        <p className="text-[10px] text-green-600 dark:text-green-400 font-medium mt-0.5">
          Complete
        </p>
      )}
    </div>
  )
}

export function LearningJourney({ modules, programId }: LearningJourneyProps) {
  if (!modules.length) return null

  const sorted = [...modules].sort((a, b) => a.order - b.order)

  return (
    <div className="w-full overflow-x-auto py-2">
      {/* Horizontal on sm+, vertical on mobile */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-0 sm:gap-0 min-w-0">
        {sorted.map((mod, i) => {
          const isLast = i === sorted.length - 1
          const isClickable = mod.status === 'complete' || mod.status === 'in-progress'

          const stepContent = (
            <div className="flex flex-col items-center gap-1.5">
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                {mod.order}
              </div>
              <StepCircle module={mod} />
              <StepLabel module={mod} />
            </div>
          )

          return (
            <div
              key={mod.id}
              className="flex flex-col sm:flex-row items-center gap-0"
            >
              {isClickable ? (
                <Link
                  href={`/training/${programId}/${mod.id}`}
                  className="flex flex-col items-center gap-1.5 group hover:opacity-80 transition-opacity"
                >
                  {stepContent}
                </Link>
              ) : (
                <div className="flex flex-col items-center gap-1.5 opacity-60">
                  {stepContent}
                </div>
              )}

              {!isLast && (
                <div className="flex sm:items-center sm:mx-2 my-1 sm:my-0 sm:mt-8">
                  <ConnectingLine status={mod.status} isLast={isLast} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
