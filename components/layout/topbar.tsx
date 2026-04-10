'use client'

import { useSession } from 'next-auth/react'
import { Menu, Bell } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { getRoleLabel } from '@/lib/rbac'
import { useColorTheme } from '@/components/providers/color-theme-provider'
import { clsx } from 'clsx'

interface TopbarProps {
  onMenuClick: () => void
  title?: string
}

export function Topbar({ onMenuClick, title }: TopbarProps) {
  const { data: session } = useSession()
  const { colorTheme } = useColorTheme()
  const isClassic = colorTheme === 'classic'

  const initials = session?.user?.name
    ? session.user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

  const headerBg = isClassic
    ? 'bg-orange-100 dark:bg-slate-800 border-orange-200 dark:border-slate-700'
    : 'bg-primary-500 dark:bg-primary-600 border-primary-600 dark:border-primary-700'
  const iconColor = isClassic
    ? 'text-slate-700 dark:text-slate-300 hover:bg-orange-200 dark:hover:bg-slate-700'
    : 'text-white hover:bg-primary-400'
  const titleColor = isClassic ? 'text-slate-900 dark:text-slate-100' : 'text-white'
  const nameColor = isClassic ? 'text-slate-900 dark:text-slate-100' : 'text-white'

  return (
    <header className={clsx('h-16 border-b flex items-center justify-between px-4 md:px-6 flex-shrink-0', headerBg)}>
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className={clsx('md:hidden p-2 rounded-xl transition-colors', iconColor)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        {title && <h1 className={clsx('text-lg font-semibold hidden md:block', titleColor)}>{title}</h1>}
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />

        <button
          className={clsx('p-2 rounded-xl transition-colors relative', iconColor)}
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-primary-500">{initials}</span>
          </div>
          <div className="hidden md:block">
            <p className={clsx('text-sm font-medium leading-tight', nameColor)}>
              {session?.user?.name || 'Practitioner'}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {session?.user?.role ? getRoleLabel(session.user.role) : 'Practitioner'}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
