import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarDays,
  CircleCheckBig,
  Layers,
} from 'lucide-react'
import { LearningJourney } from '@/components/training/learning-journey'
import { DashboardAnnouncements } from '@/components/dashboard/announcements'
import { UpcomingSessions } from '@/components/dashboard/upcoming-sessions'
import { PendingSurveys } from '@/components/dashboard/pending-surveys'
import { isCharityLevel } from '@/lib/rbac'
import { getUserPrograms } from '@/lib/modules'
import { HowToPanel } from '@/components/howto/panel'
import DashboardHowTo from '@/components/howto/learner/dashboard'
import { CohortHub } from '@/components/dashboard/cohort-hub'
import { IconTile } from '@/components/ui/icon-tile'
import { ProgressBanner } from '@/components/dashboard/progress-banner'
import { getUpcomingSessions } from '@/lib/sessions'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  // The old PARTICIPANT and FAMILY_CARER dashboards were cut-down variants of
  // this one. With a single LEARNER role everyone gets the full dashboard —
  // it already renders announcements and the Cohort Hub below, and the Cohort
  // Hub no-ops for anyone without a cohort membership.

  const progressRecords = await prisma.trainingProgress.findMany({
    where: { userId: session.user.id, completed: true },
  })

  // Determine which programs the user can access via the canonical resolver.
  // For charity-level users return all active programs (preview mode).
  let allowedProgramIds: string[] = []
  if (isCharityLevel(session)) {
    const allPrograms = await prisma.trainingProgram.findMany({
      where: { active: true },
      select: { id: true },
    })
    allowedProgramIds = allPrograms.map((p) => p.id)
  } else {
    const allowed = await getUserPrograms(session.user.id)
    allowedProgramIds = allowed.map((p) => p.id)
  }

  const activeModules = allowedProgramIds.length > 0
    ? await prisma.module.findMany({
        where: { programId: { in: allowedProgramIds }, active: true },
        orderBy: [{ programId: 'asc' }, { order: 'asc' }],
        include: {
          lessons: { where: { active: true }, orderBy: { order: 'asc' }, select: { id: true, title: true } },
          program: { select: { id: true, name: true } },
        },
      })
    : []

  const totalLessons = activeModules.reduce((acc, m) => acc + m.lessons.length, 0)
  const completedLessons = progressRecords.length
  const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  const firstName = session.user.name?.split(' ')[0] || 'there'

  // What the banner's button leads to: the first lesson not yet done, in
  // programme and module order. Modules are already sorted that way above.
  const completedLessonIds = new Set(progressRecords.map((p) => p.lessonId))
  const completedModules = activeModules.filter(
    (m) => m.lessons.length > 0 && m.lessons.every((l) => completedLessonIds.has(l.id)),
  ).length
  let nextStep: { label: string; href: string; cta: string } | null = null
  for (const m of activeModules) {
    const lesson = m.lessons.find((l) => !completedLessonIds.has(l.id))
    if (lesson) {
      nextStep = {
        label: `Next up: ${m.title} · ${lesson.title}`,
        href: `/training/${m.program.id}/${m.id}/${lesson.id}`,
        cta: completedLessons > 0 ? 'Continue' : 'Start training',
      }
      break
    }
  }
  if (!nextStep && totalLessons > 0) {
    nextStep = { label: "You've completed all your training. Well done.", href: '/training', cta: 'Review training' }
  }

  const upcomingWorkshops = (await getUpcomingSessions(session.user.id)).length

  const stats = [
    { icon: CircleCheckBig, tone: 'success' as const, value: completedLessons, total: totalLessons, label: 'Lessons completed' },
    { icon: Layers, tone: 'primary' as const, value: completedModules, total: activeModules.length, label: 'Modules completed' },
    { icon: CalendarDays, tone: 'info' as const, value: upcomingWorkshops, total: null, label: 'Upcoming workshops' },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-page-enter">
      <ProgressBanner firstName={firstName} progressPct={progressPct} next={nextStep} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-stagger">
        {stats.map((stat) => (
          <div key={stat.label} className="card flex items-center gap-4">
            <IconTile icon={stat.icon} tone={stat.tone} size="lg" />
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stat.value}
                {stat.total !== null && (
                  <span className="text-slate-400 text-base font-normal">/{stat.total}</span>
                )}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <DashboardAnnouncements />
      <CohortHub userId={session.user.id} />
      <UpcomingSessions />
      <PendingSurveys />

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Training Progress</h2>
          <Link
            href="/training"
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
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

      <HowToPanel>
        <DashboardHowTo />
      </HowToPanel>
    </div>
  )
}
