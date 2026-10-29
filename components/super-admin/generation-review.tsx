'use client'

import { TriangleAlert } from 'lucide-react'
import type { ParsedFile, SourceRef } from '@/lib/content-generator-types'

// Review aids for the generator preview: where a lesson's material came from,
// and which quiz questions the automatic check couldn't clear.

const EXCERPT_CHARS = 600

export function LessonSources({ files, sourceRefs }: { files: ParsedFile[]; sourceRefs: SourceRef[] }) {
  const sections = sourceRefs.flatMap((ref) => {
    const file = files[ref.fileIndex]
    if (!file) return []
    return ref.sectionIndices.flatMap((i) => {
      const section = file.sections[i]
      if (!section) return []
      const label = `${file.filename} — ${section.heading?.trim() || `Section ${i + 1}`}`
      const text = section.content.length > EXCERPT_CHARS ? `${section.content.slice(0, EXCERPT_CHARS)}…` : section.content
      return [{ key: `${ref.fileIndex}:${i}`, label, text }]
    })
  })
  if (sections.length === 0) return null

  return (
    <details className="rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700">
      <summary className="cursor-pointer font-medium text-slate-700 dark:text-slate-200">Sources ({sections.length})</summary>
      <ul className="mt-3 space-y-3">
        {sections.map((s) => (
          <li key={s.key}>
            <p className="font-medium text-slate-700 dark:text-slate-200">{s.label}</p>
            <p className="mt-1 whitespace-pre-line text-xs text-slate-500 dark:text-slate-400">{s.text}</p>
          </li>
        ))}
      </ul>
    </details>
  )
}

export function QuizReviewFlag({ issue }: { issue: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-700/50 dark:bg-amber-900/20">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-200">
        <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
        Check this question
      </p>
      <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">{issue}</p>
    </div>
  )
}
