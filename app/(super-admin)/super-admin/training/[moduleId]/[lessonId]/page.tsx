'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import 'react-quill-new/dist/quill.snow.css'
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Wand2,
  CheckCircle,
  X,
} from 'lucide-react'
import { clsx } from 'clsx'

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false })

/* ──────────────────────────── Types ──────────────────────────── */

interface QuizQuestion {
  id: string
  lessonId: string
  question: string
  options: string // JSON string
  correctAnswer: string
  explanation: string
  order: number
}

interface ParsedQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: string
  explanation: string
  order: number
}

interface LessonData {
  id: string
  title: string
  type: string
  content: string
  videoUrl: string | null
  order: number
  active: boolean
  module: { id: string; title: string }
  quizQuestions: QuizQuestion[]
}

interface GeneratedQuestion {
  question: string
  options: string[]
  correctAnswer: string
  explanation: string
}

function parseQuestion(q: QuizQuestion): ParsedQuestion {
  let options: string[] = []
  try {
    options = JSON.parse(q.options)
  } catch {
    options = []
  }
  return { id: q.id, question: q.question, options, correctAnswer: q.correctAnswer, explanation: q.explanation, order: q.order }
}

/* ──────────────────────────── Main Page ──────────────────────────── */

export default function LessonEditorPage() {
  const params = useParams()
  const moduleId = params.moduleId as string
  const lessonId = params.lessonId as string

  const [lesson, setLesson] = useState<LessonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Lesson edit fields
  const [editTitle, setEditTitle] = useState('')
  const [editType, setEditType] = useState('TEXT')
  const [editContent, setEditContent] = useState('')
  const [editVideoUrl, setEditVideoUrl] = useState('')

  // Quiz state
  const [questions, setQuestions] = useState<ParsedQuestion[]>([])
  const [expandedQ, setExpandedQ] = useState<string | null>(null)

  const quillModules = useMemo(() => ({
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ header: [2, 3, false] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link'],
      ['clean'],
    ],
  }), [])

  const fetchLesson = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/super-admin/training/lessons/${lessonId}`)
      if (res.ok) {
        const data: LessonData = await res.json()
        setLesson(data)
        setEditTitle(data.title)
        setEditType(data.type)
        setEditContent(data.content || '')
        setEditVideoUrl(data.videoUrl || '')
        setQuestions(data.quizQuestions.map(parseQuestion))
      }
    } finally {
      setLoading(false)
    }
  }, [lessonId])

  useEffect(() => {
    fetchLesson()
  }, [fetchLesson])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(t)
    }
  }, [toast])

  const saveLesson = async () => {
    setSaving(true)
    try {
      const body: Record<string, string> = {
        title: editTitle.trim(),
        type: editType,
        content: editContent,
      }
      if (editType === 'VIDEO') body.videoUrl = editVideoUrl.trim()
      const res = await fetch(`/api/super-admin/training/lessons/${lessonId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setToast({ message: 'Lesson saved', type: 'success' })
        await fetchLesson()
      } else {
        setToast({ message: 'Failed to save lesson', type: 'error' })
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 dark:text-slate-400">Lesson not found.</p>
        <Link href={`/super-admin/training/${moduleId}`} className="text-purple-600 hover:underline text-sm mt-2 inline-block">
          Back to Module
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <div
          className={clsx(
            'fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-bold',
            toast.type === 'success'
              ? 'bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300'
              : 'bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300'
          )}
        >
          {toast.message}
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <Link href="/super-admin/training" className="text-purple-600 hover:underline flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Training Content
        </Link>
        <span className="text-slate-400">/</span>
        <Link href={`/super-admin/training/${moduleId}`} className="text-purple-600 hover:underline">
          {lesson.module.title}
        </Link>
        <span className="text-slate-400">/</span>
        <span className="text-slate-700 dark:text-slate-300 font-semibold">{lesson.title}</span>
      </div>

      {/* ─── Section 1: Lesson Editor ─── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edit Lesson</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Title</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Type</label>
            <select
              value={editType}
              onChange={(e) => setEditType(e.target.value)}
              className="w-full rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
            >
              <option value="TEXT">Text</option>
              <option value="VIDEO">Video</option>
            </select>
          </div>
        </div>

        {editType === 'VIDEO' && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Video URL</label>
            <input
              type="url"
              value={editVideoUrl}
              onChange={(e) => setEditVideoUrl(e.target.value)}
              placeholder="https://youtube.com/embed/..."
              className="w-full rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Content</label>
          <div className="rounded-xl border border-calm-200 dark:border-slate-600 overflow-hidden [&_.ql-toolbar]:border-calm-200 [&_.ql-toolbar]:dark:border-slate-600 [&_.ql-toolbar]:bg-calm-50 [&_.ql-toolbar]:dark:bg-slate-700 [&_.ql-container]:border-0 [&_.ql-editor]:min-h-[200px] [&_.ql-editor]:text-sm [&_.ql-editor]:text-slate-900 [&_.ql-editor]:dark:text-white [&_.ql-editor]:bg-white [&_.ql-editor]:dark:bg-slate-700">
            <ReactQuill
              theme="snow"
              value={editContent}
              onChange={setEditContent}
              modules={quillModules}
            />
          </div>
        </div>

        <button
          onClick={saveLesson}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Lesson
        </button>
      </div>

      {/* ─── Section 2: Quiz Management ─── */}
      <QuizSection
        lessonId={lessonId}
        questions={questions}
        setQuestions={setQuestions}
        expandedQ={expandedQ}
        setExpandedQ={setExpandedQ}
        lessonContent={editContent}
        setToast={setToast}
        refetch={fetchLesson}
      />
    </div>
  )
}

