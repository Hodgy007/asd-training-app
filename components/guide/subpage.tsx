import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

type Accent = 'purple' | 'emerald' | 'primary'

interface SubpageProps {
  parentHref: string
  parentLabel: string
  icon: React.ElementType
  title: string
  accent: Accent
  children: React.ReactNode
}

const ACCENT: Record<Accent, { headerBg: string; iconColor: string }> = {
  purple: {
    headerBg: 'bg-purple-50 dark:bg-purple-900/20',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  emerald: {
    headerBg: 'bg-emerald-50 dark:bg-emerald-900/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  primary: {
    headerBg: 'bg-primary-50 dark:bg-primary-900/20',
    iconColor: 'text-primary-600 dark:text-primary-400',
  },
}

export function GuideSubpage({ parentHref, parentLabel, icon: Icon, title, accent, children }: SubpageProps) {
  const colors = ACCENT[accent]
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-page-enter">
      <Link
        href={parentHref}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        {parentLabel}
      </Link>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-calm-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className={`flex items-center gap-3 px-6 py-4 ${colors.headerBg} border-b border-calm-200 dark:border-slate-700`}>
          <Icon className={`h-5 w-5 ${colors.iconColor}`} />
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h1>
        </div>
        <div className="px-6 py-5 space-y-4">{children}</div>
      </div>
    </div>
  )
}

export function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 rounded-r-lg p-3">
      <p className="text-sm text-amber-800 dark:text-amber-300">{children}</p>
    </div>
  )
}
