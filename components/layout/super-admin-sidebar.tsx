'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Building2,
  BarChart3,
  LogOut,
  X,
  Users,
  Settings,
  Package,
  CreditCard,
  MessageSquare,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { clsx } from 'clsx'
import { CHARITY_PERMISSIONS } from '@/lib/rbac'
import { useColorTheme } from '@/components/providers/color-theme-provider'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  exact?: boolean
  /** If set, only shown when user has this permission (SUPER_ADMIN always passes) */
  permission?: string
  /** If true, only visible to SUPER_ADMIN (not CHARITY_EMPLOYEE) */
  charityAdminOnly?: boolean
  /** If true, open in a new tab (for public-facing pages with their own shell) */
  openInNewTab?: boolean
}

// Overview stays first. Everything else is sorted alphabetically by label.
const NAV_ITEMS: NavItem[] = [
  { href: '/super-admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/super-admin/feedback', label: 'Feedback', icon: MessageSquare, charityAdminOnly: true },
  { href: '/super-admin/organisations', label: 'Organisations', icon: Building2, permission: CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS },
  { href: '/super-admin/products', label: 'Products', icon: Package },
  { href: '/super-admin/reports', label: 'Reports', icon: BarChart3, permission: CHARITY_PERMISSIONS.VIEW_REPORTS },
  { href: '/super-admin/subscribers', label: 'Subscribers', icon: CreditCard, charityAdminOnly: true },
  { href: '/super-admin/users', label: 'Users', icon: Users, charityAdminOnly: true },
]

interface SuperAdminSidebarProps {
  onClose?: () => void
  mobile?: boolean
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function SuperAdminSidebar({ onClose, mobile, collapsed = false, onToggleCollapse }: SuperAdminSidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { colorTheme } = useColorTheme()
  const isClassic = colorTheme === 'classic'
  const isDark = colorTheme === 'dark'

  const role = session?.user?.role
  const isCharityAdmin = role === 'SUPER_ADMIN'
  const charityPermissions: string[] = session?.user?.charityPermissions ?? []

  const [newFeedbackCount, setNewFeedbackCount] = useState(0)
  useEffect(() => {
    if (role !== 'SUPER_ADMIN') return
    fetch('/api/super-admin/feedback?status=NEW&pageSize=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.statusCounts) setNewFeedbackCount(j.statusCounts.NEW || 0)
      })
      .catch(() => {})
  }, [role])

  /** Check if the user can see a given nav item */
  function canSee(item: NavItem): boolean {
    // SUPER_ADMIN sees everything
    if (isCharityAdmin) return true
    // Charity Admin-only items are hidden from CHARITY_EMPLOYEE
    if (item.charityAdminOnly) return false
    // Items with a permission requirement: check the permissions array
    if (item.permission) return charityPermissions.includes(item.permission)
    // Items with no gating are always visible
    return true
  }

  const visibleItems = NAV_ITEMS.filter(canSee)

  const badgeLabel = isCharityAdmin ? 'Charity Admin' : 'Charity Employee'
  const badgeStyle = isCharityAdmin
    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'

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

  // Collapse hides labels on desktop only. Mobile slide-over always stays
  // expanded — a 64px-wide drawer would be useless on touch.
  const isCollapsed = collapsed && !mobile

  const linkRowClass = isCollapsed
    ? 'flex items-center justify-center px-2 py-2.5 rounded-xl text-sm font-bold transition-all'
    : 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all'

  void badgeLabel
  void badgeStyle

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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={isCollapsed ? '/logo-aaa-mark.svg' : '/logo-aaa.svg'}
          alt="Ambitious about Autism"
          className={clsx(isCollapsed ? 'h-10 w-10' : 'h-16 w-auto', isDark && 'invert brightness-125')}
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
      <nav
        className={clsx('flex-1 min-h-0 overflow-y-auto space-y-1', isCollapsed ? 'p-2' : 'p-4')}
        aria-label="Super admin navigation"
      >
        {visibleItems.map((item) => {
          const Icon = item.icon
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/')
          const showFeedbackBadge = item.href === '/super-admin/feedback' && newFeedbackCount > 0

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              target={item.openInNewTab ? '_blank' : undefined}
              rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
              title={isCollapsed ? item.label : undefined}
              aria-label={isCollapsed ? item.label : undefined}
              className={clsx(linkRowClass, isActive ? chrome.navActive : chrome.navInactive)}
            >
              {isCollapsed ? (
                <span className="relative inline-flex">
                  <Icon className={clsx('h-5 w-5 flex-shrink-0', isActive ? chrome.iconActive : chrome.iconInactive)} />
                  {showFeedbackBadge && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-current"
                      style={{ boxShadow: '0 0 0 2px rgba(0,0,0,0.05)' }}
                    />
                  )}
                </span>
              ) : (
                <>
                  <Icon className={clsx('h-5 w-5 flex-shrink-0', isActive ? chrome.iconActive : chrome.iconInactive)} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {showFeedbackBadge && (
                    <span className="ml-auto inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
                      {newFeedbackCount}
                    </span>
                  )}
                </>
              )}
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
          href="/super-admin/settings"
          onClick={onClose}
          title={isCollapsed ? 'Settings' : undefined}
          aria-label={isCollapsed ? 'Settings' : undefined}
          className={clsx(linkRowClass, 'w-full', pathname === '/super-admin/settings' ? chrome.navActive : chrome.navInactive)}
        >
          <Settings
            className={clsx('h-5 w-5 flex-shrink-0', pathname === '/super-admin/settings' ? chrome.iconActive : chrome.iconInactive)}
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
