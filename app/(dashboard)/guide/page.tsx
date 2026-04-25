'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  Settings,
  HelpCircle,
  ClipboardList,
  FileText,
  Compass,
  FolderOpen,
  Briefcase,
  ChevronRight,
} from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  CAREER_DEV_OFFICER: 'Careers Professional',
  STUDENT: 'Student',
  INTERN: 'Intern',
  EMPLOYEE: 'Employee',
}

interface Tile {
  href: string
  title: string
  description: string
  icon: React.ElementType
  iconColor: string
  iconBg: string
}

const COMMON_TILES: Tile[] = [
  {
    href: '/guide/dashboard',
    title: 'Dashboard',
    description: 'Your personalised overview of activity, announcements, and progress.',
    icon: LayoutDashboard,
    iconColor: 'text-primary-600 dark:text-primary-400',
    iconBg: 'bg-primary-50 dark:bg-primary-900/20',
  },
  {
    href: '/guide/training',
    title: 'Training',
    description: 'Lessons, quizzes, audio playback, and Certificates of Completion.',
    icon: BookOpen,
    iconColor: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-50 dark:bg-amber-900/20',
  },
  {
    href: '/guide/surveys',
    title: 'Surveys',
    description: 'How surveys work and how to complete them on your dashboard.',
    icon: ClipboardList,
    iconColor: 'text-pink-600 dark:text-pink-400',
    iconBg: 'bg-pink-50 dark:bg-pink-900/20',
  },
  {
    href: '/guide/library',
    title: 'Document Library',
    description: 'Find shared collections, guides, templates, and policies.',
    icon: FolderOpen,
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    iconBg: 'bg-cyan-50 dark:bg-cyan-900/20',
  },
  {
    href: '/guide/workshops',
    title: 'Virtual Workshops',
    description: 'Join live sessions on Zoom, Teams, or custom platforms.',
    icon: Calendar,
    iconColor: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    href: '/guide/settings',
    title: 'Settings',
    description: 'Manage your password and view your account details.',
    icon: Settings,
    iconColor: 'text-slate-600 dark:text-slate-300',
    iconBg: 'bg-slate-100 dark:bg-slate-700',
  },
]

const CV_TILES: Tile[] = [
  {
    href: '/guide/cv-builder',
    title: 'CV Builder',
    description: 'Build a UK-format CV step by step with AI writing help.',
    icon: FileText,
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    iconBg: 'bg-indigo-50 dark:bg-indigo-900/20',
  },
  {
    href: '/guide/careers-advisor',
    title: 'Careers Advisor',
    description: 'Personalised career suggestions based on guided questions.',
    icon: Compass,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
  },
  {
    href: '/guide/jobs',
    title: 'Jobs',
    description: 'Browse curated openings with autism-friendly notes.',
    icon: Briefcase,
    iconColor: 'text-rose-600 dark:text-rose-400',
    iconBg: 'bg-rose-50 dark:bg-rose-900/20',
  },
]

export default function GuidePage() {
  const { data: session } = useSession()
  const role = session?.user?.role ?? ''
  const roleLabel = ROLE_LABELS[role] ?? 'User'
  const firstName = session?.user?.name?.split(' ')[0] ?? 'there'
  const isCVRole = ['CAREER_DEV_OFFICER', 'STUDENT', 'INTERN', 'EMPLOYEE'].includes(role)

  const tiles = isCVRole ? [...COMMON_TILES, ...CV_TILES] : COMMON_TILES

  return (
    <div className="max-w-full space-y-6 animate-page-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <HelpCircle className="h-6 w-6 text-primary-500" />
          How to Guide
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Welcome, {firstName}! Here&apos;s everything you need to know about using the platform as a {roleLabel}. Pick a topic to dive in.
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