/* ──────────────────────────── Quiz Section ──────────────────────────── */

interface QuizSectionProps {
  lessonId: string
  questions: ParsedQuestion[]
  setQuestions: (q: ParsedQuestion[]) => void
  expandedQ: string | null
  setExpandedQ: (id: string | null) => void
  lessonContent: string
  setToast: (t: { message: string; type: 'success' | 'error' }) => void
  refetch: () => Promise<void>
}

function QuizSection({
  lessonId,
  questions,
  setQuestions,
  expandedQ,
  setExpandedQ,
  lessonContent,
  setToast,
  refetch,
}: QuizSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [aiCount, setAiCount] = useState(5)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiPreview, setAiPreview] = useState<GeneratedQuestion[] | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const deleteQuestion = async (qId: string) => {
    setDeletingId(qId)
    try {
      const res = await fetch(`/api/super-admin/training/quiz/question/${qId}`, { method: 'DELETE' })
      if (res.ok) {
        setToast({ message: 'Question deleted', type: 'success' })
        await refetch()
      }
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  const generateQuiz = async () => {
    setAiGenerating(true)
    try {
      const res = await fetch('/api/super-admin/training/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonContent, questionCount: aiCount }),
      })
      if (res.ok) {
        const data = await res.json()
        setAiPreview(data.questions)
      } else {
        setToast({ message: 'Failed to generate quiz', type: 'error' })
      }
    } catch {
      setToast({ message: 'Network error generating quiz', type: 'error' })
    } finally {
      setAiGenerating(false)
    }
  }

  const saveAiQuestions = async () => {
    if (!aiPreview) return
    if (questions.length > 0) {
      const ok = window.confirm(`This will replace ${questions.length} existing question${questions.length !== 1 ? 's' : ''}. Continue?`)
      if (!ok) return
    }
    try {
      const res = await fetch(`/api/super-admin/training/quiz/${lessonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: aiPreview.map((q) => ({
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
          })),
        }),
      })
      if (res.ok) {
        setToast({ message: 'Quiz questions saved', type: 'success' })
        setAiPreview(null)
        setShowAiPanel(false)
        await refetch()
      }
    } catch {
      setToast({ message: 'Failed to save questions', type: 'error' })
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Quiz Questions</h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            {questions.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowAddForm(!showAddForm); setShowAiPanel(false) }}
            className="inline-flex items-center gap-2 border border-calm-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Manually
          </button>
          <button
            onClick={() => { setShowAiPanel(!showAiPanel); setShowAddForm(false); setAiPreview(null) }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl px-4 py-2 text-sm font-bold transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Generate Quiz with AI
          </button>
        </div>
      </div>

      {/* AI Generation Panel */}
      {showAiPanel && !aiPreview && (
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h3 className="font-bold text-purple-900 dark:text-purple-200">AI Quiz Generator</h3>
          </div>
          {aiGenerating ? (
            <div className="flex items-center gap-3 py-4">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              <span className="text-sm text-purple-700 dark:text-purple-300 font-semibold">Generating quiz questions...</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-purple-800 dark:text-purple-300">Number of questions</label>
              <input
                type="number"
                min={3}
                max={10}
                value={aiCount}
                onChange={(e) => setAiCount(Math.min(10, Math.max(3, parseInt(e.target.value) || 3)))}
                className="w-20 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-700 px-2 py-1 text-sm text-slate-900 dark:text-white text-center"
              />
              <button
                onClick={generateQuiz}
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-4 py-2 text-sm font-bold transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                Generate
              </button>
            </div>
          )}
        </div>
      )}

      {/* AI Preview */}
      {aiPreview && (
        <AiPreviewPanel
          questions={aiPreview}
          setQuestions={setAiPreview}
          onSave={saveAiQuestions}
          onCancel={() => { setAiPreview(null); setShowAiPanel(false) }}
        />
      )}

      {/* Add question form */}
      {showAddForm && (
        <AddQuestionForm
          lessonId={lessonId}
          onCreated={() => {
            setShowAddForm(false)
            setToast({ message: 'Question added', type: 'success' })
            refetch()
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Existing questions */}
      {questions.length === 0 && !showAddForm && !showAiPanel && (
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
          No quiz questions yet. Add them manually or generate with AI.
        </p>
      )}

      <div className="space-y-2">
        {questions.map((q) => (
          <div key={q.id} className="border border-calm-200 dark:border-slate-700 rounded-xl overflow-hidden">
            {editingId === q.id ? (
              <EditQuestionForm
                question={q}
                onSaved={() => {
                  setEditingId(null)
                  setToast({ message: 'Question updated', type: 'success' })
                  refetch()
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <>
                <button
                  onClick={() => setExpandedQ(expandedQ === q.id ? null : q.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-calm-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  {expandedQ === q.id ? (
                    <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  )}
                  <span className="font-semibold text-sm text-slate-900 dark:text-white flex-1">{q.question}</span>
                </button>
                {expandedQ === q.id && (
                  <div className="px-4 pb-4 space-y-3 border-t border-calm-100 dark:border-slate-700 pt-3">
                    <div className="space-y-1">
                      {q.options.map((opt, i) => {
                        const letter = String.fromCharCode(65 + i)
                        const isCorrect = q.correctAnswer === letter
                        return (
                          <div
                            key={i}
                            className={clsx(
                              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
                              isCorrect
                                ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 font-semibold'
                                : 'text-slate-700 dark:text-slate-300'
                            )}
                          >
                            {isCorrect && <CheckCircle className="h-4 w-4 flex-shrink-0" />}
                            <span className="font-semibold mr-1">{letter}.</span>
                            {opt}
                          </div>
                        )
                      })}
                    </div>
                    {q.explanation && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-0.5">Explanation</p>
                        <p className="text-sm text-blue-800 dark:text-blue-200">{q.explanation}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => setEditingId(q.id)}
                        className="text-sm font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400"
                      >
                        Edit
                      </button>
                      {confirmDeleteId === q.id ? (
                        <span className="flex items-center gap-2 text-sm">
                          <span className="text-red-600 dark:text-red-400 font-semibold">Delete?</span>
                          <button
                            onClick={() => deleteQuestion(q.id)}
                            disabled={deletingId === q.id}
                            className="text-red-600 hover:text-red-700 font-bold text-sm"
                          >
                            {deletingId === q.id ? 'Deleting...' : 'Yes'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-slate-500 hover:text-slate-700 font-bold text-sm"
                          >
                            No
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(q.id)}
                          className="text-sm font-bold text-red-500 hover:text-red-600"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ──────────────────────────── AI Preview Panel ──────────────────────────── */

interface AiPreviewPanelProps {
  questions: GeneratedQuestion[]
  setQuestions: (q: GeneratedQuestion[]) => void
  onSave: () => void
  onCancel: () => void
}

function AiPreviewPanel({ questions, setQuestions, onSave, onCancel }: AiPreviewPanelProps) {
  const updateQuestion = (index: number, field: keyof GeneratedQuestion, value: string | string[]) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value }
    setQuestions(updated)
  }

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...questions]
    const opts = [...updated[qIndex].options]
    opts[optIndex] = value
    updated[qIndex] = { ...updated[qIndex], options: opts }
    setQuestions(updated)
  }

  return (
    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Generated Questions Preview ({questions.length})
        </h3>
      </div>

      <div className="space-y-3">
        {questions.map((q, qi) => (
          <div key={qi} className="bg-white dark:bg-slate-800 rounded-xl border border-calm-200 dark:border-slate-700 p-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Question {qi + 1}</label>
              <input
                type="text"
                value={q.question}
                onChange={(e) => updateQuestion(qi, 'question', e.target.value)}
                className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 w-4">{String.fromCharCode(65 + oi)}.</span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updateOption(qi, oi, e.target.value)}
                    className="flex-1 rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Correct Answer</label>
                <select
                  value={q.correctAnswer}
                  onChange={(e) => updateQuestion(qi, 'correctAnswer', e.target.value)}
                  className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-sm text-slate-900 dark:text-white"
                >
                  {['A', 'B', 'C', 'D'].map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Explanation</label>
                <input
                  type="text"
                  value={q.explanation}
                  onChange={(e) => updateQuestion(qi, 'explanation', e.target.value)}
                  className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onSave}
          className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-4 py-2 text-sm font-bold transition-colors"
        >
          <Save className="h-4 w-4" />
          Save All Questions
        </button>
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-2 border border-calm-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
      </div>
    </div>
  )
}

/* ──────────────────────────── Add Question Form ──────────────────────────── */

interface AddQuestionFormProps {
  lessonId: string
  onCreated: () => void
  onCancel: () => void
}

function AddQuestionForm({ lessonId, onCreated, onCancel }: AddQuestionFormProps) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', '', '', ''])
  const [correctAnswer, setCorrectAnswer] = useState('A')
  const [explanation, setExplanation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const setOption = (i: number, v: string) => {
    const next = [...options]
    next[i] = v
    setOptions(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || options.some((o) => !o.trim())) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/super-admin/training/quiz/${lessonId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          options,
          correctAnswer,
          explanation: explanation.trim(),
        }),
      })
      if (res.ok) {
        onCreated()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create question')
      }
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-calm-200 dark:border-slate-700 rounded-xl p-4 space-y-3"
    >
      <h3 className="font-bold text-sm text-slate-900 dark:text-white">New Question</h3>
      {error && <p className="text-sm text-red-600 dark:text-red-400 font-semibold">{error}</p>}
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Question</label>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          required
          className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-900 dark:text-white"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map((opt, i) => (
          <div key={i}>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Option {String.fromCharCode(65 + i)}
            </label>
            <input
              type="text"
              value={opt}
              onChange={(e) => setOption(i, e.target.value)}
              required
              className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-900 dark:text-white"
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Correct Answer</label>
          <select
            value={correctAnswer}
            onChange={(e) => setCorrectAnswer(e.target.value)}
            className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-900 dark:text-white"
          >
            {['A', 'B', 'C', 'D'].map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Explanation</label>
          <input
            type="text"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-900 dark:text-white"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Add Question
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-calm-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

/* ──────────────────────────── Edit Question Form ──────────────────────────── */

interface EditQuestionFormProps {
  question: ParsedQuestion
  onSaved: () => void
  onCancel: () => void
}

function EditQuestionForm({ question: q, onSaved, onCancel }: EditQuestionFormProps) {
  const [question, setQuestion] = useState(q.question)
  const [options, setOptions] = useState([...q.options])
  const [correctAnswer, setCorrectAnswer] = useState(q.correctAnswer)
  const [explanation, setExplanation] = useState(q.explanation)
  const [submitting, setSubmitting] = useState(false)

  const setOption = (i: number, v: string) => {
    const next = [...options]
    next[i] = v
    setOptions(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch(`/api/super-admin/training/quiz/question/${q.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          options,
          correctAnswer,
          explanation: explanation.trim(),
        }),
      })
      if (res.ok) onSaved()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-3">
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Question</label>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          required
          className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-900 dark:text-white"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map((opt, i) => (
          <div key={i}>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Option {String.fromCharCode(65 + i)}
            </label>
            <input
              type="text"
              value={opt}
              onChange={(e) => setOption(i, e.target.value)}
              required
              className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-900 dark:text-white"
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Correct Answer</label>
          <select
            value={correctAnswer}
            onChange={(e) => setCorrectAnswer(e.target.value)}
            className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-900 dark:text-white"
          >
            {['A', 'B', 'C', 'D'].map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Explanation</label>
          <input
            type="text"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-900 dark:text-white"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-calm-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
