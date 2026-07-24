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
  Shield,
  Briefcase,
  LogOut,
  X,
  ShieldCheck,
  FolderOpen,
  Building2,
  Settings,
  CreditCard,
  Home,
  ShoppingBag,
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
  exact?: boolean
  /** If true, open in a new tab (for public-facing pages with their own shell) */
  openInNewTab?: boolean
}

// Users stays first, How to Guide stays last. Everything in between is sorted
// alphabetically by label. Schools is conditionally inserted into its
// alphabetical position when the current org is a parent org.
const BASE_NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Users', icon: Users, exact: true },
]

const PARENT_ORG_NAV: NavItem = { href: '/admin/schools', label: 'Schools', icon: Building2 }

const MIDDLE_NAV_ITEMS: NavItem[] = [
  { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/admin/audit', label: 'Audit Log', icon: ShieldCheck },
  { href: '/admin/billing', label: 'Billing', icon: CreditCard },
  { href: '/courses', label: 'Catalogue', icon: ShoppingBag, openInNewTab: true },
  { href: '/admin/library', label: 'Document Library', icon: FolderOpen },
  { href: '/admin/settings/sso', label: 'Enterprise SSO', icon: Shield },
  { href: '/admin/jobs', label: 'Job Openings', icon: Briefcase },
  { href: '/home', label: 'Home', icon: Home },
  { href: '/admin/settings/meetings', label: 'Meeting Settings', icon: Video },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/sessions', label: 'Workshops', icon: Calendar },
]

interface OrgAdminSidebarProps {
  onClose?: () => void
  mobile?: boolean
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function OrgAdminSidebar({ onClose, mobile, collapsed = false, onToggleCollapse }: OrgAdminSidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { colorTheme } = useColorTheme()
  const isClassic = colorTheme === 'classic'
  const isDark = colorTheme === 'dark'

  const isParentOrg = session?.user?.isParentOrg ?? false
  const middleWithSchools = isParentOrg
    ? [...MIDDLE_NAV_ITEMS, PARENT_ORG_NAV].sort((a, b) => a.label.localeCompare(b.label))
    : MIDDLE_NAV_ITEMS
  const navItems: NavItem[] = [...BASE_NAV_ITEMS, ...middleWithSchools]

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

  // Collapse hides labels on desktop only.
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
        aria-label="Org admin navigation"
      >
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/')

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
          href="/admin/settings"
          onClick={onClose}
          title={isCollapsed ? 'Settings' : undefined}
          aria-label={isCollapsed ? 'Settings' : undefined}
          className={clsx(linkRowClass, 'w-full', pathname === '/admin/settings' ? chrome.navActive : chrome.navInactive)}
        >
          <Settings
            className={clsx('h-5 w-5 flex-shrink-0', pathname === '/admin/settings' ? chrome.iconActive : chrome.iconInactive)}
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
