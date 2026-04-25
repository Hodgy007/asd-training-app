import Link from 'next/link'
import {
  Users,
  Calendar,
  Megaphone,
  BarChart3,
  Video,
  Shield,
  Lock,
  HelpCircle,
  FolderOpen,
  ChevronRight,
} from 'lucide-react'

export const metadata = {
  title: 'How to Guide | Org Admin',
}

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
    href: '/admin/guide/users',
    title: 'User Management',
    description: 'Create, edit, and manage users within your organisation.',
    icon: Users,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
  },
  {
    href: '/admin/guide/sessions',
    title: 'Virtual Classroom Sessions',
    description: 'Schedule Zoom/Teams sessions and track attendance.',
    icon: Calendar,
    iconColor: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    href: '/admin/guide/announcements',
    title: 'Announcements',
    description: 'Post org-scoped news with optional expiry dates.',
    icon: Megaphone,
    iconColor: 'text-orange-600 dark:text-orange-400',
    iconBg: 'bg-orange-50 dark:bg-orange-900/20',
  },
  {
    href: '/admin/guide/reports',
    title: 'Reports',
    description: 'Track training progress and engagement across your org.',
    icon: BarChart3,
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    iconBg: 'bg-indigo-50 dark:bg-indigo-900/20',
  },
  {
    href: '/admin/guide/meetings',
    title: 'Meeting Settings',
    description: 'Configure Zoom or Teams API for auto-generated links.',
    icon: Video,
    iconColor: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-50 dark:bg-purple-900/20',
  },
  {
    href: '/admin/guide/library',
    title: 'Document Library',
    description: 'View collections shared with your org and tweak titles.',
    icon: FolderOpen,
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    iconBg: 'bg-cyan-50 dark:bg-cyan-900/20',
  },
  {
    href: '/admin/guide/sso',
    title: 'Enterprise SSO',
    description: 'Configure SAML SSO with your identity provider.',
    icon: Shield,
    iconColor: 'text-slate-600 dark:text-slate-300',
    iconBg: 'bg-slate-100 dark:bg-slate-700',
  },
  {
    href: '/admin/guide/security',
    title: 'Security & MFA',
    description: 'Mandatory MFA for admins, plus password management.',
    icon: Lock,
    iconColor: 'text-rose-600 dark:text-rose-400',
    iconBg: 'bg-rose-50 dark:bg-rose-900/20',
  },
]

export default function OrgAdminGuidePage() {
  return (
    <div className="max-w-full space-y-6 animate-page-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <HelpCircle className="h-6 w-6 text-emerald-500" />
          How to Guide
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Everything you need to know about managing your organisation. Pick a topic to dive in.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TILES.map((tile) => {
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
