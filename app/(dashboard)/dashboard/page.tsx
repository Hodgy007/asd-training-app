import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  BookOpen,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import { LearningJourney } from '@/components/training/learning-journey'
import { DashboardAnnouncements } from '@/components/dashboard/announcements'
import { UpcomingSessions } from '@/components/dashboard/upcoming-sessions'
import { PendingSurveys } from '@/components/dashboard/pending-surveys'
import { ExploreMoreCard } from '@/components/courses/explore-more-card'
import { isCharityLevel } from '@/lib/rbac'
import { HowToPanel } from '@/components/howto/panel'
import DashboardHowTo from '@/components/howto/learner/dashboard'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const progressRecords = await prisma.trainingProgress.findMany({
    where: { userId: session.user.id, completed: true },
  })

  // Determine which programs the user can access
  let allowedProgramIds: string[] = []
  if (isCharityLevel(session)) {
    const allPrograms = await prisma.trainingProgram.findMany({
      where: { active: true },
      select: { id: true },
    })
    allowedProgramIds = allPrograms.map((p) => p.id)
  } else {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { organisation: { select: { allowedProgramIds: true } } },
    })
    allowedProgramIds = user?.organisation?.allowedProgramIds ?? []
  }

  const activeModules = allowedProgramIds.length > 0
    ? await prisma.module.findMany({
        where: { programId: { in: allowedProgramIds }, active: true },
        orderBy: [{ programId: 'asc' }, { order: 'asc' }],
        include: {
          lessons: { where: { active: true }, select: { id: true } },
          program: { select: { id: true, name: true } },
        },
      })
    : []

  const totalLessons = activeModules.reduce((acc, m) => acc + m.lessons.length, 0)
  const completedLessons = progressRecords.length
  const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  const firstName = session.user.name?.split(' ')[0] || 'there'
  const firstProgramId = allowedProgramIds[0]

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-page-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome back, {firstName}</h1>
        <p className="text-slate-500 mt-1">Here&apos;s an overview of your training progress.</p>
      </div>

      <DashboardAnnouncements />
      <UpcomingSessions />
      <PendingSurveys />

      <div className="grid grid-cols-1 sm:grid-cols-1 max-w-sm gap-4 animate-stagger">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <BookOpen className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">
              {completedLessons}
              <span className="text-slate-400 text-base font-normal">/{totalLessons}</span>
            </p>
            <p className="text-sm text-slate-500">Lessons completed</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Training Progress</h2>
            <Link
              href="/training"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-1 mb-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Overall completion</span>
              <span className="font-medium text-slate-900">{progressPct}%</span>
            </div>
            <div className="w-full h-3 bg-calm-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full animate-progress"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <div className="space-y-2">
            {activeModules.length > 0 && (() => {
              const journeyModules = activeModules.map((module, idx) => {
                const moduleLessons = module.lessons.length
                const completedModuleLessons = progressRecords.filter(
                  (p) => p.moduleId === module.id
                ).length
                const moduleComplete = completedModuleLessons === moduleLessons && moduleLessons > 0
                const prevComplete = idx === 0 || (() => {
                  const prev = activeModules[idx - 1]
                  const prevCompleted = progressRecords.filter(p => p.moduleId === prev.id).length
                  return prevCompleted === prev.lessons.length && prev.lessons.length > 0
                })()
                const status: 'complete' | 'in-progress' | 'locked' = moduleComplete
                  ? 'complete'
                  : prevComplete
                  ? 'in-progress'
                  : 'locked'
                return {
                  id: module.id,
                  title: module.title,
                  order: module.order,
                  programId: module.program.id,
                  programName: module.program.name,
                  totalLessons: moduleLessons,
                  completedLessons: completedModuleLessons,
                  status,
                }
              })
              const firstProgramIdLocal = journeyModules[0]?.programId ?? ''
              return <LearningJourney modules={journeyModules} programId={firstProgramIdLocal} />
            })()}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
            <div className="space-y-2 animate-stagger">
              <Link
                href={firstProgramId ? `/training/${firstProgramId}` : '/training'}
                className="flex items-center gap-3 p-3 bg-sage-50 hover:bg-sage-100 rounded-xl transition-colors group"
              >
                <TrendingUp className="h-5 w-5 text-sage-600" />
                <span className="text-sm font-medium text-sage-700">Continue training</span>
                <ArrowRight className="h-4 w-4 text-sage-400 ml-auto group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
          <ExploreMoreCard session={session} />
        </div>
      </div>

      <HowToPanel>
        <DashboardHowTo />
      </HowToPanel>
    </div>
  )
}
