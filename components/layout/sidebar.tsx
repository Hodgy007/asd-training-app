'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  FileText,
  Heart,
  LogOut,
  X,
} from 'lucide-react'
import { clsx } from 'clsx'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/training', label: 'Training', icon: BookOpen },
  { href: '/children', label: 'Children', icon: Users },
  { href: '/reports', label: 'Reports', icon: FileText },
]

interface SidebarProps {
  onClose?: () => void
  mobile?: boolean
}

export function Sidebar({ onClose, mobile }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full bg-white border-r border-calm-200">
      {/* Logo */}
      <div className="flex items-center justify-between p-6 border-b border-calm-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Heart className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm leading-tight">ASD Awareness</p>
            <p className="text-xs text-slate-400">UK Charity</p>
          </div>
        </div>
        {mobile && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-calm-100"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

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
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary-50 text-primary-700 shadow-sm'
                  : 'text-slate-600 hover:bg-calm-50 hover:text-slate-900'
              )}
            >
              <Icon
                className={clsx('h-5 w-5 flex-shrink-0', isActive ? 'text-primary-600' : 'text-slate-400')}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-calm-200 space-y-2">
        <div className="bg-amber-50 rounded-xl p-3 mb-3">
          <p className="text-xs text-amber-700 leading-relaxed">
            <strong>Reminder:</strong> This tool does not diagnose. Share observations with your GP
            or health visitor.
          </p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all w-full"
        >
          <LogOut className="h-5 w-5 text-slate-400" />
          Sign out
        </button>
      </div>
    </div>
  )
}
