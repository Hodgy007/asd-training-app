'use client'

import { useEffect, useRef } from 'react'

interface AdvisorStepLayoutProps {
  stepNumber: number
  totalSteps: number
  title: string
  description: string
  children: React.ReactNode
}

export function AdvisorStepLayout({ stepNumber, totalSteps, title, description, children }: AdvisorStepLayoutProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [stepNumber])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
          Step {stepNumber} of {totalSteps}
        </p>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-xl font-bold text-slate-900 dark:text-slate-100 outline-none"
        >
          {title}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {description}
        </p>
      </div>
      <div>{children}</div>
    </div>
  )
}
