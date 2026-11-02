'use client'

import { useState } from 'react'
import { CircleAlert, Plus, Trash, TriangleAlert } from 'lucide-react'
import { clsx } from 'clsx'
import { pruneOutline, uncoveredObjectives } from '@/lib/training-gen/outline'
import { LIMITS, type CourseBrief, type Outline } from '@/lib/training-gen/schemas'

// The generator's Plan step: the admin checks who the programme is for, its
// learning objectives and its outline before any lessons are written.

interface GenerationPlanStepProps {
  brief: CourseBrief
  outline: Outline
  warnings: string[]
  truncated: boolean
  onChange: (brief: CourseBrief, outline: Outline) => void
  onBack: () => void
  onGenerate: (includeCheckIns: boolean) => void
  /** Shown above the plan when generating lessons from it failed. */
  error?: string | null
}

// Each lesson takes several AI calls; beyond this many, one 5-minute run may
// not reach them all. Lessons it doesn't reach can be retried from the preview.
const LONG_RUN_LESSONS = 15

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-primary-500 focus:outline-hidden focus:ring-2 focus:ring-primary-500/20'
const iconButtonClass =
  'rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400 dark:hover:bg-slate-800 transition-colors'

export function GenerationPlanStep({
  brief,
  outline,
  warnings,
  truncated,
  onChange,
  onBack,
  onGenerate,
  error,
}: GenerationPlanStepProps) {
  const [includeCheckIns, setIncludeCheckIns] = useState(true)
  const [minObjectives, maxObjectives] = LIMITS.objectives
  const lessonCount = outline.modules.reduce((n, m) => n + m.lessons.length, 0)
  const uncovered = uncoveredObjectives(brief.objectives, outline)
  const hasBlanks =
    brief.objectives.some((o) => !o.text.trim()) ||
    outline.modules.some((m) => m.lessons.some((l) => !l.title.trim()))
  const notices = [
    ...(truncated
      ? ['Your files were longer than we can read at once, so the end was left out. Split them into smaller files if those parts matter.']
      : []),
    ...warnings,
    ...(lessonCount > LONG_RUN_LESSONS
      ? [`${lessonCount} lessons is a lot for one run. If some aren't written in time, you can retry them one by one from the preview.`]
      : []),
  ]

  const setObjective = (index: number, text: string) =>
    onChange({ ...brief, objectives: brief.objectives.map((o, i) => (i === index ? { ...o, text } : o)) }, outline)

  const removeObjective = (index: number) => {
    const removed = brief.objectives[index]
    onChange(
      { ...brief, objectives: brief.objectives.filter((_, i) => i !== index) },
      {
        ...outline,
        modules: outline.modules.map((m) => ({
          ...m,
          lessons: m.lessons.map((l) => ({ ...l, objectiveIds: l.objectiveIds.filter((id) => id !== removed.id) })),
        })),
      },
    )
  }

  const addObjective = () => {
    const used = new Set(brief.objectives.map((o) => o.id))
    let n = brief.objectives.length + 1
    while (used.has(`o${n}`)) n++
    onChange({ ...brief, objectives: [...brief.objectives, { id: `o${n}`, text: '' }] }, outline)
  }

  const setLessonTitle = (m: number, l: number, title: string) =>
    onChange(brief, {
      ...outline,
      modules: outline.modules.map((mod, mi) =>
        mi !== m ? mod : { ...mod, lessons: mod.lessons.map((les, li) => (li === l ? { ...les, title } : les)) },
      ),
    })

  const toggleObjective = (m: number, l: number, id: string) =>
    onChange(brief, {
      ...outline,
      modules: outline.modules.map((mod, mi) =>
        mi !== m
          ? mod
          : {
              ...mod,
              lessons: mod.lessons.map((les, li) =>
                li !== l
                  ? les
                  : {
                      ...les,
                      objectiveIds: les.objectiveIds.includes(id)
                        ? les.objectiveIds.filter((x) => x !== id)
                        : [...les.objectiveIds, id],
                    },
              ),
            },
      ),
    })

  const removeLesson = (m: number, l: number) =>
    onChange(
      brief,
      pruneOutline({
        ...outline,
        modules: outline.modules.map((mod, mi) => (mi !== m ? mod : { ...mod, lessons: mod.lessons.filter((_, li) => li !== l) })),
      }),
    )

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-700/50 dark:bg-red-900/20">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {notices.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-700/50 dark:bg-amber-900/20">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-200">
            {notices.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">About this programme</h3>
        <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
          <div>
            <label htmlFor="plan-audience" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Who it&apos;s for
            </label>
            <input
              id="plan-audience"
              className={inputClass}
              value={brief.audience}
              onChange={(e) => onChange({ ...brief, audience: e.target.value }, outline)}
            />
          </div>
          <div>
            <label htmlFor="plan-minutes" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              About how long (minutes)
            </label>
            <input
              id="plan-minutes"
              type="number"
              min={5}
              className={inputClass}
              value={brief.estimatedMinutes}
              onChange={(e) => onChange({ ...brief, estimatedMinutes: Number(e.target.value) || 0 }, outline)}
            />
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Learning objectives</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          What learners will be able to do by the end. Start each with a verb such as describe, explain or plan.
        </p>
        <ol className="space-y-2">
          {brief.objectives.map((o, i) => (
            <li key={o.id} className="flex items-center gap-2">
              <input
                aria-label={`Objective ${i + 1}`}
                className={inputClass}
                value={o.text}
                onChange={(e) => setObjective(i, e.target.value)}
              />
              <button
                type="button"
                aria-label={`Remove objective ${i + 1}`}
                className={iconButtonClass}
                disabled={brief.objectives.length <= minObjectives}
                onClick={() => removeObjective(i)}
              >
                <Trash className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={addObjective}
          disabled={brief.objectives.length >= maxObjectives}
          className="btn-secondary inline-flex items-center gap-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add objective
        </button>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Modules and lessons</h3>
        {outline.modules.map((mod, m) => (
          <div key={`${m}-${mod.title}`} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">{mod.title}</p>
            <ul className="space-y-2">
              {mod.lessons.map((lesson, l) => (
                <li key={`${l}-${lesson.summary}`} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      aria-label="Lesson title"
                      className={inputClass}
                      value={lesson.title}
                      onChange={(e) => setLessonTitle(m, l, e.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={`Remove lesson "${lesson.title}"`}
                      className={iconButtonClass}
                      onClick={() => removeLesson(m, l)}
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                  {/* Which objectives this lesson teaches */}
                  <div className="flex flex-wrap items-center gap-1.5 pl-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Covers objectives:</span>
                    {brief.objectives.map((o, i) => {
                      const on = lesson.objectiveIds.includes(o.id)
                      return (
                        <button
                          key={o.id}
                          type="button"
                          aria-pressed={on}
                          aria-label={`"${lesson.title}" covers objective ${i + 1}`}
                          title={o.text}
                          onClick={() => toggleObjective(m, l, o.id)}
                          className={clsx(
                            'rounded-full border px-2 py-0.5 text-xs font-medium transition-colors',
                            on
                              ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                              : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-600 dark:text-slate-400',
                          )}
                        >
                          {i + 1}
                        </button>
                      )
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {uncovered.length > 0 && (
          <p className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>No lesson covers: {uncovered.map((o) => o.text || 'an empty objective').join('; ')}</span>
          </p>
        )}
      </section>

      <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200">
        <input
          type="checkbox"
          checked={includeCheckIns}
          onChange={(e) => setIncludeCheckIns(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border-slate-300 text-primary-600 focus:ring-primary-500"
        />
        Add a check-in question inside each lesson
      </label>

      {hasBlanks && (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Fill in or remove empty objectives and lesson titles before generating.
        </p>
      )}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onBack} className="btn-secondary text-sm">
          Back
        </button>
        <button
          type="button"
          disabled={lessonCount === 0 || hasBlanks}
          onClick={() => onGenerate(includeCheckIns)}
          className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          Generate lessons
        </button>
      </div>
    </div>
  )
}
