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
  const isDark = colorTheme === 'dark'

  const initials = session?.user?.name
    ? session.user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

  // LinkedIn-inspired white topbar across all colour themes. Only the app-wide
  // dark mode class (`.dark`) flips the bar to a dark surface.
  void isClassic
  void isDark
  const headerBg = 'bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800'
  const iconColor =
    'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800'
  const titleColor = 'text-slate-900 dark:text-slate-100'
  const nameColor = titleColor
  const roleColor = 'text-slate-500 dark:text-slate-400'

  return (
    <header className={clsx('h-16 flex items-center justify-between px-4 md:px-6 flex-shrink-0', headerBg)}>
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
          <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
            <span className="text-xs font-bold text-white">{initials}</span>
          </div>
          <div className="hidden md:block">
            <p className={clsx('text-sm font-medium leading-tight', nameColor)}>
              {session?.user?.name || 'Practitioner'}
            </p>
            <p className={clsx('text-xs', roleColor)}>
              {session?.user?.role ? getRoleLabel(session.user.role) : 'Practitioner'}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
