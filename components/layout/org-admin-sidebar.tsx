'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  Users,
  Calendar,
  Megaphone,
  BarChart3,
  Video,
  LogOut,
  X,
  ShieldCheck,
} from 'lucide-react'
import { clsx } from 'clsx'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  exact?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Users', icon: Users, exact: true },
  { href: '/admin/sessions', label: 'Sessions', icon: Calendar },
  { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/settings/meetings', label: 'Meeting Settings', icon: Video },
]

interface OrgAdminSidebarProps {
  onClose?: () => void
  mobile?: boolean
}

export function OrgAdminSidebar({ onClose, mobile }: OrgAdminSidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <div className="flex flex-col h-full bg-orange-50 dark:bg-slate-800 border-r border-calm-200 dark:border-slate-700">
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-calm-200 dark:border-slate-700 bg-orange-50 dark:bg-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="18,2 34,32 2,32" fill="#f5821f" />
              <polygon points="18,10 28,28 8,28" fill="#fcaf17" opacity="0.7" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight">Ambitious about</p>
            <p className="font-bold text-primary-500 text-sm leading-tight">Autism</p>
          </div>
        </div>
        {mobile && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-calm-100 dark:hover:bg-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Org Admin badge */}
      <div className="px-5 py-2 border-b border-calm-100 dark:border-slate-700">
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          <ShieldCheck className="h-3 w-3" />
          Org Admin
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1" aria-label="Org admin navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all',
                isActive
                  ? 'bg-emerald-50 text-emerald-600 shadow-sm dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'text-slate-600 hover:bg-calm-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100'
              )}
            >
              <Icon
                className={clsx(
                  'h-5 w-5 flex-shrink-0',
                  isActive ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                )}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-calm-200 dark:border-slate-700 space-y-2">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all w-full"
        >
          <LogOut className="h-5 w-5 text-slate-400 dark:text-slate-500" />
          Sign out
        </button>
      </div>
    </div>
  )
}
