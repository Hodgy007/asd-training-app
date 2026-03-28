'use client'

import { useSession } from 'next-auth/react'
import { Menu, Bell } from 'lucide-react'

interface TopbarProps {
  onMenuClick: () => void
  title?: string
}

export function Topbar({ onMenuClick, title }: TopbarProps) {
  const { data: session } = useSession()

  const initials = session?.user?.name
    ? session.user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

  return (
    <header className="h-16 bg-white border-b border-calm-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-calm-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        {title && <h1 className="text-lg font-semibold text-slate-900 hidden md:block">{title}</h1>}
      </div>

      <div className="flex items-center gap-3">
        <button
          className="p-2 rounded-xl text-slate-400 hover:bg-calm-100 transition-colors relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-white">{initials}</span>
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-slate-900 leading-tight">
              {session?.user?.name || 'Caregiver'}
            </p>
            <p className="text-xs text-slate-400 capitalize">
              {session?.user?.role?.toLowerCase() || 'caregiver'}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
