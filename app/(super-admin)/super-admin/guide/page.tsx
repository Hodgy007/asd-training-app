import Link from 'next/link'
import {
  LayoutDashboard,
  Building2,
  BookOpen,
  ClipboardList,
  Megaphone,
  BarChart3,
  Shield,
  Users,
  Users2,
  Settings,
  HelpCircle,
  Plug,
  FolderOpen,
  Briefcase,
  Bot,
  TrendingUp,
  ChevronRight,
} from 'lucide-react'

export const metadata = {
  title: 'How to Guide | Super Admin',
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
    href: '/super-admin/guide/overview',
    title: 'Overview Dashboard',
    description: 'Your daily landing page with platform-wide stats and quick links.',
    icon: LayoutDashboard,
    iconColor: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-50 dark:bg-purple-900/20',
  },
  {
    href: '/super-admin/guide/users',
    title: 'Managing Charity Users',
    description: 'Create Charity Admins and Charity Employees, and reset passwords.',
    icon: Users,
    iconColor: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    href: '/super-admin/guide/organisations',
    title: 'Managing Organisations',
    description: 'Create orgs, set training programs, and assign collections.',
    icon: Building2,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
  },
  {
    href: '/super-admin/guide/training',
    title: 'Training Content',
    description: 'Build programs, lessons, quizzes, and SCORM packages.',
    icon: BookOpen,
    iconColor: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-50 dark:bg-amber-900/20',
  },
  {
    href: '/super-admin/guide/library',
    title: 'Document Library',
    description: 'Organise files into collections and target them by org and role.',
    icon: FolderOpen,
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    iconBg: 'bg-cyan-50 dark:bg-cyan-900/20',
  },
  {
    href: '/super-admin/guide/surveys',
    title: 'Survey Management',
    description: 'Build surveys, target audiences, and generate AI insights.',
    icon: ClipboardList,
    iconColor: 'text-pink-600 dark:text-pink-400',
    iconBg: 'bg-pink-50 dark:bg-pink-900/20',
  },
  {
    href: '/super-admin/guide/announcements',
    title: 'Announcements',
    description: 'Send global or org-scoped messages with optional expiry dates.',
    icon: Megaphone,
    iconColor: 'text-orange-600 dark:text-orange-400',
    iconBg: 'bg-orange-50 dark:bg-orange-900/20',
  },
  {
    href: '/super-admin/guide/reports',
    title: 'Reports',
    description: 'Platform-wide training, survey, and library analytics.',
    icon: BarChart3,
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    iconBg: 'bg-indigo-50 dark:bg-indigo-900/20',
  },
  {
    href: '/super-admin/guide/access',
    title: 'User & Access Management',
    description: 'Roles explained, MFA enforcement, and SSO setup.',
    icon: Shield,
    iconColor: 'text-slate-600 dark:text-slate-300',
    iconBg: 'bg-slate-100 dark:bg-slate-700',
  },
  {
    href: '/super-admin/guide/charity-employees',
    title: 'Charity Employee Permissions',
    description: 'Delegate access via the nine permission flags.',
    icon: Shield,
    iconColor: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    href: '/super-admin/guide/cohorts',
    title: 'Cohorts',
    description: 'Group-based delivery with ring-fenced reporting.',
    icon: Users2,
    iconColor: 'text-teal-600 dark:text-teal-400',
    iconBg: 'bg-teal-50 dark:bg-teal-900/20',
  },
  {
    href: '/super-admin/guide/jobs',
    title: 'Job Openings',
    description: 'Curate roles for learners with autism-friendly notes.',
    icon: Briefcase,
    iconColor: 'text-rose-600 dark:text-rose-400',
    iconBg: 'bg-rose-50 dark:bg-rose-900/20',
  },
  {
    href: '/super-admin/guide/ai-prompts',
    title: 'AI Prompts',
    description: 'Tune the prompts that drive every AI feature.',
    icon: Bot,
    iconColor: 'text-violet-600 dark:text-violet-400',
    iconBg: 'bg-violet-50 dark:bg-violet-900/20',
  },
  {
    href: '/super-admin/guide/impact',
    title: 'Impact',
    description: 'Charity-wide outcomes for trustees and funders.',
    icon: TrendingUp,
    iconColor: 'text-green-600 dark:text-green-400',
    iconBg: 'bg-green-50 dark:bg-green-900/20',
  },
  {
    href: '/super-admin/guide/integrations',
    title: 'Integrations',
    description: 'Power Automate, Dynamics 365, and the reporting API.',
    icon: Plug,
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    iconBg: 'bg-yellow-50 dark:bg-yellow-900/20',
  },
  {
    href: '/super-admin/guide/settings',
    title: 'Settings',
    description: 'Meeting platform integration and SAML SSO config.',
    icon: Settings,
    iconColor: 'text-slate-600 dark:text-slate-300',
    iconBg: 'bg-slate-100 dark:bg-slate-700',
  },
]

export default function SuperAdminGuidePage() {
  return (
    <div className="max-w-full space-y-6 animate-page-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <HelpCircle className="h-6 w-6 text-purple-500" />
          How to Guide
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Step-by-step instructions for every area of the Charity Admin panel. Pick a topic to dive in.
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
