'use client'

import { TriangleAlert } from 'lucide-react'
import type { ParsedFile, SourceRef } from '@/lib/content-generator-types'
import type { InteractiveBlock, KnowledgeCheckData } from '@/types/interactive'

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

/**
 * The lesson's "Check your understanding" block, which the rich-text editor
 * only shows as an [INTERACTIVE:…] marker, so the admin can read it before
 * publishing and remove it if it isn't right.
 */
export function CheckInPreview({ block, onRemove }: { block: InteractiveBlock; onRemove: () => void }) {
  if (block.type !== 'knowledge-check') return null
  const { questions } = block.data as KnowledgeCheckData
  return (
    <div className="rounded-xl border border-green-200 bg-green-50/60 px-4 py-3 text-sm dark:border-green-800/50 dark:bg-green-900/10">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-green-900 dark:text-green-200">{block.title} (shown inside the lesson)</p>
        <button type="button" onClick={onRemove} className="text-xs font-medium text-slate-500 hover:text-red-600 dark:text-slate-400">
          Remove check-in
        </button>
      </div>
      {questions.map((q) => (
        <div key={q.id} className="mt-2 space-y-1">
          <p className="text-slate-800 dark:text-slate-100">{q.question}</p>
          <ul className="list-disc pl-5 text-slate-600 dark:text-slate-300">
            {q.options.map((o) => (
              <li key={o}>{o === q.correctAnswer ? `${o} (correct)` : o}</li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 dark:text-slate-400">{q.feedback}</p>
        </div>
      ))}
    </div>
  )
}
