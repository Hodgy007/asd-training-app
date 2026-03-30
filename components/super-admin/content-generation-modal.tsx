'use client'

import { useState, useCallback } from 'react'
import { X, Upload, Sparkles, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'
import type {
  GenerationMode,
  GenerationLens,
  GeneratedProgram,
  SSEEvent,
} from '@/lib/content-generator-types'
import { FileDropZone } from './file-drop-zone'
import { GenerationProgress } from './generation-progress'
import type { ProgressPhase } from './generation-progress'
import { ProgramPreview } from './program-preview'

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalStep = 'upload' | 'processing' | 'preview' | 'saving' | 'done'

interface ContentGenerationModalProps {
  mode: GenerationMode
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

// ─── SSE Stream Reader ────────────────────────────────────────────────────────

async function readSSEStream(
  res: Response,
  onEvent: (event: SSEEvent) => void
): Promise<void> {
  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('data: ')) {
        try {
          const json = JSON.parse(trimmed.slice(6))
          onEvent(json as SSEEvent)
        } catch {
          // ignore malformed lines
        }
      }
    }
  }

  // Process any remaining buffered data
  if (buffer.trim().startsWith('data: ')) {
    try {
      const json = JSON.parse(buffer.trim().slice(6))
      onEvent(json as SSEEvent)
    } catch {
      // ignore
    }
  }
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function ContentGenerationModal({
  mode,
  isOpen,
  onClose,
  onComplete,
}: ContentGenerationModalProps) {
  // Step state
  const [step, setStep] = useState<ModalStep>('upload')

  // Upload step state
  const [files, setFiles] = useState<File[]>([])
  const [programName, setProgramName] = useState('')
  const [lens, setLens] = useState<GenerationLens>('autism')
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Processing step state
  const [progressPhase, setProgressPhase] = useState<ProgressPhase>('parsing')
  const [progressCurrentLesson, setProgressCurrentLesson] = useState(1)
  const [progressTotalLessons, setProgressTotalLessons] = useState(0)
  const [progressCurrentPhase, setProgressCurrentPhase] = useState<'content' | 'quiz'>('content')
  const [progressErrors, setProgressErrors] = useState<string[]>([])

  // Preview step state
  const [program, setProgram] = useState<GeneratedProgram | null>(null)

  // Saved parsed content for retry
  const [parsedContent, setParsedContent] = useState<unknown[]>([])

  // Save error
  const [saveError, setSaveError] = useState<string | null>(null)

  // ─── Reset ──────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setStep('upload')
    setFiles([])
    setProgramName('')
    setLens('autism')
    setUploadError(null)
    setProgressPhase('parsing')
    setProgressCurrentLesson(1)
    setProgressTotalLessons(0)
    setProgressCurrentPhase('content')
    setProgressErrors([])
    setProgram(null)
    setParsedContent([])
    setSaveError(null)
  }, [])

  const handleClose = () => {
    reset()
    onClose()
  }

  // ─── Process Files ───────────────────────────────────────────────────────────

  const processFiles = useCallback(async () => {
    setUploadError(null)
    setStep('processing')
    setProgressPhase('parsing')
    setProgressErrors([])
    setProgressCurrentLesson(1)
    setProgressCurrentPhase('content')

    try {
      // Step 1: Parse files
      const formData = new FormData()
      for (const file of files) {
        formData.append('files', file)
      }

      const parseRes = await fetch('/api/super-admin/training/parse-files', {
        method: 'POST',
        body: formData,
      })

      if (!parseRes.ok) {
        const err = await parseRes.json().catch(() => ({ error: 'Parse failed' }))
        throw new Error(err.error ?? 'Failed to parse files')
      }

      const parsed = await parseRes.json()
      setParsedContent(parsed)

      // Step 2: Generate outline
      setProgressPhase('outline')

      const outlineRes = await fetch('/api/super-admin/training/generate-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parsedContent: parsed,
          mode,
          lens,
          programName,
        }),
      })

      if (!outlineRes.ok) {
        const err = await outlineRes.json().catch(() => ({ error: 'Outline generation failed' }))
        throw new Error(err.error ?? 'Failed to generate outline')
      }

      const outline = await outlineRes.json()

      // Step 3: Generate content via SSE
      setProgressPhase('content')

      const contentRes = await fetch('/api/super-admin/training/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outline, parsedContent: parsed, mode, lens }),
      })

      if (!contentRes.ok) {
        const err = await contentRes.json().catch(() => ({ error: 'Content generation failed' }))
        throw new Error(err.error ?? 'Failed to generate content')
      }

      let finalProgram: GeneratedProgram | null = null
      const errors: string[] = []

      await readSSEStream(contentRes, (event) => {
        switch (event.type) {
          case 'progress':
            setProgressCurrentLesson(event.lesson)
            setProgressTotalLessons(event.total)
            setProgressCurrentPhase(event.phase)
            setProgressPhase(event.phase === 'quiz' ? 'quiz' : 'content')
            break

          case 'lesson-complete':
            // No-op — will be captured in the final program
            break

          case 'quiz-complete':
            // No-op — will be captured in the final program
            break

          case 'lesson-error':
            errors.push(
              `Module ${event.moduleIndex + 1}, Lesson ${event.lessonIndex + 1}: ${event.error}`
            )
            setProgressErrors([...errors])
            break

          case 'complete':
            finalProgram = event.program
            setProgressPhase('complete')
            break
        }
      })

      if (!finalProgram) {
        throw new Error('Generation did not complete successfully')
      }

      setProgram(finalProgram)
      setProgressErrors(errors)
      setStep('preview')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      setProgressPhase('error')
      setUploadError(message)
    }
  }, [files, programName, mode, lens])

  // ─── Retry Lesson ────────────────────────────────────────────────────────────

  const retryLesson = useCallback(
    async (moduleIndex: number, lessonIndex: number) => {
      if (!program) return

      try {
        const formData = new FormData()
        formData.append(
          'metadata',
          JSON.stringify({
            existingParsedContent: parsedContent,
            program,
            failedLessons: [{ moduleIndex, lessonIndex }],
            mode,
            lens,
          })
        )

        const res = await fetch('/api/super-admin/training/parse-and-regenerate', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          throw new Error('Retry failed')
        }

        await readSSEStream(res, (event) => {
          if (event.type === 'lesson-complete') {
            setProgram((prev) => {
              if (!prev) return prev
              const newModules = prev.modules.map((mod, mIdx) => {
                if (mIdx !== event.moduleIndex) return mod
                return {
                  ...mod,
                  lessons: mod.lessons.map((lesson, lIdx) => {
                    if (lIdx !== event.lessonIndex) return lesson
                    return { ...lesson, content: event.content, error: undefined }
                  }),
                }
              })
              return { ...prev, modules: newModules }
            })
          } else if (event.type === 'quiz-complete') {
            setProgram((prev) => {
              if (!prev) return prev
              const newModules = prev.modules.map((mod, mIdx) => {
                if (mIdx !== event.moduleIndex) return mod
                return {
                  ...mod,
                  lessons: mod.lessons.map((lesson, lIdx) => {
                    if (lIdx !== event.lessonIndex) return lesson
                    return { ...lesson, quizQuestions: event.questions }
                  }),
                }
              })
              return { ...prev, modules: newModules }
            })
          }
        })
      } catch (err) {
        console.error('Retry lesson failed:', err)
      }
    },
    [program, parsedContent, mode, lens]
  )

  // ─── Save Program ────────────────────────────────────────────────────────────

  const saveProgram = useCallback(async () => {
    if (!program) return
    setSaveError(null)
    setStep('saving')

    try {
      const res = await fetch('/api/super-admin/training/save-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(program),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }))
        throw new Error(err.error ?? 'Failed to save program')
      }

      setStep('done')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save'
      setSaveError(message)
      setStep('preview')
    }
  }, [program])

  // ─── Upload More Handler ──────────────────────────────────────────────────────

  const handleUploadMore = () => {
    setStep('upload')
  }

  if (!isOpen) return null

  // ─── Title ───────────────────────────────────────────────────────────────────

  const title = mode === 'structure' ? 'Import from Files' : 'Generate from Files'
  const HeaderIcon = mode === 'structure' ? Upload : Sparkles

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Card */}
      <div className="relative z-10 flex w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-slate-900 max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30">
            <HeaderIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <h2
            id="modal-title"
            className="flex-1 text-base font-semibold text-slate-800 dark:text-slate-100"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* ── Step 1: Upload ─────────────────────────────────────────── */}
          {step === 'upload' && (
            <div className="space-y-5">
              <FileDropZone files={files} onFilesChange={setFiles} />

              {/* Program name */}
              <div>
                <label
                  htmlFor="program-name"
                  className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  Program Name
                </label>
                <input
                  id="program-name"
                  type="text"
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 placeholder:text-slate-400"
                  placeholder="e.g. ASD Awareness Module 3"
                />
              </div>

              {/* Lens toggle (generate mode only) */}
              {mode === 'generate' && (
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    Generation Lens
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setLens('autism')}
                      className={clsx(
                        'flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors',
                        lens === 'autism'
                          ? 'border-purple-500 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-900/20 dark:text-purple-300'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-500'
                      )}
                    >
                      Autism Lens
                    </button>
                    <button
                      type="button"
                      onClick={() => setLens('practitioner')}
                      className={clsx(
                        'flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors',
                        lens === 'practitioner'
                          ? 'border-purple-500 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-900/20 dark:text-purple-300'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-500'
                      )}
                    >
                      Practitioner Lens
                    </button>
                  </div>
                </div>
              )}

              {/* Error */}
              {uploadError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-700/50 dark:bg-red-900/20">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                  <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Processing ─────────────────────────────────────── */}
          {step === 'processing' && (
            <GenerationProgress
              phase={progressPhase}
              currentLesson={progressCurrentLesson}
              totalLessons={progressTotalLessons}
              currentPhase={progressCurrentPhase}
              errors={progressErrors}
            />
          )}

          {/* ── Step 3: Preview ────────────────────────────────────────── */}
          {(step === 'preview' || step === 'saving') && program && (
            <div className="space-y-4">
              <ProgramPreview
                program={program}
                onProgramChange={setProgram}
                onRetryLesson={retryLesson}
                onUploadMore={handleUploadMore}
              />
              {saveError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-700/50 dark:bg-red-900/20">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                  <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Done ───────────────────────────────────────────── */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-9 w-9 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  Program Created!
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Your training program has been saved as a draft.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
          {/* Upload step */}
          {step === 'upload' && (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={processFiles}
                disabled={files.length === 0 || !programName.trim()}
                className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                Process Files
              </button>
            </>
          )}

          {/* Processing step */}
          {step === 'processing' && progressPhase !== 'error' && (
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
          )}

          {/* Processing + error */}
          {step === 'processing' && progressPhase === 'error' && (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('upload')
                  setUploadError(uploadError)
                  setProgressPhase('parsing')
                }}
                className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
              >
                Try Again
              </button>
            </>
          )}

          {/* Preview step */}
          {step === 'preview' && (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={saveProgram}
                className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
              >
                Save Program
              </button>
            </>
          )}

          {/* Saving step */}
          {step === 'saving' && (
            <button
              type="button"
              disabled
              className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white opacity-70 cursor-not-allowed"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </button>
          )}

          {/* Done step */}
          {step === 'done' && (
            <button
              type="button"
              onClick={() => {
                onComplete()
                handleClose()
              }}
              className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
