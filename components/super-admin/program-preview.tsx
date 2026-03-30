'use client'

import { lazy, Suspense, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Loader2,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Upload,
  CheckCircle,
} from 'lucide-react'
import { clsx } from 'clsx'
import type {
  GeneratedProgram,
  GeneratedModule,
  GeneratedLesson,
  GeneratedQuizQuestion,
} from '@/lib/content-generator-types'

import 'react-quill-new/dist/quill.snow.css'

const ReactQuill = lazy(() => import('react-quill-new'))

const QUILL_MODULES = {
  toolbar: [
    [{ header: [2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['clean'],
  ],
}

interface ProgramPreviewProps {
  program: GeneratedProgram
  onProgramChange: (program: GeneratedProgram) => void
  onRetryLesson?: (moduleIndex: number, lessonIndex: number) => void
  onUploadMore?: () => void
}

// ─── Quiz Question Editor ─────────────────────────────────────────────────────

interface QuizQuestionEditorProps {
  question: GeneratedQuizQuestion
  questionIndex: number
  onChange: (updated: GeneratedQuizQuestion) => void
  onDelete: () => void
}

function QuizQuestionEditor({ question, questionIndex, onChange, onDelete }: QuizQuestionEditorProps) {
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Question {questionIndex + 1}
        </span>
        <button
          type="button"
          onClick={onDelete}
          className="rounded p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          aria-label="Delete question"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Question text */}
      <textarea
        value={question.question}
        onChange={(e) => onChange({ ...question, question: e.target.value })}
        rows={2}
        className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
        placeholder="Question text..."
      />

      {/* Options */}
      <div className="space-y-2">
        {question.options.map((option, optIdx) => {
          const isCorrect = option === question.correctAnswer
          return (
            <div key={optIdx} className="flex items-center gap-2">
              <span className="w-5 flex-shrink-0 text-center text-xs font-medium text-slate-400">
                {String.fromCharCode(65 + optIdx)}
              </span>
              <input
                type="text"
                value={option}
                onChange={(e) => {
                  const newOptions = [...question.options]
                  const wasCorrect = option === question.correctAnswer
                  newOptions[optIdx] = e.target.value
                  onChange({
                    ...question,
                    options: newOptions,
                    correctAnswer: wasCorrect ? e.target.value : question.correctAnswer,
                  })
                }}
                className={clsx(
                  'flex-1 rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500',
                  isCorrect
                    ? 'border-green-400 bg-green-50 text-green-800 dark:border-green-600 dark:bg-green-900/20 dark:text-green-300'
                    : 'border-slate-200 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
                )}
                placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
              />
              {isCorrect && (
                <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
              )}
            </div>
          )
        })}
      </div>

      {/* Correct answer dropdown */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-500 dark:text-slate-400">Correct answer:</label>
        <select
          value={question.correctAnswer}
          onChange={(e) => onChange({ ...question, correctAnswer: e.target.value })}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {question.options.map((opt, i) => (
            <option key={i} value={opt}>
              {String.fromCharCode(65 + i)}: {opt.slice(0, 40)}{opt.length > 40 ? '…' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Explanation */}
      <textarea
        value={question.explanation}
        onChange={(e) => onChange({ ...question, explanation: e.target.value })}
        rows={2}
        className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
        placeholder="Explanation (shown after answer)..."
      />
    </div>
  )
}

// ─── Lesson Editor ────────────────────────────────────────────────────────────

interface LessonEditorProps {
  lesson: GeneratedLesson
  moduleIndex: number
  lessonIndex: number
  totalLessons: number
  onChange: (updated: GeneratedLesson) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
  onRetry?: () => void
}

function LessonEditor({
  lesson,
  moduleIndex,
  lessonIndex,
  totalLessons,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
  onRetry,
}: LessonEditorProps) {
  const [expanded, setExpanded] = useState(false)
  const [quizExpanded, setQuizExpanded] = useState(false)
  const hasFailed = Boolean(lesson.error)

  const updateQuizQuestion = (qIdx: number, updated: GeneratedQuizQuestion) => {
    const newQuestions = [...lesson.quizQuestions]
    newQuestions[qIdx] = updated
    onChange({ ...lesson, quizQuestions: newQuestions })
  }

  const deleteQuizQuestion = (qIdx: number) => {
    onChange({ ...lesson, quizQuestions: lesson.quizQuestions.filter((_, i) => i !== qIdx) })
  }

  return (
    <div
      className={clsx(
        'rounded-xl border bg-white dark:bg-slate-900 transition-colors',
        hasFailed
          ? 'border-red-300 dark:border-red-700/60'
          : 'border-slate-200 dark:border-slate-700'
      )}
    >
      {/* Lesson header */}
      <div className="flex items-center gap-2 px-4 py-3">
        {/* Reorder */}
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={lessonIndex === 0}
            className="rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 transition-colors"
            aria-label="Move lesson up"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={lessonIndex === totalLessons - 1}
            className="rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 transition-colors"
            aria-label="Move lesson down"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-shrink-0 rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          aria-label={expanded ? 'Collapse lesson' : 'Expand lesson'}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {/* Title */}
        <input
          type="text"
          value={lesson.title}
          onChange={(e) => onChange({ ...lesson, title: e.target.value })}
          className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-slate-800 dark:text-slate-100 hover:border-slate-200 dark:hover:border-slate-600 focus:border-purple-400 focus:outline-none focus:ring-0"
          placeholder="Lesson title..."
        />

        {/* Failed badge + retry */}
        {hasFailed && (
          <span className="flex-shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400">
            Failed
          </span>
        )}
        {hasFailed && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex-shrink-0 flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Retry
          </button>
        )}

        {/* Quiz count */}
        {!hasFailed && (
          <span className="flex-shrink-0 text-xs text-slate-400 dark:text-slate-500">
            {lesson.quizQuestions.length} Q
          </span>
        )}

        {/* Delete */}
        <button
          type="button"
          onClick={onDelete}
          className="flex-shrink-0 rounded p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          aria-label="Delete lesson"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-700/50 px-4 pb-4 pt-4 space-y-4">
          {hasFailed ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800/50 dark:bg-red-900/10">
              <p className="text-sm text-red-600 dark:text-red-400">
                <strong>Error:</strong> {lesson.error}
              </p>
            </div>
          ) : (
            <>
              {/* Rich text editor */}
              <div className="quill-wrapper rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden">
                <Suspense
                  fallback={
                    <div className="flex h-32 items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                    </div>
                  }
                >
                  <ReactQuill
                    value={lesson.content}
                    onChange={(val) => onChange({ ...lesson, content: val })}
                    modules={QUILL_MODULES}
                    theme="snow"
                  />
                </Suspense>
              </div>

              {/* Quiz section */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQuizExpanded((v) => !v)}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <span>Quiz Questions ({lesson.quizQuestions.length})</span>
                  {quizExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                {quizExpanded && (
                  <div className="space-y-3 border-t border-slate-100 dark:border-slate-700 p-4">
                    {lesson.quizQuestions.length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-slate-500">No quiz questions.</p>
                    ) : (
                      lesson.quizQuestions.map((q, qIdx) => (
                        <QuizQuestionEditor
                          key={qIdx}
                          question={q}
                          questionIndex={qIdx}
                          onChange={(updated) => updateQuizQuestion(qIdx, updated)}
                          onDelete={() => deleteQuizQuestion(qIdx)}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Module Card ──────────────────────────────────────────────────────────────

interface ModuleCardProps {
  mod: GeneratedModule
  moduleIndex: number
  totalModules: number
  defaultExpanded: boolean
  onChange: (updated: GeneratedModule) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
  onRetryLesson?: (lessonIndex: number) => void
}

function ModuleCard({
  mod,
  moduleIndex,
  totalModules,
  defaultExpanded,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
  onRetryLesson,
}: ModuleCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const updateLesson = (lIdx: number, updated: GeneratedLesson) => {
    const newLessons = [...mod.lessons]
    newLessons[lIdx] = updated
    onChange({ ...mod, lessons: newLessons })
  }

  const deleteLesson = (lIdx: number) => {
    onChange({ ...mod, lessons: mod.lessons.filter((_, i) => i !== lIdx) })
  }

  const moveLessonUp = (lIdx: number) => {
    if (lIdx === 0) return
    const newLessons = [...mod.lessons]
    ;[newLessons[lIdx - 1], newLessons[lIdx]] = [newLessons[lIdx], newLessons[lIdx - 1]]
    onChange({ ...mod, lessons: newLessons })
  }

  const moveLessonDown = (lIdx: number) => {
    if (lIdx === mod.lessons.length - 1) return
    const newLessons = [...mod.lessons]
    ;[newLessons[lIdx], newLessons[lIdx + 1]] = [newLessons[lIdx + 1], newLessons[lIdx]]
    onChange({ ...mod, lessons: newLessons })
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
      {/* Module header */}
      <div className="flex items-center gap-2 px-4 py-3">
        {/* Reorder */}
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={moduleIndex === 0}
            className="rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 transition-colors"
            aria-label="Move module up"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={moduleIndex === totalModules - 1}
            className="rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 transition-colors"
            aria-label="Move module down"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-shrink-0 rounded p-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          aria-label={expanded ? 'Collapse module' : 'Expand module'}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {/* Title */}
        <input
          type="text"
          value={mod.title}
          onChange={(e) => onChange({ ...mod, title: e.target.value })}
          className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:border-slate-200 dark:hover:border-slate-600 focus:border-purple-400 focus:outline-none"
          placeholder="Module title..."
        />

        {/* Lesson count */}
        <span className="flex-shrink-0 text-xs text-slate-400 dark:text-slate-500">
          {mod.lessons.length} lesson{mod.lessons.length !== 1 ? 's' : ''}
        </span>

        {/* Delete */}
        <button
          type="button"
          onClick={onDelete}
          className="flex-shrink-0 rounded p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          aria-label="Delete module"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-slate-200 dark:border-slate-700 px-4 pb-4 pt-4 space-y-3">
          {/* Description */}
          <textarea
            value={mod.description}
            onChange={(e) => onChange({ ...mod, description: e.target.value })}
            rows={2}
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 focus:border-purple-400 focus:outline-none focus:ring-0 placeholder:text-slate-400"
            placeholder="Module description..."
          />

          {/* Lessons */}
          <div className="space-y-2">
            {mod.lessons.map((lesson, lIdx) => (
              <LessonEditor
                key={lIdx}
                lesson={lesson}
                moduleIndex={moduleIndex}
                lessonIndex={lIdx}
                totalLessons={mod.lessons.length}
                onChange={(updated) => updateLesson(lIdx, updated)}
                onMoveUp={() => moveLessonUp(lIdx)}
                onMoveDown={() => moveLessonDown(lIdx)}
                onDelete={() => deleteLesson(lIdx)}
                onRetry={onRetryLesson ? () => onRetryLesson(lIdx) : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ProgramPreview ───────────────────────────────────────────────────────────

export function ProgramPreview({
  program,
  onProgramChange,
  onRetryLesson,
  onUploadMore,
}: ProgramPreviewProps) {
  const failedCount = program.modules.reduce(
    (acc, mod) => acc + mod.lessons.filter((l) => Boolean(l.error)).length,
    0
  )

  const updateModule = (mIdx: number, updated: GeneratedModule) => {
    const newModules = [...program.modules]
    newModules[mIdx] = updated
    onProgramChange({ ...program, modules: newModules })
  }

  const deleteModule = (mIdx: number) => {
    onProgramChange({ ...program, modules: program.modules.filter((_, i) => i !== mIdx) })
  }

  const moveModuleUp = (mIdx: number) => {
    if (mIdx === 0) return
    const newModules = [...program.modules]
    ;[newModules[mIdx - 1], newModules[mIdx]] = [newModules[mIdx], newModules[mIdx - 1]]
    onProgramChange({ ...program, modules: newModules })
  }

  const moveModuleDown = (mIdx: number) => {
    if (mIdx === program.modules.length - 1) return
    const newModules = [...program.modules]
    ;[newModules[mIdx], newModules[mIdx + 1]] = [newModules[mIdx + 1], newModules[mIdx]]
    onProgramChange({ ...program, modules: newModules })
  }

  return (
    <div className="space-y-4">
      {/* Program name */}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          Program Name
        </label>
        <input
          type="text"
          value={program.programName}
          onChange={(e) => onProgramChange({ ...program, programName: e.target.value })}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base font-semibold text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          placeholder="Program name..."
        />
      </div>

      {/* Failed lessons banner */}
      {failedCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-700/50 dark:bg-amber-900/20">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="flex-1 text-sm text-amber-700 dark:text-amber-300">
            {failedCount} lesson{failedCount !== 1 ? 's' : ''} failed to generate.
          </p>
          {onUploadMore && (
            <button
              type="button"
              onClick={onUploadMore}
              className="flex items-center gap-1.5 text-sm font-medium text-amber-700 underline hover:no-underline dark:text-amber-400"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload additional files
            </button>
          )}
        </div>
      )}

      {/* Scrollable modules list */}
      <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
        {program.modules.map((mod, mIdx) => (
          <ModuleCard
            key={mIdx}
            mod={mod}
            moduleIndex={mIdx}
            totalModules={program.modules.length}
            defaultExpanded={mIdx === 0}
            onChange={(updated) => updateModule(mIdx, updated)}
            onMoveUp={() => moveModuleUp(mIdx)}
            onMoveDown={() => moveModuleDown(mIdx)}
            onDelete={() => deleteModule(mIdx)}
            onRetryLesson={
              onRetryLesson ? (lIdx) => onRetryLesson(mIdx, lIdx) : undefined
            }
          />
        ))}
      </div>
    </div>
  )
}
