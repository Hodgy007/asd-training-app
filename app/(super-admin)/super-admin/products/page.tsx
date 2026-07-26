'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  Megaphone,
  ShoppingBag,
  UsersRound,
  FolderOpen,
  Home,
  Briefcase,
  ClipboardList,
  BookOpen,
  Calendar,
  ChevronRight,
  Package,
  Sparkles,
} from 'lucide-react'
import { CHARITY_PERMISSIONS } from '@/lib/rbac'

interface Tile {
  href: string
  title: string
  description: string
  icon: React.ElementType
  iconColor: string
  iconBg: string
  permission?: string
  charityAdminOnly?: boolean
  openInNewTab?: boolean
}

const TILES: Tile[] = [
  {
    href: '/super-admin/ai-prompts',
    title: 'AI Prompts',
    description: 'Tune the AI behaviours used across the platform.',
    icon: Sparkles,
    iconColor: 'text-fuchsia-600 dark:text-fuchsia-400',
    iconBg: 'bg-fuchsia-100 dark:bg-fuchsia-900/40',
    permission: CHARITY_PERMISSIONS.MANAGE_AI_PROMPTS,
  },
  {
    href: '/super-admin/announcements',
    title: 'Announcements',
    description: 'Platform-wide and org-scoped announcements.',
    icon: Megaphone,
    iconColor: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-900/40',
    permission: CHARITY_PERMISSIONS.MANAGE_ANNOUNCEMENTS,
  },
  {
    href: '/super-admin/brand-assets',
    title: 'Brand Assets',
    description: 'Charity branding (logos, guidelines, imagery, palette, tone-of-voice). Pickable in image fields and feedable to AI.',
    icon: Sparkles,
    iconColor: 'text-fuchsia-600 dark:text-fuchsia-400',
    iconBg: 'bg-fuchsia-100 dark:bg-fuchsia-900/40',
    permission: CHARITY_PERMISSIONS.MANAGE_LIBRARY,
  },
  {
    href: '/courses?audience=education',
    title: 'Catalogue – Education',
    description: 'Public course catalogue, education programs only.',
    icon: ShoppingBag,
    iconColor: 'text-pink-600 dark:text-pink-400',
    iconBg: 'bg-pink-100 dark:bg-pink-900/40',
    openInNewTab: true,
  },
  {
    href: '/courses?audience=employer',
    title: 'Catalogue – Employer',
    description: 'Public course catalogue, employer programs only.',
    icon: ShoppingBag,
    iconColor: 'text-pink-600 dark:text-pink-400',
    iconBg: 'bg-pink-100 dark:bg-pink-900/40',
    openInNewTab: true,
  },
  {
    href: '/super-admin/cohorts',
    title: 'Cohorts',
    description: 'Manage learner cohorts across organisations.',
    icon: UsersRound,
    iconColor: 'text-primary-600 dark:text-primary-400',
    iconBg: 'bg-primary-100 dark:bg-primary-900/40',
    // Must match what the cohort routes actually enforce. This tile used to be
    // gated on MANAGE_ORGANISATIONS while every route under /api/super-admin/
    // cohorts checks MANAGE_COHORTS, so the permission that does the work hid
    // the only way to reach it and the permission that showed the tile got a 403.
    permission: CHARITY_PERMISSIONS.MANAGE_COHORTS,
  },
  {
    href: '/super-admin/library',
    title: 'Document Library',
    description: 'Document collections and downloads.',
    icon: FolderOpen,
    iconColor: 'text-primary-600 dark:text-primary-400',
    iconBg: 'bg-primary-100 dark:bg-primary-900/40',
    permission: CHARITY_PERMISSIONS.MANAGE_LIBRARY,
  },
  {
    href: '/super-admin/home',
    title: 'Home Page',
    description: 'Edit the authenticated home page content.',
    icon: Home,
    iconColor: 'text-teal-600 dark:text-teal-400',
    iconBg: 'bg-teal-100 dark:bg-teal-900/40',
    charityAdminOnly: true,
  },
  {
    href: '/super-admin/jobs',
    title: 'Job Openings',
    description: 'Publish and assign job openings to learners.',
    icon: Briefcase,
    iconColor: 'text-primary-600 dark:text-primary-400',
    iconBg: 'bg-primary-100 dark:bg-primary-900/40',
    permission: CHARITY_PERMISSIONS.MANAGE_JOBS,
  },
  {
    href: '/super-admin/surveys',
    title: 'Surveys',
    description: 'Targeted surveys with AI-generated insights.',
    icon: ClipboardList,
    iconColor: 'text-primary-600 dark:text-primary-400',
    iconBg: 'bg-primary-100 dark:bg-primary-900/40',
    permission: CHARITY_PERMISSIONS.MANAGE_SURVEYS,
  },
  {
    href: '/super-admin/training',
    title: 'Training Content',
    description: 'Programs, modules, lessons and quizzes.',
    icon: BookOpen,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    permission: CHARITY_PERMISSIONS.MANAGE_TRAINING,
  },
  {
    href: '/super-admin/sessions',
    title: 'Workshops',
    description: 'Schedule virtual classroom sessions.',
    icon: Calendar,
    iconColor: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    permission: CHARITY_PERMISSIONS.MANAGE_SESSIONS,
  },
]

export default function SuperAdminProductsIndexPage() {
  const { data: session } = useSession()
  const role = session?.user?.role
  const isCharityAdmin = role === 'SUPER_ADMIN'
  const charityPermissions: string[] = session?.user?.charityPermissions ?? []

  function canSee(tile: Tile): boolean {
    if (isCharityAdmin) return true
    if (tile.charityAdminOnly) return false
    if (tile.permission) return charityPermissions.includes(tile.permission)
    return true
  }

  const visibleTiles = TILES.filter(canSee)

  return (
    <div className="max-w-full space-y-6 animate-page-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Package className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          Products
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Manage the products and content available across the platform.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleTiles.map((tile) => {
          const Icon = tile.icon
          return (
            <Link
              key={tile.href}
              href={tile.href}
              target={tile.openInNewTab ? '_blank' : undefined}
              rel={tile.openInNewTab ? 'noopener noreferrer' : undefined}
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
