'use client'

import { useState } from 'react'
import { ChevronDown, HelpCircle, Lightbulb } from 'lucide-react'

interface HowToPanelProps {
  title?: string
  children: React.ReactNode
}

export function HowToPanel({ title = 'How to use this page', children }: HowToPanelProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 text-left p-3 -mx-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <HelpCircle className="h-4 w-4 text-slate-400" />
          {title}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="mt-4 space-y-4 px-1 pb-2 text-sm leading-relaxed">
          {children}
        </div>
      )}
    </div>
  )
}

export function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3">
      <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">{children}</p>
    </div>
  )
}
