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
  FolderOpen,
  FileText,
  Compass,
  BarChart3,
  Briefcase,
  Home,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useColorTheme } from '@/components/providers/color-theme-provider'
import { SidebarLogo } from '@/components/layout/sidebar-logo'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

/**
 * Learner navigation. There is one leaf role now, so nothing here branches on it —
 * what a learner sees comes from the programmes their organisation has been
 * assigned and the document collections targeted at them.
 */
function getNavItems(
  role?: string,
  programs: { id: string; name: string }[] = [],
  collections: { id: string; title: string }[] = [],
): NavItem[] {
  const items: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/home', label: 'Home', icon: Home },
  ]

  if (role === 'LEARNER') {
    for (const program of programs) {
      items.push({ href: `/training/${program.id}`, label: program.name, icon: BookOpen })
    }
    items.push({ href: '/jobs', label: 'Jobs', icon: Briefcase })
  }

  // Single Document Library entry — the library page itself handles
  // collection grid / per-collection drill-in (and auto-selects when there's only one).
  if (collections.length > 0) {
    items.push({ href: '/library', label: 'Document Library', icon: FolderOpen })
  }

  items.push({ href: '/sessions', label: 'Workshops', icon: Calendar })

  // Sort everything after Dashboard alphabetically
  const dashboard = items[0]
  const rest = items.slice(1).sort((a, b) => a.label.localeCompare(b.label))
  return [dashboard, ...rest]
}

const ROLE_LABELS: Record<string, string> = {
  LEARNER: 'Learner',
}

const ROLE_BADGE_STYLES: Record<string, string> = {
  LEARNER: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
}

interface SidebarProps {
  onClose?: () => void
  mobile?: boolean
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function Sidebar({ onClose, mobile, collapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { colorTheme } = useColorTheme()
  const isClassic = colorTheme === 'classic'
  const isDark = colorTheme === 'dark'
  const role = session?.user?.role
  const programs = session?.user?.effectivePrograms ?? []
  const [collections, setCollections] = useState<{ id: string; title: string }[]>([])

  useEffect(() => {
    fetch('/api/library')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setCollections(data.map((c: { id: string; title: string }) => ({ id: c.id, title: c.title }))))
      .catch(() => {})
  }, [])

  const navItems = getNavItems(role, programs, collections)

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

  // Collapse hides labels on desktop. Mobile slide-over always stays expanded —
  // a 64px-wide drawer would be useless on touch.
  const isCollapsed = collapsed && !mobile

  const linkRowClass = isCollapsed
    ? 'flex items-center justify-center px-2 py-2.5 rounded-xl text-sm font-bold transition-all'
    : 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all'

  return (
    <div className={clsx('flex flex-col h-full', chrome.sidebar)}>
      {/* Logo */}
      <div
        className={clsx(
          'flex items-center h-20 flex-shrink-0',
          isCollapsed ? 'justify-center px-2' : 'justify-between px-5',
          chrome.logoBorder,
        )}
      >
        <SidebarLogo collapsed={isCollapsed} />
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
      <nav
        className={clsx('flex-1 min-h-0 overflow-y-auto space-y-1', isCollapsed ? 'p-2' : 'p-4')}
        aria-label="Main navigation"
      >
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              title={isCollapsed ? item.label : undefined}
              aria-label={isCollapsed ? item.label : undefined}
              className={clsx(linkRowClass, isActive ? chrome.navActive : chrome.navInactive)}
            >
              <Icon
                className={clsx('h-5 w-5 flex-shrink-0', isActive ? chrome.iconActive : chrome.iconInactive)}
              />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
        {onToggleCollapse && !mobile && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-pressed={isCollapsed}
            className={clsx(linkRowClass, 'w-full', chrome.navInactive)}
          >
            {isCollapsed ? (
              <ChevronsRight className={clsx('h-5 w-5 flex-shrink-0', chrome.iconInactive)} />
            ) : (
              <ChevronsLeft className={clsx('h-5 w-5 flex-shrink-0', chrome.iconInactive)} />
            )}
            {!isCollapsed && <span className="truncate">Collapse</span>}
          </button>
        )}
      </nav>

      {/* Bottom section */}
      <div className={clsx('border-t space-y-2', chrome.divider, isCollapsed ? 'p-2' : 'p-4')}>
        <Link
          href="/settings"
          onClick={onClose}
          title={isCollapsed ? 'Settings' : undefined}
          aria-label={isCollapsed ? 'Settings' : undefined}
          className={clsx(linkRowClass, 'w-full', pathname === '/settings' ? chrome.navActive : chrome.navInactive)}
        >
          <Settings
            className={clsx('h-5 w-5 flex-shrink-0', pathname === '/settings' ? chrome.iconActive : chrome.iconInactive)}
          />
          {!isCollapsed && <span className="truncate">Settings</span>}
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          title={isCollapsed ? 'Sign out' : undefined}
          aria-label={isCollapsed ? 'Sign out' : undefined}
          className={clsx(linkRowClass, 'w-full', chrome.signOut)}
        >
          <LogOut className={clsx('h-5 w-5 flex-shrink-0', chrome.iconInactive)} />
          {!isCollapsed && <span className="truncate">Sign out</span>}
        </button>
      </div>
    </div>
  )
}
