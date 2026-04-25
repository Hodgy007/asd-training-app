'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  Palette,
  Video,
  Shield,
  Plug,
  ChevronRight,
  Settings as SettingsIcon,
} from 'lucide-react'

interface Tile {
  href: string
  title: string
  description: string
  icon: React.ElementType
  iconColor: string
  iconBg: string
}

const TILES: Tile[] = [
  {
    href: '/super-admin/settings/appearance',
    title: 'Appearance',
    description: 'Colour theme and font settings.',
    icon: Palette,
    iconColor: 'text-pink-600 dark:text-pink-400',
    iconBg: 'bg-pink-100 dark:bg-pink-900/40',
  },
  {
    href: '/super-admin/settings/meetings',
    title: 'Meeting Configuration',
    description: 'Zoom or Microsoft Teams credentials for charity-level workshops.',
    icon: Video,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
  },
  {
    href: '/super-admin/settings/sso',
    title: 'SSO Configuration',
    description: 'SAML single sign-on for charity users.',
    icon: Shield,
    iconColor: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
  },
  {
    href: '/super-admin/settings/integrations',
    title: 'Integrations',
    description: 'API keys and Power Automate / Dynamics 365 connection guide.',
    icon: Plug,
    iconColor: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-900/40',
  },
]

export default function CharitySettingsIndexPage() {
  const { data: session } = useSession()
  const role = session?.user?.role

  if (role && role !== 'SUPER_ADMIN') {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center text-slate-500 dark:text-slate-400">
        Access denied. Charity Admin only.
      </div>
    )
  }

  return (
    <div className="max-w-full space-y-6 animate-page-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-purple-500" />
          Settings
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Charity-level platform configuration.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TILES.map((tile) => {
          const Icon = tile.icon
          return (
            <Link
              key={tile.href}
              href={tile.href}
              className="card group hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl ${tile.iconBg} flex-shrink-0`}>
                  <Icon className={`h-5 w-5 ${tile.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      {tile.title}
                    </h3>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 flex-shrink-0 transition-colors" />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {tile.description}
                  </p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
