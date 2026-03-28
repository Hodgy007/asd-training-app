'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  FileText,
  LogOut,
  X,
  Briefcase,
  ShieldCheck,
  Settings,
} from 'lucide-react'
import { clsx } from 'clsx'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

const CAREGIVER_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/training', label: 'ASD Training', icon: BookOpen },
  { href: '/children', label: 'Child Observations', icon: Users },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const CAREERS_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/careers', label: 'Careers Training', icon: Briefcase },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const ADMIN_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/training', label: 'ASD Training', icon: BookOpen },
  { href: '/careers', label: 'Careers Training', icon: Briefcase },
  { href: '/children', label: 'Child Observations', icon: Users },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/admin', label: 'Admin', icon: ShieldCheck },
  { href: '/settings', label: 'Settings', icon: Settings },
]

function getNavItems(role?: string): NavItem[] {
  if (role === 'ADMIN') return ADMIN_NAV
  if (role === 'CAREER_DEV_OFFICER') return CAREERS_NAV
  return CAREGIVER_NAV
}

interface SidebarProps {
  onClose?: () => void
  mobile?: boolean
}

export function Sidebar({ onClose, mobile }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = session?.user?.role
  const navItems = getNavItems(role)

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 border-r border-calm-200 dark:border-slate-700">
      {/* Logo */}
      <div className="flex items-center justify-between p-5 border-b border-calm-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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

      {/* Role badge */}
      {role && (
        <div className="px-5 py-2 border-b border-calm-100 dark:border-slate-700">
          <span className={clsx(
            'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
            role === 'ADMIN' && 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
            role === 'CAREER_DEV_OFFICER' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
            role === 'CAREGIVER' && 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
          )}>
            {role === 'ADMIN' && <ShieldCheck className="h-3 w-3" />}
            {role === 'CAREER_DEV_OFFICER' && <Briefcase className="h-3 w-3" />}
            {role === 'ADMIN' ? 'Admin' : role === 'CAREER_DEV_OFFICER' ? 'Careers Professional' : 'Caregiver'}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all',
                isActive
                  ? 'bg-primary-50 text-primary-600 shadow-sm dark:bg-primary-900/30 dark:text-primary-400'
                  : 'text-slate-600 hover:bg-calm-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100'
              )}
            >
              <Icon
                className={clsx('h-5 w-5 flex-shrink-0', isActive ? 'text-primary-500 dark:text-primary-400' : 'text-slate-400 dark:text-slate-500')}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-calm-200 dark:border-slate-700 space-y-2">
        {role !== 'CAREER_DEV_OFFICER' && (
          <div className="bg-orange-50 dark:bg-slate-700 border-l-4 border-primary-500 rounded-r-xl p-3 mb-3">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <strong className="text-primary-600 dark:text-primary-400">Reminder:</strong> This tool does not diagnose. Share observations with your GP or health visitor.
            </p>
          </div>
        )}
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
