import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface SettingsSubpageProps {
  title: string
  description?: string
  icon: React.ElementType
  iconColor?: string
  iconBg?: string
  children: React.ReactNode
}

export function SettingsSubpage({
  title,
  description,
  icon: Icon,
  iconColor = 'text-primary-600 dark:text-primary-400',
  iconBg = 'bg-primary-50 dark:bg-primary-900/20',
  children,
}: SettingsSubpageProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-page-enter">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Settings
      </Link>

      <div className="flex items-start gap-3">
        <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
          {description && (
            <p className="text-slate-500 dark:text-slate-400 mt-1">{description}</p>
          )}
        </div>
      </div>

      <div className="space-y-6">{children}</div>
    </div>
  )
}
