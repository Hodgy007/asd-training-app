'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { sanitizeHtml } from '@/lib/sanitize'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, ChevronDown, BookOpen, Video, CheckCircle, Loader2, FileText, Download, StickyNote } from 'lucide-react'
import { VideoPlayer } from '@/components/training/video-player'
import { QuizComponent } from '@/components/training/quiz-component'
import { InteractiveBlockRenderer } from '@/components/training/interactive/interactive-block-renderer'
import { splitContentAtBlocks, validateInteractiveBlocks } from '@/lib/interactive-blocks'
import { InteractiveBlock, InteractionData } from '@/types/interactive'
import { TextToSpeech } from '@/components/training/text-to-speech'
import { clsx } from 'clsx'

interface LessonPageProps {
  params: { programId: string; moduleId: string; lessonId: string }
}

interface LessonData {
  id: string
  title: string
  type: 'VIDEO' | 'TEXT'
  content: string
  videoUrl?: string | null
  order: number
  quizQuestions: {
    id: string
    question: string
    options: string
    correctAnswer: string
    explanation: string
    order: number
  }[]
  interactiveBlocks?: unknown
  transcript?: string | null
  attachments?: { id: string; fileName: string; fileSize: number; url: string }[]
  module: {
    id: string
    title: string
    programId: string
    order: number
    lessons: { id: string; title: string; order: number }[]
  }
}

