import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { isCharityLevel } from '@/lib/rbac'
import { getUserPrograms } from '@/lib/modules'
import Link from 'next/link'
import { BookOpen, ChevronRight } from 'lucide-react'
import { stripHtml } from '@/lib/rich-text'
import { HowToPanel } from '@/components/howto/panel'
import TrainingHowTo from '@/components/howto/learner/training'
import { EmptyState } from '@/components/ui/empty-state'
import { programAccent } from '@/lib/program-accent'
import { clsx } from 'clsx'

type Audience = 'EDUCATION' | 'EMPLOYER'

function parseAudience(value: string | string[] | undefined): Audience | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return null
  const upper = raw.toUpperCase()
  return upper === 'EDUCATION' || upper === 'EMPLOYER' ? upper : null
}

export default async function TrainingPage(
  props: {
    searchParams?: Promise<{ audience?: string | string[] }>
  }
) {
  const searchParams = await props.searchParams
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  // Determine which programs the user has access to
  let programs: { id: string; name: string; description: string | null; audience: Audience }[]

  if (isCharityLevel(session)) {
    // SUPER_ADMIN and CHARITY_EMPLOYEE can preview all active programs
    programs = await prisma.trainingProgram.findMany({
      where: { active: true },
      select: { id: true, name: true, description: true, audience: true },
      orderBy: { order: 'asc' },
    })
  } else {
    const allowed = await getUserPrograms(session.user.id)
    if (allowed.length === 0) redirect('/dashboard')

    programs = await prisma.trainingProgram.findMany({
      where: { id: { in: allowed.map((p) => p.id) }, active: true },
      select: { id: true, name: true, description: true, audience: true },
      orderBy: { order: 'asc' },
    })
  }

  if (programs.length === 0) redirect('/dashboard')

  const audiencesPresent = new Set<Audience>(programs.map((p) => p.audience))
  const showToggle = audiencesPresent.size > 1
  const requested = parseAudience(searchParams?.audience)
  const selected: Audience | null = showToggle ? (requested ?? 'EDUCATION') : null

  const visiblePrograms = selected
    ? programs.filter((p) => p.audience === selected)
    : programs

  // If exactly 1 program total (across all audiences), redirect straight to it
  if (programs.length === 1) {
    redirect(`/training/${programs[0].id}`)
  }

  // Multiple programs: show selection cards with progress summary
  const progressRecords = await prisma.trainingProgress.findMany({
    where: { userId: session.user.id, completed: true },
  })

  const programsWithProgress = await Promise.all(
    visiblePrograms.map(async (program) => {
      const modules = await prisma.module.findMany({
        where: { programId: program.id, active: true },
        include: { lessons: { where: { active: true }, select: { id: true } } },
      })
      const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0)
      const completedLessons = progressRecords.filter((p) =>
        modules.some((m) => m.id === p.moduleId)
      ).length
      return { ...program, totalLessons, completedLessons, moduleCount: modules.length }
    })
  )

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-page-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Training Programs</h1>
        <p className="text-slate-500 mt-1">
          Select a training program to continue your learning.
        </p>
      </div>

      {showToggle && (
        <div
          role="tablist"
          aria-label="Filter programs by audience"
          className="inline-flex rounded-xl border border-calm-200 bg-white p-1"
        >
          <Link
            role="tab"
            aria-selected={selected === 'EDUCATION'}
            href="/training?audience=education"
            scroll={false}
            className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
              selected === 'EDUCATION'
                ? 'bg-primary-600 text-white'
                : 'text-slate-600 hover:bg-calm-50'
            }`}
          >
            Education
          </Link>
          <Link
            role="tab"
            aria-selected={selected === 'EMPLOYER'}
            href="/training?audience=employer"
            scroll={false}
            className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
              selected === 'EMPLOYER'
                ? 'bg-primary-600 text-white'
                : 'text-slate-600 hover:bg-calm-50'
            }`}
          >
            Employer
          </Link>
        </div>
      )}

      {programsWithProgress.length === 0 ? (
        <EmptyState
          className="card"
          icon={BookOpen}
          title="No programmes here yet"
          description="When your organisation adds a programme in this category, it'll appear here."
          action={{ href: '/dashboard', label: 'Go to dashboard' }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-stagger">
          {programsWithProgress.map((program, idx) => {
            const pct = program.totalLessons > 0
              ? Math.round((program.completedLessons / program.totalLessons) * 100)
              : 0
            const accent = programAccent(idx)

            return (
              <Link
                key={program.id}
                href={`/training/${program.id}`}
                className="block overflow-hidden rounded-lg border border-slate-200 bg-white hover:shadow-md transition-all group dark:border-slate-800 dark:bg-slate-900"
              >
                <div className={clsx('relative h-16', accent.band)}>
                  <div className={clsx('absolute -bottom-6 left-5 flex h-12 w-12 items-center justify-center rounded-xl shadow-sm', accent.chip)}>
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <span className={clsx('absolute right-4 top-3 rounded-full px-2.5 py-0.5 text-xs font-bold', accent.chip)}>
                    {pct}%
                  </span>
                </div>

                <div className="px-5 pb-5 pt-9">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold text-slate-900 group-hover:text-primary-600 transition-colors">
                        {program.name}
                      </h2>
                      {program.description && stripHtml(program.description) && (
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">{stripHtml(program.description)}</p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary-500 transition-colors shrink-0 mt-1" />
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {program.moduleCount} modules &middot; {program.completedLessons}/{program.totalLessons} lessons
                    </div>
                    <div className="w-full h-2 bg-calm-200 rounded-full overflow-hidden">
                      <div
                        className={clsx('h-full rounded-full transition-all', accent.bar)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <HowToPanel>
        <TrainingHowTo />
      </HowToPanel>
    </div>
  )
}
