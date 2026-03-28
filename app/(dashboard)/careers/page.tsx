import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { CAREERS_MODULES } from '@/lib/careers-training-data'
import { canAccessCareers, isAdmin } from '@/lib/rbac'
import Link from 'next/link'
import { Briefcase, CheckCircle, Circle, ChevronRight, Lock } from 'lucide-react'
import { clsx } from 'clsx'

export default async function CareersPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (!canAccessCareers(session)) redirect('/dashboard')

  const progressRecords = await prisma.trainingProgress.findMany({
    where: { userId: session.user.id },
  })

  const totalLessons = CAREERS_MODULES.reduce((acc, m) => acc + m.lessons.length, 0)
  const completedLessons = progressRecords.filter(
    (p) => p.completed && p.moduleId.startsWith('careers-')
  ).length

  const pct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Careers Training</h1>
        <p className="text-slate-500 mt-1">
          Professional development for SEND careers leaders, SENCOs, and careers professionals
          supporting autistic young people.
        </p>
      </div>

      {/* Overall progress */}
      <div className="card border-0 bg-blue-600">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-sm font-bold text-white/80">Your progress</p>
            <p className="text-3xl font-bold mt-1 text-white">
              {completedLessons}
              <span className="text-white/70 text-xl font-normal"> / {totalLessons}</span>
            </p>
            <p className="text-white/80 text-sm font-medium">lessons completed</p>
          </div>
          <div className="text-right">
            <p className="text-5xl font-bold text-white">{pct}%</p>
          </div>
        </div>
        <div className="w-full h-2 bg-white/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Module grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CAREERS_MODULES.map((module, index) => {
          const moduleProgress = progressRecords.filter(
            (p) => p.moduleId === module.id && p.completed
          )
          const completedCount = moduleProgress.length
          const totalCount = module.lessons.length
          const isComplete = completedCount === totalCount

          const previousModuleComplete =
            index === 0 ||
            progressRecords.filter(
              (p) => p.moduleId === CAREERS_MODULES[index - 1].id && p.completed
            ).length === CAREERS_MODULES[index - 1].lessons.length

          const isLocked = !isAdmin(session) && !previousModuleComplete && index > 0

          return (
            <div
              key={module.id}
              className={clsx(
                'card border-2 transition-all',
                isComplete
                  ? 'border-sage-300 bg-sage-50'
                  : isLocked
                  ? 'border-calm-200 opacity-60'
                  : 'border-calm-200 hover:border-blue-300 hover:shadow-md'
              )}
            >
              <div className="flex items-start gap-3 mb-4">
                <div
                  className={clsx(
                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    isComplete ? 'bg-sage-200' : isLocked ? 'bg-calm-200' : 'bg-blue-100'
                  )}
                >
                  {isLocked ? (
                    <Lock className="h-5 w-5 text-slate-400" />
                  ) : isComplete ? (
                    <CheckCircle className="h-5 w-5 text-sage-600" />
                  ) : (
                    <Briefcase className="h-5 w-5 text-blue-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400 font-medium">Module {module.order}</p>
                  <h2 className="font-bold text-slate-900 leading-snug">{module.title}</h2>
                </div>
              </div>

              <p className="text-sm text-slate-500 mb-4 leading-relaxed line-clamp-3">
                {module.description}
              </p>

              {/* Progress bar */}
              <div className="space-y-1.5 mb-4">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{completedCount}/{totalCount} lessons</span>
                  <span>{Math.round((completedCount / totalCount) * 100)}%</span>
                </div>
                <div className="w-full h-1.5 bg-calm-200 rounded-full overflow-hidden">
                  <div
                    className={clsx(
                      'h-full rounded-full transition-all',
                      isComplete ? 'bg-sage-500' : 'bg-blue-500'
                    )}
                    style={{ width: `${(completedCount / totalCount) * 100}%` }}
                  />
                </div>
              </div>

              {/* Lesson list preview */}
              <div className="space-y-1 mb-4">
                {module.lessons.slice(0, 3).map((lesson) => {
                  const done = progressRecords.some(
                    (p) => p.lessonId === lesson.id && p.completed
                  )
                  return (
                    <div key={lesson.id} className="flex items-center gap-2 text-xs text-slate-500">
                      {done ? (
                        <CheckCircle className="h-3.5 w-3.5 text-sage-500 flex-shrink-0" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 text-slate-300 flex-shrink-0" />
                      )}
                      <span className={done ? 'line-through text-slate-400' : ''}>{lesson.title}</span>
                    </div>
                  )
                })}
                {module.lessons.length > 3 && (
                  <p className="text-xs text-slate-400 pl-5">
                    +{module.lessons.length - 3} more lessons
                  </p>
                )}
              </div>

              {!isLocked && (
                <Link
                  href={`/careers/${module.id}`}
                  className={clsx(
                    'flex items-center justify-center gap-2 w-full py-2 px-4 rounded-xl text-sm font-bold transition-all',
                    isComplete
                      ? 'bg-sage-100 text-sage-700 hover:bg-sage-200'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  )}
                >
                  {isComplete ? 'Review module' : completedCount > 0 ? 'Continue' : 'Start module'}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
              {isLocked && (
                <div className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-xl text-sm font-medium text-slate-400 bg-calm-100">
                  <Lock className="h-4 w-4" />
                  Complete previous module to unlock
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <p className="text-sm text-blue-900">
          <strong>CPD note:</strong> This training is designed to support careers professionals
          working with autistic young people under the Gatsby Benchmarks framework. Completion of
          all modules provides a structured evidence base for SEND-inclusive careers education
          practice. It does not constitute a formal qualification.
        </p>
      </div>
    </div>
  )
}
