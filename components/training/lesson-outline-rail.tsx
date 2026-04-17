import Link from 'next/link'
import { clsx } from 'clsx'
import { CheckCircle, Circle } from 'lucide-react'

interface OutlineLesson {
  id: string
  title: string
  order: number
}

interface LessonOutlineRailProps {
  programId: string
  moduleId: string
  lessons: OutlineLesson[]
  currentLessonId: string
  completedLessonIds: Set<string>
}

export function LessonOutlineRail({
  programId,
  moduleId,
  lessons,
  currentLessonId,
  completedLessonIds,
}: LessonOutlineRailProps) {
  const completedCount = lessons.filter((l) => completedLessonIds.has(l.id)).length
  const progressPct = lessons.length === 0 ? 0 : Math.round((completedCount / lessons.length) * 100)

  return (
    <aside className="card-rail">
      <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold mb-3">
        In this module
      </div>
      <ul className="space-y-1">
        {lessons.map((lesson) => {
          const isCurrent = lesson.id === currentLessonId
          const isDone = completedLessonIds.has(lesson.id)
          return (
            <li key={lesson.id}>
              <Link
                href={`/training/${programId}/${moduleId}/${lesson.id}`}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                  isCurrent
                    ? 'bg-primary-500 text-white'
                    : isDone
                    ? 'bg-primary-50 dark:bg-slate-800 text-slate-900 dark:text-slate-200 hover:bg-primary-100 dark:hover:bg-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
                )}
              >
                {isDone ? (
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 flex-shrink-0 opacity-60" />
                )}
                <span className="truncate">{lesson.title}</span>
              </Link>
            </li>
          )
        })}
      </ul>

      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
          <span>Module progress</span>
          <span className="font-semibold">{progressPct}%</span>
        </div>
        <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-primary-500" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
          {completedCount} of {lessons.length} lessons complete
        </div>
      </div>
    </aside>
  )
}
