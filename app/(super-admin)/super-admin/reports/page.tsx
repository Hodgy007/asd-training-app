'use client'

import Link from 'next/link'
import {
  BarChart3,
  Target,
  FolderOpen,
  ClipboardList,
  FileCheck,
  Briefcase,
  PoundSterling,
  TrendingUp,
  ChevronRight,
  Users,
} from 'lucide-react'
import { HowToPanel } from '@/components/howto/panel'
import ReportsHowTo from '@/components/howto/super-admin/reports'

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
    href: '/super-admin/reports/training',
    title: 'Training Completion',
    description: 'Module completion rates by organisation.',
    icon: BarChart3,
    iconColor: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-100 dark:bg-purple-900/40',
  },
  {
    href: '/super-admin/reports/scorm-quizzes',
    title: 'SCORM Quiz Analytics',
    description: 'Per-question correctness — surfaces material that needs updating.',
    icon: ClipboardList,
    iconColor: 'text-rose-600 dark:text-rose-400',
    iconBg: 'bg-rose-100 dark:bg-rose-900/40',
  },
  {
    href: '/super-admin/reports/gatsby',
    title: 'Gatsby Benchmarks',
    description: 'Coverage of the 8 Gatsby Benchmarks across modules.',
    icon: Target,
    iconColor: 'text-primary-600 dark:text-primary-400',
    iconBg: 'bg-primary-100 dark:bg-primary-900/40',
  },
  {
    href: '/super-admin/reports/library',
    title: 'Document Library',
    description: 'Downloads across all document collections.',
    icon: FolderOpen,
    iconColor: 'text-primary-600 dark:text-primary-400',
    iconBg: 'bg-primary-100 dark:bg-primary-900/40',
  },
  {
    href: '/super-admin/reports/surveys',
    title: 'Surveys',
    description: 'Response rates and answer breakdowns.',
    icon: ClipboardList,
    iconColor: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-100 dark:bg-purple-900/40',
  },
  {
    href: '/super-admin/reports/cv-builder',
    title: 'CV Builder',
    description: 'CV creation activity by status and template.',
    icon: FileCheck,
    iconColor: 'text-primary-600 dark:text-primary-400',
    iconBg: 'bg-primary-100 dark:bg-primary-900/40',
  },
  {
    href: '/super-admin/reports/careers-advisor',
    title: 'Careers Advisor',
    description: 'AI careers advisor session activity.',
    icon: Users,
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',
  },
  {
    href: '/super-admin/reports/jobs',
    title: 'Job Openings',
    description: 'Published jobs and learner assignments.',
    icon: Briefcase,
    iconColor: 'text-primary-600 dark:text-primary-400',
    iconBg: 'bg-primary-100 dark:bg-primary-900/40',
  },
  {
    href: '/super-admin/reports/revenue',
    title: 'Revenue',
    description: 'Purchases, subscriptions and recurring revenue.',
    icon: PoundSterling,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
  },
  {
    href: '/super-admin/reports/usage',
    title: 'Usage & Reach',
    description: 'Live platform usage and national reach projections.',
    icon: TrendingUp,
    iconColor: 'text-teal-600 dark:text-teal-400',
    iconBg: 'bg-teal-100 dark:bg-teal-900/40',
  },
]

export default function SuperAdminReportsIndexPage() {
  return (
    <div className="max-w-full space-y-6 animate-page-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          Reports
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Pick a section to view detailed reporting.
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

      <HowToPanel>
        <ReportsHowTo />
      </HowToPanel>
    </div>
  )
}
