'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Building2,
  BookOpen,
  ClipboardList,
  Megaphone,
  BarChart3,
  TrendingUp,
  LogOut,
  X,
  Crown,
  Users,
  HelpCircle,
  Calendar,
  Settings,
  FolderOpen,
  UsersRound,
  Sparkles,
  Briefcase,
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
}

// Overview stays first, How to Guide stays last. Everything in between is
// sorted alphabetically by label for predictability as the menu grows.
const NAV_ITEMS: NavItem[] = [
  { href: '/super-admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/super-admin/ai-prompts', label: 'AI Prompts', icon: Sparkles, permission: CHARITY_PERMISSIONS.MANAGE_AI_PROMPTS },
  { href: '/super-admin/announcements', label: 'Announcements', icon: Megaphone, permission: CHARITY_PERMISSIONS.MANAGE_ANNOUNCEMENTS },
  { href: '/super-admin/cohorts', label: 'Cohorts', icon: UsersRound, permission: CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS },
  { href: '/super-admin/library', label: 'Document Library', icon: FolderOpen, permission: CHARITY_PERMISSIONS.MANAGE_LIBRARY },
  { href: '/super-admin/impact', label: 'Impact & Reach', icon: TrendingUp, permission: CHARITY_PERMISSIONS.VIEW_REPORTS },
  { href: '/super-admin/jobs', label: 'Job Openings', icon: Briefcase, permission: CHARITY_PERMISSIONS.MANAGE_JOBS },
  { href: '/super-admin/organisations', label: 'Organisations', icon: Building2, permission: CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS },
  { href: '/super-admin/reports', label: 'Reports', icon: BarChart3, permission: CHARITY_PERMISSIONS.VIEW_REPORTS },
  { href: '/super-admin/surveys', label: 'Surveys', icon: ClipboardList, permission: CHARITY_PERMISSIONS.MANAGE_SURVEYS },
  { href: '/super-admin/training', label: 'Training Content', icon: BookOpen, permission: CHARITY_PERMISSIONS.MANAGE_TRAINING },
  { href: '/super-admin/users', label: 'Users', icon: Users, charityAdminOnly: true },
  { href: '/super-admin/sessions', label: 'Workshops', icon: Calendar, permission: CHARITY_PERMISSIONS.MANAGE_SESSIONS },
  { href: '/super-admin/guide', label: 'How to Guide', icon: HelpCircle },
]

interface SuperAdminSidebarProps {
  onClose?: () => void
  mobile?: boolean
}

export function SuperAdminSidebar({ onClose, mobile }: SuperAdminSidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { colorTheme } = useColorTheme()
  const isClassic = colorTheme === 'classic'
  const isDark = colorTheme === 'dark'

  const role = session?.user?.role
  const isCharityAdmin = role === 'SUPER_ADMIN'
  const charityPermissions: string[] = session?.user?.charityPermissions ?? []

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
    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
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

  return (
    <div className={clsx('flex flex-col h-full', chrome.sidebar)}>
      {/* Logo */}
      <div className={clsx('flex items-center justify-between h-20 px-5 flex-shrink-0', chrome.logoBorder)}>
        {isClassic ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-aaa.svg" alt="Ambitious about Autism" className="h-16 w-auto dark:hidden" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-aaa-white.svg" alt="Ambitious about Autism" className="hidden h-16 w-auto dark:block" />
          </>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src="/logo-aaa-white.svg" alt="Ambitious about Autism" className="h-16 w-auto" />
        )}
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
      <nav className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1" aria-label="Super admin navigation">
        {visibleItems.map((item) => {
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
          href="/super-admin/settings"
          onClick={onClose}
          className={clsx(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all w-full',
            pathname === '/super-admin/settings' ? chrome.navActive : chrome.navInactive,
          )}
        >
          <Settings className={clsx('h-5 w-5 flex-shrink-0', pathname === '/super-admin/settings' ? chrome.iconActive : chrome.iconInactive)} />
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
