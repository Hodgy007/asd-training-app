import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { getCareerModuleById } from '@/lib/careers-training-data'
import { canAccessCareers, isAdmin } from '@/lib/rbac'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle,
  Circle,
  FileText,
  Video,
  ChevronRight,
} from 'lucide-react'
import { clsx } from 'clsx'

export default async function CareerModulePage({ params }: { params: { moduleId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (!canAccessCareers(session)) redirect('/dashboard')

  const module = getCareerModuleById(params.moduleId)
  if (!module) notFound()

  const progressRecords = await prisma.trainingProgress.findMany({
    where: { userId: session.user.id, moduleId: params.moduleId },
  })

  const completedLessonIds = progressRecords.filter((p) => p.completed).map((p) => p.lessonId)
  const completedCount = completedLessonIds.length
  const totalCount = module.lessons.length
  const isComplete = completedCount === totalCount

  const nextLesson = module.lessons.find((l) => !completedLessonIds.includes(l.id))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/careers"
          className="p-2 rounded-xl text-slate-500 hover:bg-calm-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-sm text-slate-500">Module {module.order}</p>
          <h1 className="text-xl font-bold text-slate-900">{module.title}</h1>
        </div>
      </div>

      {/* Module overview card */}
      <div
        className={clsx(
          'card border-l-4',
          isComplete ? 'border-l-sage-500' : 'border-l-blue-500'
        )}
      >
        <p className="text-slate-600 mb-4">{module.description}</p>
        <div className="space-y-1.5 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Progress</span>
            <span className="font-medium text-slate-900">
              {completedCount}/{totalCount} lessons
            </span>
          </div>
          <div className="w-full h-2.5 bg-calm-200 rounded-full overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-full transition-all',
                isComplete ? 'bg-sage-500' : 'bg-blue-500'
              )}
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>

        {nextLesson && (
          <Link
            href={`/careers/${module.id}/${nextLesson.id}`}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl transition-colors text-sm"
          >
            {completedCount === 0 ? 'Start first lesson' : 'Continue learning'}
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
        {isComplete && (
          <div className="flex items-center gap-2 text-sage-600 font-medium">
            <CheckCircle className="h-5 w-5" />
            Module complete!
          </div>
        )}
      </div>

      {/* Lesson list */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Lessons</h2>
        <div className="space-y-2">
          {module.lessons.map((lesson, idx) => {
            const isLessonComplete = completedLessonIds.includes(lesson.id)
            const isLessonLocked =
              !isAdmin(session) && idx > 0 && !completedLessonIds.includes(module.lessons[idx - 1].id)

            return (
              <div
                key={lesson.id}
                className={clsx(
                  'flex items-center gap-4 p-4 rounded-xl border transition-all',
                  isLessonComplete
                    ? 'bg-sage-50 border-sage-200'
                    : isLessonLocked
                    ? 'bg-calm-50 border-calm-200 opacity-60'
                    : 'bg-white border-calm-200 hover:border-blue-200 hover:shadow-sm'
                )}
              >
                <div className="flex-shrink-0">
                  {isLessonComplete ? (
                    <CheckCircle className="h-6 w-6 text-sage-500" />
                  ) : (
                    <Circle className="h-6 w-6 text-slate-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {lesson.type === 'VIDEO' ? (
                      <Video className="h-4 w-4 text-blue-400 flex-shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    )}
                    <span className="text-xs text-slate-400 capitalize">
                      {lesson.type.toLowerCase()}
                    </span>
                  </div>
                  <p
                    className={clsx(
                      'font-medium mt-0.5',
                      isLessonComplete ? 'text-sage-800' : 'text-slate-900'
                    )}
                  >
                    {lesson.title}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {lesson.quizQuestions.length} quiz questions
                  </p>
                </div>
                {!isLessonLocked && (
                  <Link
                    href={`/careers/${module.id}/${lesson.id}`}
                    className={clsx(
                      'flex-shrink-0 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors',
                      isLessonComplete
                        ? 'text-sage-600 hover:bg-sage-100'
                        : 'text-blue-600 hover:bg-blue-50'
                    )}
                  >
                    {isLessonComplete ? 'Review' : 'Start'}
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
