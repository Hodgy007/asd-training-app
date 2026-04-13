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
  HelpCircle,
  LogOut,
  X,
  ShieldCheck,
  FolderOpen,
  Building2,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useColorTheme } from '@/components/providers/color-theme-provider'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  exact?: boolean
}

const BASE_NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Users', icon: Users, exact: true },
]

const PARENT_ORG_NAV: NavItem = { href: '/admin/schools', label: 'Schools', icon: Building2 }

const COMMON_NAV_ITEMS: NavItem[] = [
  { href: '/admin/sessions', label: 'Workshops', icon: Calendar },
  { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/admin/library', label: 'Document Library', icon: FolderOpen },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/settings/meetings', label: 'Meeting Settings', icon: Video },
  { href: '/admin/settings/sso', label: 'Enterprise SSO', icon: Shield },
  { href: '/admin/guide', label: 'How to Guide', icon: HelpCircle },
]

interface OrgAdminSidebarProps {
  onClose?: () => void
  mobile?: boolean
}

export function OrgAdminSidebar({ onClose, mobile }: OrgAdminSidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { colorTheme } = useColorTheme()
  const isClassic = colorTheme === 'classic'

  const isParentOrg = session?.user?.isParentOrg ?? false
  const navItems: NavItem[] = [
    ...BASE_NAV_ITEMS,
    ...(isParentOrg ? [PARENT_ORG_NAV] : []),
    ...COMMON_NAV_ITEMS,
  ]

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

      {/* Org Admin badge */}
      <div className="px-5 py-2 border-b border-calm-100 dark:border-slate-700">
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          <ShieldCheck className="h-3 w-3" />
          Org Admin
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1" aria-label="Org admin navigation">
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
