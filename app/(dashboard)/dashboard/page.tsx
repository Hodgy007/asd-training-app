import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  BookOpen,
  Users,
  ClipboardList,
  ArrowRight,
  TrendingUp,
  Plus,
  CheckCircle,
} from 'lucide-react'
import { TRAINING_MODULES } from '@/lib/training-data'
import { CAREERS_MODULES } from '@/lib/careers-training-data'
import { formatObservationDate } from '@/lib/observations'
import { differenceInYears } from 'date-fns'
import { DashboardAnnouncements } from '@/components/dashboard/announcements'
import { getEffectiveModules, hasAsdAccess, hasCareersAccess } from '@/lib/modules'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const isCaregiverRole = session.user.role === 'CAREGIVER'

  const [children, progressRecords, recentObservations] = await Promise.all([
    isCaregiverRole
      ? prisma.child.findMany({
          where: { userId: session.user.id },
          include: {
            _count: { select: { observations: true } },
            observations: { orderBy: { date: 'desc' }, take: 1 },
          },
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve([]),
    prisma.trainingProgress.findMany({
      where: { userId: session.user.id, completed: true },
    }),
    isCaregiverRole
      ? prisma.observation.findMany({
          where: { child: { userId: session.user.id } },
          include: { child: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        })
      : Promise.resolve([]),
  ])

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { allowedModuleIds: true, organisation: { select: { allowedModuleIds: true } } },
  })

  const effectiveModules = getEffectiveModules(
    user?.allowedModuleIds ?? [],
    user?.organisation?.allowedModuleIds ?? []
  )

  const isCaregiver = session.user.role === 'CAREGIVER'
  const showAsd = hasAsdAccess(effectiveModules)
  const showCareers = hasCareersAccess(effectiveModules)

  const activeModules = [
    ...(showAsd ? TRAINING_MODULES.filter((m) => effectiveModules.includes(m.id)) : []),
    ...(showCareers ? CAREERS_MODULES.filter((m) => effectiveModules.includes(m.id)) : []),
  ]

  const totalLessons = activeModules.reduce((acc, m) => acc + m.lessons.length, 0)
  const completedLessons = progressRecords.length
  const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  const firstName = session.user.name?.split(' ')[0] || 'there'

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome back, {firstName}</h1>
        <p className="text-slate-500 mt-1">
          Here&apos;s an overview of your training progress{isCaregiver ? ' and observations' : ''}.
        </p>
      </div>

      {/* Announcements */}
      <DashboardAnnouncements />

      {/* Stats row */}
      <div className={`grid grid-cols-1 ${isCaregiver ? 'sm:grid-cols-3' : 'sm:grid-cols-1 max-w-sm'} gap-4`}>
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
        {isCaregiver && (
          <>
            <div className="card flex items-center gap-4">
              <div className="w-12 h-12 bg-sage-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Users className="h-6 w-6 text-sage-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{children.length}</p>
                <p className="text-sm text-slate-500">
                  {children.length === 1 ? 'Child' : 'Children'} tracked
                </p>
              </div>
            </div>
            <div className="card flex items-center gap-4">
              <div className="w-12 h-12 bg-warm-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <ClipboardList className="h-6 w-6 text-warm-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {children.reduce((acc, c) => acc + c._count.observations, 0)}
                </p>
                <p className="text-sm text-slate-500">Total observations</p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Training Progress */}
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
                className="h-full bg-primary-500 rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <div className="space-y-2">
            {activeModules.map((module) => {
              const moduleLessons = module.lessons.length
              const completedModuleLessons = progressRecords.filter(
                (p) => p.moduleId === module.id
              ).length
              const moduleComplete = completedModuleLessons === moduleLessons
              return (
                <div
                  key={module.id}
                  className="flex items-center gap-3 p-3 bg-calm-50 rounded-xl"
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${moduleComplete ? 'bg-sage-500' : 'bg-calm-200'}`}
                  >
                    {moduleComplete ? (
                      <CheckCircle className="h-4 w-4 text-white" />
                    ) : (
                      <span className="text-xs font-bold text-slate-500">{module.order}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{module.title}</p>
                    <p className="text-xs text-slate-400">
                      {completedModuleLessons}/{moduleLessons} lessons
                    </p>
                  </div>
                  <Link
                    href={`/training/${module.id}`}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium flex-shrink-0"
                  >
                    {completedModuleLessons > 0 ? 'Continue' : 'Start'}
                  </Link>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick Actions & Children */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {isCaregiver && (
                <Link
                  href="/children"
                  className="flex items-center gap-3 p-3 bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors group"
                >
                  <Plus className="h-5 w-5 text-primary-600" />
                  <span className="text-sm font-medium text-primary-700">Add a child</span>
                  <ArrowRight className="h-4 w-4 text-primary-400 ml-auto group-hover:translate-x-0.5 transition-transform" />
                </Link>
              )}
              <Link
                href={showAsd ? '/training' : '/careers'}
                className="flex items-center gap-3 p-3 bg-sage-50 hover:bg-sage-100 rounded-xl transition-colors group"
              >
                <TrendingUp className="h-5 w-5 text-sage-600" />
                <span className="text-sm font-medium text-sage-700">Continue training</span>
                <ArrowRight className="h-4 w-4 text-sage-400 ml-auto group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {isCaregiver && children.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Children</h2>
                <Link href="/children" className="text-sm text-primary-600 hover:text-primary-700">
                  View all
                </Link>
              </div>
              <div className="space-y-3">
                {children.slice(0, 3).map((child) => {
                  const age = differenceInYears(new Date(), child.dateOfBirth)
                  const lastObs = child.observations[0]
                  return (
                    <Link
                      key={child.id}
                      href={`/children/${child.id}`}
                      className="flex items-center gap-3 group"
                    >
                      <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-primary-700">
                          {child.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 group-hover:text-primary-600 transition-colors truncate">
                          {child.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          Age {age} &middot; {child._count.observations} observations
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Observations — caregivers only */}
      {isCaregiver && recentObservations.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Observations</h2>
          <div className="space-y-2">
            {recentObservations.map((obs) => (
              <div
                key={obs.id}
                className="flex items-start gap-3 p-3 bg-calm-50 rounded-xl"
              >
                <div
                  className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    obs.domain === 'SOCIAL_COMMUNICATION'
                      ? 'bg-primary-500'
                      : obs.domain === 'BEHAVIOUR_AND_PLAY'
                        ? 'bg-sage-500'
                        : 'bg-warm-400'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{obs.behaviourType}</p>
                  <p className="text-xs text-slate-400">
                    {obs.child.name} &middot; {formatObservationDate(obs.date)} &middot;{' '}
                    {obs.frequency.charAt(0) + obs.frequency.slice(1).toLowerCase()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
