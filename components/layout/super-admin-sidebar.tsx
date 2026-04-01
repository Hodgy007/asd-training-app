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
  LogOut,
  X,
  Crown,
  Users,
  HelpCircle,
  Calendar,
  Settings,
  FolderOpen,
  Plug,
} from 'lucide-react'
import { clsx } from 'clsx'
import { CHARITY_PERMISSIONS } from '@/lib/rbac'

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

const NAV_ITEMS: NavItem[] = [
  { href: '/super-admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/super-admin/users', label: 'Users', icon: Users, charityAdminOnly: true },
  { href: '/super-admin/organisations', label: 'Organisations', icon: Building2, permission: CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS },
  { href: '/super-admin/library', label: 'Document Library', icon: FolderOpen, permission: CHARITY_PERMISSIONS.MANAGE_LIBRARY },
  { href: '/super-admin/training', label: 'Training Content', icon: BookOpen, permission: CHARITY_PERMISSIONS.MANAGE_TRAINING },
  { href: '/super-admin/surveys', label: 'Surveys', icon: ClipboardList, permission: CHARITY_PERMISSIONS.MANAGE_SURVEYS },
  { href: '/super-admin/announcements', label: 'Announcements', icon: Megaphone, permission: CHARITY_PERMISSIONS.MANAGE_ANNOUNCEMENTS },
  { href: '/super-admin/sessions', label: 'Workshops', icon: Calendar, permission: CHARITY_PERMISSIONS.MANAGE_SESSIONS },
  { href: '/super-admin/reports', label: 'Reports', icon: BarChart3, permission: CHARITY_PERMISSIONS.VIEW_REPORTS },
  { href: '/super-admin/integrations', label: 'Integrations', icon: Plug, charityAdminOnly: true },
  { href: '/super-admin/settings', label: 'Settings', icon: Settings, charityAdminOnly: true },
  { href: '/super-admin/guide', label: 'How to Guide', icon: HelpCircle },
]

interface SuperAdminSidebarProps {
  onClose?: () => void
  mobile?: boolean
}

export function SuperAdminSidebar({ onClose, mobile }: SuperAdminSidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()

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

      {/* Role badge */}
      <div className="px-5 py-2 border-b border-calm-100 dark:border-slate-700">
        <span className={clsx(
          'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
          badgeStyle,
        )}>
          <Crown className="h-3 w-3" />
          {badgeLabel}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1" aria-label="Super admin navigation">
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
                isActive
                  ? 'bg-purple-50 text-purple-600 shadow-sm dark:bg-purple-900/30 dark:text-purple-400'
                  : 'text-slate-600 hover:bg-calm-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100'
              )}
            >
              <Icon
                className={clsx(
                  'h-5 w-5 flex-shrink-0',
                  isActive ? 'text-purple-500 dark:text-purple-400' : 'text-slate-400 dark:text-slate-500'
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
