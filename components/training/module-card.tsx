import Link from 'next/link'
import { Lock, CheckCircle, ChevronRight, BookOpen, Video, FileText } from 'lucide-react'
import { TrainingModule } from '@/lib/training-data'
import { clsx } from 'clsx'

interface ModuleCardProps {
  module: TrainingModule
  completedLessons: number
  locked: boolean
}

export function ModuleCard({ module, completedLessons, locked }: ModuleCardProps) {
  const totalLessons = module.lessons.length
  const isComplete = completedLessons === totalLessons
  const progressPct = Math.round((completedLessons / totalLessons) * 100)
  const hasStarted = completedLessons > 0

  const videoCount = module.lessons.filter((l) => l.type === 'VIDEO').length
  const textCount = module.lessons.filter((l) => l.type === 'TEXT').length

  return (
    <div
      className={clsx(
        'card-hover relative overflow-hidden',
        locked && 'opacity-75 cursor-not-allowed',
        isComplete && 'border-sage-200 bg-sage-50/50'
      )}
    >
      {isComplete && (
        <div className="absolute top-4 right-4">
          <CheckCircle className="h-6 w-6 text-sage-500" />
        </div>
      )}
      {locked && (
        <div className="absolute top-4 right-4">
          <Lock className="h-5 w-5 text-slate-300" />
        </div>
      )}

      <div className="flex items-start gap-3 mb-4">
        <div
          className={clsx(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm',
            isComplete
              ? 'bg-sage-500 text-white'
              : locked
                ? 'bg-calm-200 text-slate-400'
                : 'bg-primary-600 text-white'
          )}
        >
          {isComplete ? <CheckCircle className="h-5 w-5" /> : module.order}
        </div>
        <div className="flex-1 min-w-0 pr-8">
          <h3 className="font-semibold text-slate-900 leading-snug">{module.title}</h3>
          <p className="text-sm text-slate-500 mt-1 line-clamp-2">{module.description}</p>
        </div>
      </div>

      {/* Lesson metadata */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <BookOpen className="h-3.5 w-3.5" />
          <span>{totalLessons} lessons</span>
        </div>
        {videoCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Video className="h-3.5 w-3.5" />
            <span>{videoCount} video</span>
          </div>
        )}
        {textCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <FileText className="h-3.5 w-3.5" />
            <span>{textCount} reading</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5 mb-5">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">
            {completedLessons}/{totalLessons} completed
          </span>
          <span className={clsx('font-medium', isComplete ? 'text-sage-600' : 'text-slate-600')}>
            {progressPct}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-calm-200 rounded-full overflow-hidden">
          <div
            className={clsx('h-full rounded-full transition-all', isComplete ? 'bg-sage-500' : 'bg-primary-500')}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {!locked ? (
        <Link
          href={`/training/${module.id}`}
          className={clsx(
            'flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium transition-all',
            isComplete
              ? 'bg-sage-100 text-sage-700 hover:bg-sage-200'
              : hasStarted
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-primary-50 text-primary-700 hover:bg-primary-100'
          )}
        >
          {isComplete ? 'Review module' : hasStarted ? 'Continue' : 'Start module'}
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <div className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium bg-calm-100 text-slate-400">
          <Lock className="h-4 w-4" />
          Complete previous module to unlock
        </div>
      )}
    </div>
  )
}
