'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  LogOut,
  X,
  Calendar,
  Settings,
  HelpCircle,
  FolderOpen,
  FileText,
  Compass,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useColorTheme } from '@/components/providers/color-theme-provider'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

function getNavItems(
  role?: string,
  programs: { id: string; name: string }[] = [],
  collections: { id: string; title: string }[] = [],
  cvBuilderEnabled = true,
  careersAdvisorEnabled = true,
): NavItem[] {
  const items: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ]

  if (role === 'CAREGIVER') {
    for (const program of programs) {
      items.push({ href: `/training/${program.id}`, label: program.name, icon: BookOpen })
    }
    items.push(
      { href: '/children', label: 'Child Observations', icon: Users },
    )
  } else if (role === 'CAREER_DEV_OFFICER' || role === 'STUDENT' || role === 'INTERN' || role === 'EMPLOYEE') {
    for (const program of programs) {
      items.push({ href: `/training/${program.id}`, label: program.name, icon: BookOpen })
    }
    if (cvBuilderEnabled) {
      items.push({ href: '/cv-builder', label: 'CV Builder', icon: FileText })
    }
    if (careersAdvisorEnabled) {
      items.push({ href: '/careers-advisor', label: 'Careers Advisor', icon: Compass })
    }
  }

  // Show each document collection directly in the nav
  for (const col of collections) {
    items.push({ href: `/library?c=${col.id}`, label: col.title, icon: FolderOpen })
  }

  items.push({ href: '/guide', label: 'How to Guide', icon: HelpCircle })
  items.push({ href: '/sessions', label: 'Workshops', icon: Calendar })

  // Sort everything after Dashboard alphabetically
  const dashboard = items[0]
  const rest = items.slice(1).sort((a, b) => a.label.localeCompare(b.label))
  return [dashboard, ...rest]
}

const ROLE_LABELS: Record<string, string> = {
  CAREGIVER: 'Practitioner',
  CAREER_DEV_OFFICER: 'Careers Professional',
  STUDENT: 'Student',
  INTERN: 'Intern',
  EMPLOYEE: 'Employee',
}

const ROLE_BADGE_STYLES: Record<string, string> = {
  CAREGIVER: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  CAREER_DEV_OFFICER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  STUDENT: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  INTERN: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  EMPLOYEE: 'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300',
}

interface SidebarProps {
  onClose?: () => void
  mobile?: boolean
}

export function Sidebar({ onClose, mobile }: SidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const { colorTheme } = useColorTheme()
  const isClassic = colorTheme === 'classic'
  const role = session?.user?.role
  const programs = session?.user?.effectivePrograms ?? []
  const cvBuilderEnabled = (session?.user as { cvBuilderEnabled?: boolean })?.cvBuilderEnabled !== false
  const careersAdvisorEnabled = (session?.user as { careersAdvisorEnabled?: boolean })?.careersAdvisorEnabled !== false
  const [collections, setCollections] = useState<{ id: string; title: string }[]>([])

  useEffect(() => {
    fetch('/api/library')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setCollections(data.map((c: { id: string; title: string }) => ({ id: c.id, title: c.title }))))
      .catch(() => {})
  }, [])

  const navItems = getNavItems(role, programs, collections, cvBuilderEnabled, careersAdvisorEnabled)

  const chrome = isClassic ? {
    sidebar: 'bg-orange-100 dark:bg-slate-800 border-orange-200 dark:border-slate-700',
    logoBorder: 'border-orange-200 dark:border-slate-700 bg-orange-100 dark:bg-slate-800',
    logoText: 'text-slate-900 dark:text-slate-100',
    navActive: 'bg-orange-200 text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100',
    navInactive: 'text-slate-700 hover:bg-orange-200 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700',
    iconActive: 'text-slate-900 dark:text-slate-100',
    iconInactive: 'text-slate-500 dark:text-slate-400',
    divider: 'border-orange-200 dark:border-slate-700',
    signOut: 'text-slate-700 dark:text-slate-300 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-300',
  } : {
    sidebar: 'bg-primary-500 dark:bg-primary-600 border-primary-600 dark:border-primary-700',
    logoBorder: 'border-primary-600 dark:border-primary-700 bg-primary-500 dark:bg-primary-600',
    logoText: 'text-white',
    navActive: 'bg-white/20 text-white shadow-sm',
    navInactive: 'text-white/80 hover:bg-white/10 hover:text-white',
    iconActive: 'text-white',
    iconInactive: 'text-white/60',
    divider: 'border-white/20',
    signOut: 'text-white/80 hover:bg-red-500/20 hover:text-red-200',
  }

  return (
    <div className={clsx('flex flex-col h-full', chrome.sidebar)}>
      {/* Logo */}
      <div className={clsx('flex items-center justify-between h-16 px-5 border-b flex-shrink-0', chrome.logoBorder)}>
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="18,2 34,32 2,32" fill="#f5821f" />
              <polygon points="18,10 28,28 8,28" fill="#fcaf17" opacity="0.7" />
            </svg>
          </div>
          <div>
            <p className={clsx('font-bold text-sm leading-tight', chrome.logoText)}>Ambitious about</p>
            <p className={clsx('font-bold text-sm leading-tight', chrome.logoText)}>Autism</p>
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
      {role && ROLE_LABELS[role] && (
        <div className="px-5 py-2 border-b border-calm-100 dark:border-slate-700">
          <span className={clsx(
            'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
            ROLE_BADGE_STYLES[role] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-600 dark:text-slate-200',
          )}>
            {ROLE_LABELS[role]}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon
          // For library collection links like /library?c=xxx, match on both path and query param
          const [itemPath, itemQuery] = item.href.split('?')
          const isActive = itemQuery
            ? pathname === itemPath && searchParams.get('c') === new URLSearchParams(itemQuery).get('c')
            : pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all',
                isActive ? chrome.navActive : chrome.navInactive,
              )}
            >
              <Icon
                className={clsx('h-5 w-5 flex-shrink-0', isActive ? chrome.iconActive : chrome.iconInactive)}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className={clsx('p-4 border-t space-y-2', chrome.divider)}>
        {role === 'CAREGIVER' && (
          <div className="bg-orange-50 dark:bg-slate-700 border-l-4 border-primary-500 rounded-r-xl p-3 mb-3">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <strong className="text-primary-600 dark:text-primary-400">Reminder:</strong> This tool does not diagnose. Share observations with your GP or health visitor.
            </p>
          </div>
        )}
        <Link
          href="/settings"
          onClick={onClose}
          className={clsx(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all w-full',
            pathname === '/settings' ? chrome.navActive : chrome.navInactive,
          )}
        >
          <Settings className={clsx('h-5 w-5 flex-shrink-0', pathname === '/settings' ? chrome.iconActive : chrome.iconInactive)} />
          Settings
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className={clsx('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all w-full', chrome.signOut)}
        >
          <LogOut className={clsx('h-5 w-5', chrome.iconInactive)} />
          Sign out
        </button>
      </div>
    </div>
  )
}
