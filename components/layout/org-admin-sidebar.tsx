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

  const isParentOrg = session?.user?.isParentOrg ?? false
  const navItems: NavItem[] = [
    ...BASE_NAV_ITEMS,
    ...(isParentOrg ? [PARENT_ORG_NAV] : []),
    ...COMMON_NAV_ITEMS,
  ]

  return (
    <div className="flex flex-col h-full bg-primary-500 dark:bg-primary-600 border-r border-primary-600 dark:border-primary-700">
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-primary-600 dark:border-primary-700 bg-primary-500 dark:bg-primary-600 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="18,2 34,32 2,32" fill="#f5821f" />
              <polygon points="18,10 28,28 8,28" fill="#fcaf17" opacity="0.7" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">Ambitious about</p>
            <p className="font-bold text-white text-sm leading-tight">Autism</p>
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
                isActive
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon
                className={clsx(
                  'h-5 w-5 flex-shrink-0',
                  isActive ? 'text-white' : 'text-white/60'
                )}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-white/20 space-y-2">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-white/80 hover:bg-red-500/20 hover:text-red-200 transition-all w-full"
        >
          <LogOut className="h-5 w-5 text-white/60" />
          Sign out
        </button>
      </div>
    </div>
  )
}