export default function ProgramLessonPage({ params }: LessonPageProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [quizStarted, setQuizStarted] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lesson, setLesson] = useState<LessonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [programName, setProgramName] = useState('')
  const [interactionData, setInteractionData] = useState<InteractionData>({})
  const [noteContent, setNoteContent] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  // Derive program name from session
  useEffect(() => {
    if (session?.user?.effectivePrograms) {
      const prog = session.user.effectivePrograms.find((p) => p.id === params.programId)
      setProgramName(prog?.name ?? 'Training')
    }
  }, [session, params.programId])

  useEffect(() => {
    if (status !== 'authenticated') return
    setLoading(true)
    fetch('/api/training/lessons/' + params.lessonId)
      .then((res) => {
        if (!res.ok) throw new Error('Not found')
        return res.json()
      })
      .then((data) => {
        setLesson(data)
        setLoading(false)
        // Fetch interaction data for interactive blocks
        if (data.interactiveBlocks && Array.isArray(data.interactiveBlocks) && data.interactiveBlocks.length > 0) {
          fetch(`/api/training/interactions?lessonId=${params.lessonId}&moduleId=${params.moduleId}`)
            .then(r => r.ok ? r.json() : { interactionData: {} })
            .then(d => setInteractionData(d.interactionData ?? {}))
            .catch(() => {})
        }
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [params.lessonId, params.moduleId, status])

  // Fetch learner notes
  useEffect(() => {
    if (status !== 'authenticated') return
    fetch(`/api/training/notes?lessonId=${params.lessonId}`)
      .then(r => r.ok ? r.json() : { content: '' })
      .then(d => setNoteContent(d.content ?? ''))
      .catch(() => {})
  }, [params.lessonId, status])

  // Auto-save notes with 500ms debounce
  const noteInitialised = useRef(false)
  useEffect(() => {
    if (!noteInitialised.current) { noteInitialised.current = true; return }
    if (!noteContent && !noteSaving) return
    const timer = setTimeout(() => {
      setNoteSaving(true)
      fetch('/api/training/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId: params.lessonId, content: noteContent }),
      })
        .finally(() => setNoteSaving(false))
    }, 500)
    return () => clearTimeout(timer)
  }, [noteContent, params.lessonId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    )
  }

  if (error || !lesson) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Lesson not found.</p>
        <Link href={`/training/${params.programId}`} className="text-primary-600 hover:text-primary-700 mt-2 inline-block">
          Back to training
        </Link>
      </div>
    )
  }

  const moduleLessons = lesson.module.lessons
  const lessonIndex = moduleLessons.findIndex((l) => l.id === lesson.id)
  const nextLesson = moduleLessons[lessonIndex + 1]
  const isLastLesson = lessonIndex === moduleLessons.length - 1

  const quizQuestions = lesson.quizQuestions.map((q) => ({
    ...q,
    options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
  }))

  // Parse interactive blocks and split content
  const blocks: InteractiveBlock[] = validateInteractiveBlocks(lesson.interactiveBlocks) ?? []
  const contentSegments = splitContentAtBlocks(lesson.content, blocks)
  const blocksById = new Map(blocks.map(b => [b.id, b]))

  async function handleBlockComplete(blockId: string) {
    const current = interactionData[blockId]
    const updated: InteractionData = {
      ...interactionData,
      [blockId]: { completed: true, attempts: (current?.attempts ?? 0) + 1 },
    }
    setInteractionData(updated)
    // Persist in background
    fetch('/api/training/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonId: params.lessonId,
        moduleId: params.moduleId,
        blockId,
        completed: true,
        attempts: (current?.attempts ?? 0) + 1,
      }),
    }).catch(() => {})
  }

  async function handleQuizComplete(score: number) {
    setSaving(true)
    try {
      await fetch('/api/training/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId: params.moduleId,
          lessonId: params.lessonId,
          completed: true,
          score,
        }),
      })
      setCompleted(true)
    } catch (err) {
      console.error('Failed to save progress', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-page-enter">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <Link href={`/training/${params.programId}`} className="text-slate-400 hover:text-slate-600 transition-colors">
          {programName || 'Training'}
        </Link>
        <span className="text-slate-300">/</span>
        <Link
          href={`/training/${params.programId}/${lesson.module.id}`}
          className="text-slate-400 hover:text-slate-600 transition-colors truncate max-w-[200px]"
        >
          {lesson.module.title}
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-700 font-medium truncate">{lesson.title}</span>
      </div>

      {/* Header */}
      <div className="card">
        <div className="flex items-start gap-3">
          <div
            className={clsx(
              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
              lesson.type === 'VIDEO' ? 'bg-primary-100' : 'bg-sage-100'
            )}
          >
            {lesson.type === 'VIDEO' ? (
              <Video className="h-5 w-5 text-primary-600" />
            ) : (
              <BookOpen className="h-5 w-5 text-sage-600" />
            )}
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
              Module {lesson.module.order} &middot; Lesson {lessonIndex + 1}
            </p>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">{lesson.title}</h1>
          </div>
        </div>
      </div>

      {/* Video (if applicable) */}
      {lesson.type === 'VIDEO' && (
        <VideoPlayer title={lesson.title} videoUrl={lesson.videoUrl ?? undefined} />
      )}

      {/* Video transcript */}
      {lesson.type === 'VIDEO' && lesson.transcript && (
        <div className="card">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 w-full"
          >
            {showTranscript ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <FileText className="h-4 w-4 text-slate-500" />
            Transcript
          </button>
          {showTranscript && (
            <div className="mt-3 text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
              {lesson.transcript}
            </div>
          )}
        </div>
      )}

      {/* Lesson content */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Lesson Content</h2>
          <TextToSpeech contentRef={contentRef} />
        </div>
        <div ref={contentRef}>
          {contentSegments.map((segment, idx) => {
            if (segment.type === 'html') {
              return (
                <div
                  key={`html-${idx}`}
                  className="prose-lesson space-y-1 text-slate-700 dark:text-slate-300 overflow-x-hidden break-words [&_h1]:font-bold [&_h1]:text-xl [&_h1]:text-slate-900 [&_h1]:dark:text-slate-100 [&_h1]:mt-6 [&_h1]:mb-3 [&_h2]:font-semibold [&_h2]:text-lg [&_h2]:text-slate-900 [&_h2]:dark:text-slate-100 [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:font-semibold [&_h3]:text-base [&_h3]:text-slate-900 [&_h3]:dark:text-slate-100 [&_h3]:mt-5 [&_h3]:mb-2 [&_p]:mb-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:sm:ml-6 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:sm:ml-6 [&_ol]:mb-3 [&_li]:mb-1 [&_li]:leading-relaxed [&_strong]:text-slate-900 [&_strong]:dark:text-slate-100 [&_strong]:font-semibold [&_em]:italic [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_table]:w-full [&_table]:overflow-x-auto [&_table]:block [&_table]:text-sm [&_pre]:overflow-x-auto [&_pre]:max-w-full"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(segment.content) }}
                />
              )
            }
            const block = blocksById.get(segment.blockId)
            if (!block) return null
            return (
              <InteractiveBlockRenderer
                key={`block-${segment.blockId}`}
                block={block}
                interactionData={interactionData}
                lessonId={params.lessonId}
                moduleId={params.moduleId}
                onBlockComplete={handleBlockComplete}
              />
            )
          })}
        </div>
      </div>

      {/* Attachments / Resources */}
      {lesson.attachments && lesson.attachments.length > 0 && (
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-500" />
            Resources
          </h3>
          <div className="space-y-2">
            {lesson.attachments.map((att) => (
              <a
                key={att.id}
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex items-center gap-3 p-3 rounded-xl border border-calm-200 dark:border-slate-600 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors"
              >
                <FileText className="h-5 w-5 text-red-500 flex-shrink-0" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{att.fileName}</span>
                <span className="text-xs text-slate-400 flex-shrink-0">
                  {att.fileSize < 1024 * 1024
                    ? `${Math.round(att.fileSize / 1024)} KB`
                    : `${(att.fileSize / (1024 * 1024)).toFixed(1)} MB`}
                </span>
                <Download className="h-4 w-4 text-slate-400 ml-auto flex-shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* My Notes */}
      <div className="card">
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 w-full"
        >
          {showNotes ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <StickyNote className="h-4 w-4 text-amber-500" />
          My Notes
          {noteSaving && <span className="text-xs text-slate-400 ml-auto">Saving...</span>}
        </button>
        {showNotes && (
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Write your personal notes here — they auto-save as you type..."
            className="mt-3 w-full rounded-xl border border-calm-200 dark:border-slate-600 bg-calm-50 dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 min-h-[80px] resize-y"
          />
        )}
      </div>

      {/* Reflection prompt */}
      <div className="bg-primary-50 border border-primary-100 rounded-2xl p-5">
        <p className="text-primary-800 font-semibold mb-2">What did you notice?</p>
        <p className="text-primary-700 text-sm">
          Before moving on to the quiz, take a moment to reflect on what you have learned
          in this lesson and how it applies to your practice.
        </p>
      </div>

      {/* Quiz section */}
      <div className="card">
        {!quizStarted && !completed ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-6 w-6 text-primary-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Knowledge Check</h2>
            <p className="text-slate-500 text-sm mb-6">
              {quizQuestions.length} questions to test your understanding
            </p>
            <button onClick={() => setQuizStarted(true)} className="btn-primary px-8">
              Start quiz
            </button>
          </div>
        ) : completed ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sage-600">
              <CheckCircle className="h-6 w-6" />
              <span className="font-semibold">Lesson complete!</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {nextLesson && !isLastLesson ? (
                <Link
                  href={`/training/${params.programId}/${lesson.module.id}/${nextLesson.id}`}
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  Next lesson: {nextLesson.title}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <Link
                  href={`/training/${params.programId}/${lesson.module.id}`}
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  Back to module overview
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
              <Link href={`/training/${params.programId}`} className="btn-secondary flex items-center justify-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                All modules
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-5">Knowledge Check</h2>
            <QuizComponent questions={quizQuestions} onComplete={handleQuizComplete} />
          </div>
        )}
      </div>
    </div>
  )
}
