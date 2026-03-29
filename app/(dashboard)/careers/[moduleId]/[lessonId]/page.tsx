'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, BookOpen, Video, CheckCircle, Loader2 } from 'lucide-react'
import { QuizComponent } from '@/components/training/quiz-component'
import { clsx } from 'clsx'

interface LessonPageProps {
  params: { moduleId: string; lessonId: string }
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
  module: {
    id: string
    title: string
    type: string
    order: number
    lessons: { id: string; title: string; order: number }[]
  }
}

export default function CareerLessonPage({ params }: LessonPageProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [quizStarted, setQuizStarted] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lesson, setLesson] = useState<LessonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    // RBAC: redirect non-careers users
    if (
      status === 'authenticated' &&
      session?.user?.role !== 'CAREER_DEV_OFFICER' &&
      session?.user?.role !== 'SUPER_ADMIN'
    ) {
      router.push('/dashboard')
    }
  }, [status, session, router])

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
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [params.lessonId, status])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error || !lesson) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Lesson not found.</p>
        <Link href="/careers" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
          Back to careers training
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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <Link href="/careers" className="text-slate-400 hover:text-slate-600 transition-colors">
          Careers Training
        </Link>
        <span className="text-slate-300">/</span>
        <Link
          href={`/careers/${lesson.module.id}`}
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
              lesson.type === 'VIDEO' ? 'bg-blue-100' : 'bg-indigo-100'
            )}
          >
            {lesson.type === 'VIDEO' ? (
              <Video className="h-5 w-5 text-blue-600" />
            ) : (
              <BookOpen className="h-5 w-5 text-indigo-600" />
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

      {/* Lesson content */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Lesson Content</h2>
        <div
          className="prose-lesson space-y-1 text-slate-700 dark:text-slate-300
            [&_h1]:font-bold [&_h1]:text-xl [&_h1]:text-slate-900 [&_h1]:mt-6 [&_h1]:mb-3
            [&_h2]:font-semibold [&_h2]:text-lg [&_h2]:text-slate-900 [&_h2]:mt-5 [&_h2]:mb-2
            [&_h3]:font-semibold [&_h3]:text-base [&_h3]:text-slate-900 [&_h3]:mt-5 [&_h3]:mb-2
            [&_p]:mb-2 [&_p]:leading-relaxed
            [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-3
            [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-3
            [&_li]:mb-1 [&_li]:leading-relaxed
            [&_strong]:text-slate-900 [&_strong]:font-semibold
            [&_em]:italic"
          dangerouslySetInnerHTML={{ __html: lesson.content }}
        />
      </div>

      {/* Reflection prompt */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
        <p className="text-blue-800 font-semibold mb-2">Reflect on your practice</p>
        <p className="text-blue-700 text-sm">
          Before starting the quiz, consider how the ideas in this lesson apply to a young person
          you work with. How might you adapt your approach based on what you have just read?
        </p>
      </div>

      {/* Quiz section */}
      <div className="card">
        {!quizStarted && !completed ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Knowledge Check</h2>
            <p className="text-slate-500 text-sm mb-6">
              {quizQuestions.length} questions to test your understanding
            </p>
            <button
              onClick={() => setQuizStarted(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-2.5 rounded-xl transition-colors"
            >
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
                  href={`/careers/${lesson.module.id}/${nextLesson.id}`}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  Next: {nextLesson.title}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <Link
                  href={`/careers/${lesson.module.id}`}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  Back to module overview
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
              <Link
                href="/careers"
                className="border border-calm-200 text-slate-600 hover:bg-calm-50 font-bold px-5 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
              >
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
