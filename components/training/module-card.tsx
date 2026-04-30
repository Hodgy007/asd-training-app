'use client'

import Link from 'next/link'
import { Lock, CheckCircle, ChevronRight, BookOpen, Video, FileText } from 'lucide-react'
import { clsx } from 'clsx'
import { useColorTheme } from '@/components/providers/color-theme-provider'
import { Badge } from '@/components/ui/badge'
import { GATSBY_BENCHMARKS, type GatsbyBenchmarkCode } from '@/lib/gatsby-benchmarks'
import { isHtml } from '@/lib/rich-text'
import { sanitizeHtml } from '@/lib/sanitize'

interface ModuleForCard {
  id: string
  title: string
  description: string
  order: number
  gatsbyBenchmarks?: string[]
  lessons: { id: string; title: string; type: string; order: number }[]
}

interface ModuleCardProps {
  module: ModuleForCard
  completedLessons: number
  locked: boolean
  programId?: string
}

export function ModuleCard({ module, completedLessons, locked, programId }: ModuleCardProps) {
  const { colorTheme } = useColorTheme()
  const isBlue = colorTheme === 'blue'
  const totalLessons = module.lessons.length
  const isComplete = totalLessons > 0 && completedLessons === totalLessons
  const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
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
                : isBlue ? 'text-white' : 'text-black'
          )}
          style={!isComplete && !locked ? { backgroundColor: 'var(--p-500)' } : undefined}
        >
          {isComplete ? <CheckCircle className="h-5 w-5" /> : module.order}
        </div>
        <div className="flex-1 min-w-0 pr-8">
          <h3 className="font-semibold text-slate-900 leading-snug">{module.title}</h3>
          {isHtml(module.description) ? (
            <div
              className="prose-lesson text-sm text-slate-500 mt-1"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(module.description) }}
            />
          ) : (
            <p className="text-sm text-slate-500 mt-1 whitespace-pre-wrap">{module.description}</p>
          )}
        </div>
      </div>

      {/* Gatsby Benchmark chips (only rendered when tagged) */}
      {module.gatsbyBenchmarks && module.gatsbyBenchmarks.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3" aria-label="Gatsby Benchmarks">
          {module.gatsbyBenchmarks.map((code) => (
            <Badge
              key={code}
              variant="primary"
              size="sm"
              title={GATSBY_BENCHMARKS[code as GatsbyBenchmarkCode]?.full ?? code}
            >
              {code}
            </Badge>
          ))}
        </div>
      )}

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
            className={clsx('h-full rounded-full transition-all', isComplete ? 'bg-sage-500' : '')}
            style={{ width: `${progressPct}%`, backgroundColor: isComplete ? undefined : 'var(--p-500)' }}
          />
        </div>
      </div>

      {!locked ? (
        <Link
          href={programId ? `/training/${programId}/${module.id}` : `/training/${module.id}`}
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
