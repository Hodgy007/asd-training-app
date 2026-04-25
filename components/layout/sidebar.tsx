'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  BarChart3,
  Briefcase,
  Home,
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
    { href: '/home', label: 'Home', icon: Home },
  ]

  if (role === 'CAREGIVER' || role === 'CAREER_DEV_OFFICER' || role === 'STUDENT' || role === 'INTERN' || role === 'EMPLOYEE') {
    for (const program of programs) {
      items.push({ href: `/training/${program.id}`, label: program.name, icon: BookOpen })
    }
    if (role !== 'CAREGIVER' && cvBuilderEnabled) {
      items.push({ href: '/cv-builder', label: 'CV Builder', icon: FileText })
    }
    if (role !== 'CAREGIVER' && careersAdvisorEnabled) {
      items.push({ href: '/careers-advisor', label: 'Careers Advisor', icon: Compass })
    }
    if (role !== 'CAREGIVER') {
      items.push({ href: '/jobs', label: 'Jobs', icon: Briefcase })
    }
    if (role === 'CAREER_DEV_OFFICER') {
      items.push(
        { href: '/students', label: 'My Students', icon: Users },
        { href: '/students/reports', label: 'Student Reports', icon: BarChart3 },
      )
    }
  }

  // Single Document Library entry — the library page itself handles
  // collection grid / per-collection drill-in (and auto-selects when there's only one).
  if (collections.length > 0) {
    items.push({ href: '/library', label: 'Document Library', icon: FolderOpen })
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
  CAREGIVER: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
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
  const { data: session } = useSession()
  const { colorTheme } = useColorTheme()
  const isClassic = colorTheme === 'classic'
  const isDark = colorTheme === 'dark'
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
    sidebar: 'bg-white dark:bg-slate-900',
    logoBorder: 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900',
    logoText: 'text-slate-900 dark:text-slate-100',
    navActive: 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100',
    navInactive: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
    iconActive: 'text-primary-600 dark:text-primary-400',
    iconInactive: 'text-slate-500 dark:text-slate-400',
    divider: 'border-slate-200 dark:border-slate-800',
    signOut: 'text-slate-600 dark:text-slate-400 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-300',
  } : isDark ? {
    sidebar: 'bg-slate-800 border-slate-700',
    logoBorder: 'border-slate-700 bg-slate-800',
    logoText: 'text-slate-100',
    navActive: 'bg-slate-700 text-slate-100 shadow-sm',
    navInactive: 'text-slate-300 hover:bg-slate-700 hover:text-slate-100',
    iconActive: 'text-slate-100',
    iconInactive: 'text-slate-400',
    divider: 'border-slate-700',
    signOut: 'text-slate-300 hover:bg-red-900/20 hover:text-red-300',
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
      <div className={clsx('flex items-center justify-between h-20 px-5 flex-shrink-0', chrome.logoBorder)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-aaa.svg"
          alt="Ambitious about Autism"
          className={clsx('h-16 w-auto', isDark && 'invert brightness-125')}
        />
        {mobile && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-calm-100 dark:hover:bg-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1" aria-label="Main navigation">
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
