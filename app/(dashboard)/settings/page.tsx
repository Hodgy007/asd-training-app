'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  User,
  CreditCard,
  Palette,
  Lock,
  Shield,
  AlertTriangle,
  Settings as SettingsIcon,
  ChevronRight,
} from 'lucide-react'

interface Tile {
  href: string
  title: string
  description: string
  icon: React.ElementType
  iconColor: string
  iconBg: string
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const showBilling = session?.user?.isPersonalOrg
  const showPassword = session?.user?.hasPassword !== false

  const tiles: Tile[] = [
    {
      href: '/settings/account',
      title: 'Your Account',
      description: 'View your name, email, and role.',
      icon: User,
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    ...(showBilling
      ? [
          {
            href: '/settings/billing',
            title: 'Billing',
            description: 'Manage your subscription and payment method.',
            icon: CreditCard,
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
          } as Tile,
        ]
      : []),
    {
      href: '/settings/appearance',
      title: 'Appearance',
      description: 'Choose a colour theme, font, and text size.',
      icon: Palette,
      iconColor: 'text-pink-600 dark:text-pink-400',
      iconBg: 'bg-pink-50 dark:bg-pink-900/20',
    },
    ...(showPassword
      ? [
          {
            href: '/settings/password',
            title: 'Change Password',
            description: 'Update the password you use to sign in.',
            icon: Lock,
            iconColor: 'text-amber-600 dark:text-amber-400',
            iconBg: 'bg-amber-50 dark:bg-amber-900/20',
          } as Tile,
        ]
      : []),
    {
      href: '/settings/privacy',
      title: 'Data & Privacy',
      description: 'How your data is stored and your UK GDPR rights.',
      icon: Shield,
      iconColor: 'text-slate-600 dark:text-slate-300',
      iconBg: 'bg-slate-100 dark:bg-slate-700',
    },
    {
      href: '/settings/danger',
      title: 'Danger Zone',
      description: 'Permanently delete your account and all data.',
      icon: AlertTriangle,
      iconColor: 'text-red-600 dark:text-red-400',
      iconBg: 'bg-red-50 dark:bg-red-900/20',
    },
  ]

  return (
    <div className="max-w-full space-y-6 animate-page-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-primary-500" />
          Settings
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Manage your account, appearance, and data.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map((tile) => {
          const Icon = tile.icon
          return (
            <Link
              key={tile.href}
              href={tile.href}
              className="card group hover:shadow-md hover:-translate-y-0.5 transition-all p-5 flex items-start gap-4"
            >
              <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${tile.iconBg}`}>
                <Icon className={`h-5 w-5 ${tile.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-semibold text-slate-900 dark:text-white">{tile.title}</h2>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{tile.description}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
