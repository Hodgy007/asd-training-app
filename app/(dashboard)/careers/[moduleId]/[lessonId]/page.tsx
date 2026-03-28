'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, BookOpen, Video, CheckCircle } from 'lucide-react'
import { getCareerModuleById, getCareerLessonById } from '@/lib/careers-training-data'
import { QuizComponent } from '@/components/training/quiz-component'
import { clsx } from 'clsx'

interface LessonPageProps {
  params: { moduleId: string; lessonId: string }
}

function renderInline(text: string) {
  const normalised = text.replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
  const parts = normalised.split(/\*\*(.*?)\*\*/)
  return parts.map((part, j) =>
    j % 2 === 1 ? <strong key={j} className="text-slate-900 dark:text-slate-100">{part}</strong> : part
  )
}

function renderContent(content: string) {
  const lines = content.split('\n')
  return lines.map((line, i) => {
    if (line.startsWith('**') && line.endsWith('**')) {
      return (
        <h3 key={i} className="font-semibold text-slate-900 dark:text-slate-100 mt-5 mb-2 text-base">
          {line.replace(/\*\*/g, '')}
        </h3>
      )
    }
    if (line.startsWith('- ')) {
      return (
        <li key={i} className="text-slate-700 dark:text-slate-300 ml-4">
          {renderInline(line.slice(2))}
        </li>
      )
    }
    if (/^\d+\./.test(line)) {
      return (
        <li key={i} className="text-slate-700 dark:text-slate-300 ml-4 list-decimal">
          {renderInline(line.replace(/^\d+\.\s*/, ''))}
        </li>
      )
    }
    if (line.trim() === '') {
      return <div key={i} className="h-2" />
    }
    return (
      <p key={i} className="text-slate-700 dark:text-slate-300">
        {renderInline(line)}
      </p>
    )
  })
}

export default function CareerLessonPage({ params }: LessonPageProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [quizStarted, setQuizStarted] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [saving, setSaving] = useState(false)

  const module = getCareerModuleById(params.moduleId)
  const lesson = getCareerLessonById(params.moduleId, params.lessonId)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    // RBAC: redirect non-careers users
    if (
      status === 'authenticated' &&
      session?.user?.role !== 'CAREER_DEV_OFFICER' &&
      session?.user?.role !== 'ADMIN'
    ) {
      router.push('/dashboard')
    }
  }, [status, session, router])

  if (!module || !lesson) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Lesson not found.</p>
        <Link href="/careers" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
          Back to careers training
        </Link>
      </div>
    )
  }

  const lessonIndex = module.lessons.findIndex((l) => l.id === lesson.id)
  const nextLesson = module.lessons[lessonIndex + 1]
  const isLastLesson = lessonIndex === module.lessons.length - 1

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
          href={`/careers/${module.id}`}
          className="text-slate-400 hover:text-slate-600 transition-colors truncate max-w-[200px]"
        >
          {module.title}
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
              Module {module.order} &middot; Lesson {lessonIndex + 1}
            </p>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">{lesson.title}</h1>
          </div>
        </div>
      </div>

      {/* Lesson content */}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Lesson Content</h2>
        <div className="space-y-1 prose-lesson">{renderContent(lesson.content)}</div>
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
              {lesson.quizQuestions.length} questions to test your understanding
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
                  href={`/careers/${module.id}/${nextLesson.id}`}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  Next: {nextLesson.title}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <Link
                  href={`/careers/${module.id}`}
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
            <QuizComponent questions={lesson.quizQuestions} onComplete={handleQuizComplete} />
          </div>
        )}
      </div>
    </div>
  )
}
