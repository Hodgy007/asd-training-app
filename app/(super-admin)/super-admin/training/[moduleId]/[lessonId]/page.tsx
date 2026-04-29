'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
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
  Upload,
  FileText,
  Paperclip,
  Video,
  HelpCircle,
  ClipboardList,
} from 'lucide-react'
import { VideoPlayer } from '@/components/training/video-player'
import { clsx } from 'clsx'
import { InteractiveBlock } from '@/types/interactive'
import { InteractiveBlocksPanel } from '@/components/admin/interactive-builder/interactive-blocks-panel'
import { ScormUpload } from '@/components/admin/scorm-upload'
import { generateBlockPlaceholder, removeBlockPlaceholder, validateInteractiveBlocks, normaliseBlockPlaceholderAlignment } from '@/lib/interactive-blocks'
import { registerResizableImage } from '@/lib/quill-image-format'
import { registerVideoFormat } from '@/lib/quill-video-format'

import dynamic from 'next/dynamic'
import type ReactQuillType from 'react-quill-new'

// Cached Quill constructor after dynamic import; used by the image resize overlay.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let QuillCtor: any = null

const ReactQuill = dynamic(
  async () => {
    const mod = await import('react-quill-new')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Base = mod.default as any
    QuillCtor = Base.Quill
    registerResizableImage(QuillCtor)
    registerVideoFormat(QuillCtor)
    return { default: Base as typeof ReactQuillType }
  },
  { ssr: false }
) as unknown as typeof ReactQuillType

type ImageSize = '25%' | '50%' | '75%' | '100%'
const IMAGE_SIZES: { label: string; value: ImageSize }[] = [
  { label: 'Small', value: '25%' },
  { label: 'Medium', value: '50%' },
  { label: 'Large', value: '75%' },
  { label: 'Full', value: '100%' },
]

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
  attachments: { id: string; fileName: string; fileSize: number; url: string; createdAt: string }[]
  interactiveBlocks?: unknown
  transcript?: string | null
  scormBlobPrefix?: string | null
  scormEntryPath?: string | null
  scormVersion?: string | null
  surveyId?: string | null
  survey?: { id: string; title: string; description: string | null; status: string; closesAt: string | null; _count: { questions: number } } | null
}

interface PublishedSurvey {
  id: string
  title: string
  description: string | null
  closesAt: string | null
  _count: { questions: number }
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

/** 500 MB — video uploads bypass the global 50 MB cap (enforced client-side here) */
const VIDEO_MAX_BYTES = 500 * 1024 * 1024

/* ──────────────────────────── Main Page ──────────────────────────── */

export default function LessonEditorPage() {
  const params = useParams()
  const router = useRouter()
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
  const [editTranscript, setEditTranscript] = useState('')
  const [editSurveyId, setEditSurveyId] = useState('')
  const [publishedSurveys, setPublishedSurveys] = useState<PublishedSurvey[]>([])

  // Quiz state
  const [questions, setQuestions] = useState<ParsedQuestion[]>([])
  const [expandedQ, setExpandedQ] = useState<string | null>(null)
  const [quizVisible, setQuizVisible] = useState(false)

  // Video upload state
  const [videoUploading, setVideoUploading] = useState(false)
  const [videoUploadError, setVideoUploadError] = useState('')

  // Attachment state
  const [attachments, setAttachments] = useState<LessonData['attachments']>([])
  const [uploadingAttachment, setUploadingAttachment] = useState(false)

  // Interactive blocks state
  const [interactiveBlocks, setInteractiveBlocks] = useState<InteractiveBlock[]>([])

  // Quill editor container ref for custom image handler
  const editorContainerRef = useRef<HTMLDivElement>(null)
  // next/dynamic drops refs through to react-quill-new's class instance, so
  // instead we walk the React fiber tree from .ql-container to locate the
  // ReactQuill instance and call its getEditor() method. Caching the result
  // on a ref avoids re-walking on every toolbar click.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quillRef = useRef<any>(null)
  const getQuill = useCallback(() => {
    if (quillRef.current) return quillRef.current
    const container = editorContainerRef.current?.querySelector('.ql-container')
    if (!container) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fiberKey = Object.keys(container as any).find(k => k.startsWith('__reactFiber'))
    if (!fiberKey) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fiber = (container as any)[fiberKey]
    let depth = 0
    while (fiber && depth < 30) {
      if (fiber.stateNode && typeof fiber.stateNode.getEditor === 'function') {
        const editor = fiber.stateNode.getEditor()
        quillRef.current = editor
        return editor
      }
      fiber = fiber.return
      depth++
    }
    return null
  }, [])
  const [uploadingImage, setUploadingImage] = useState(false)

  // Image resize overlay state: the currently-selected image inside the editor
  // and its position on screen (updated on click + scroll).
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null)
  const [imagePos, setImagePos] = useState<{ top: number; left: number; width: number } | null>(null)

  // Read the live Quill DOM into React state. Used before any update that
  // re-renders the editor so we don't clobber typed text that hasn't yet
  // propagated through Quill's onChange.
  const syncQuillFromDom = useCallback(() => {
    const qlEditor = editorContainerRef.current?.querySelector('.ql-editor') as HTMLElement | null
    const liveHtml = qlEditor?.innerHTML
    if (liveHtml != null && liveHtml !== '<p><br></p>') {
      setEditContent(liveHtml)
    }
  }, [])

  const handleBlocksChange = useCallback((next: InteractiveBlock[]) => {
    syncQuillFromDom()
    setInteractiveBlocks(next)
  }, [syncQuillFromDom])

  const imageHandler = useCallback(() => {
    const input = document.createElement('input')
    input.setAttribute('type', 'file')
    input.setAttribute('accept', 'image/*')
    input.click()
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      setUploadingImage(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', 'training-images')
        const res = await fetch('/api/super-admin/training/upload', { method: 'POST', body: formData })
        if (!res.ok) {
          const d = await res.json()
          setToast({ message: d.error || 'Image upload failed', type: 'error' })
          return
        }
        const { url } = await res.json()
        const quill = getQuill()
        if (quill) {
          const range = quill.getSelection(true) ?? { index: quill.getLength(), length: 0 }
          quill.insertEmbed(range.index, 'image', url, 'user')
          quill.setSelection(range.index + 1, 0, 'user')
        } else {
          setEditContent(prev => prev + `<img src="${url}" />`)
        }
      } catch {
        setToast({ message: 'Image upload failed', type: 'error' })
      } finally {
        setUploadingImage(false)
      }
    }
  }, [getQuill])

  const handleVideoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > VIDEO_MAX_BYTES) {
      setVideoUploadError('File too large — maximum 500 MB.')
      e.target.value = ''
      return
    }
    setVideoUploading(true)
    setVideoUploadError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'training-videos')
      formData.append('skipSizeCheck', 'true')
      const res = await fetch('/api/super-admin/training/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Upload failed')
      }
      const { url } = await res.json()
      setEditVideoUrl(url)
      setEditType('VIDEO')
    } catch (err) {
      setVideoUploadError(err instanceof Error ? err.message : 'Upload failed. MP4 or WebM only, max 500 MB.')
    } finally {
      setVideoUploading(false)
      e.target.value = ''
    }
  }, [])

  const quillModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ font: [] }, { size: ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline'],
        [{ header: [2, 3, false] }],
        [{ color: [] }, { background: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ align: '' }, { align: 'center' }, { align: 'right' }, { align: 'justify' }],
        ['link', 'image'],
        ['clean'],
      ],
      handlers: {
        image: imageHandler,
      },
    },
  }), [imageHandler])

  const fetchLesson = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/super-admin/training/lessons/${lessonId}`)
      if (res.ok) {
        const data: LessonData = await res.json()
        setLesson(data)
        setEditTitle(data.title)
        setEditType(data.type)
        setEditContent(normaliseBlockPlaceholderAlignment(data.content || ''))
        setEditVideoUrl(data.videoUrl || '')
        setEditTranscript(data.transcript || '')
        setEditSurveyId(data.surveyId || '')
        const parsed = data.quizQuestions.map(parseQuestion)
        setQuestions(parsed)
        setQuizVisible(parsed.length > 0)
        setAttachments(data.attachments ?? [])
        setInteractiveBlocks(validateInteractiveBlocks(data.interactiveBlocks) ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [lessonId])

  useEffect(() => {
    fetchLesson()
  }, [fetchLesson])

  useEffect(() => {
    fetch('/api/super-admin/training/surveys')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setPublishedSurveys(data)
      })
      .catch(() => {})
  }, [])

  // Attach click listener to the editor so clicking an image shows a size picker.
  // Re-runs when the editor DOM is (re)created: loading -> false.
  useEffect(() => {
    if (loading) return
    const container = editorContainerRef.current
    if (!container) return
    const editor = container.querySelector('.ql-editor') as HTMLElement | null
    if (!editor) return

    const positionFor = (img: HTMLImageElement) => {
      const rect = img.getBoundingClientRect()
      return { top: rect.top + window.scrollY - 44, left: rect.left + window.scrollX, width: rect.width }
    }

    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'IMG' && editor.contains(target)) {
        const img = target as HTMLImageElement
        setSelectedImage(img)
        setImagePos(positionFor(img))
      } else if (!target.closest('[data-image-size-picker]')) {
        setSelectedImage(null)
        setImagePos(null)
      }
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [loading])

  const resizeSelectedImage = useCallback((size: ImageSize) => {
    const img = selectedImage
    if (!img) return
    const qlContainer = editorContainerRef.current?.querySelector('.ql-container') as unknown as
      | { __quill?: { formatText: (i: number, l: number, fmt: Record<string, string>) => void; getIndex: (b: unknown) => number; root: HTMLElement } }
      | null
    const quill = qlContainer?.__quill
    if (!quill || !QuillCtor) {
      // Fallback: direct DOM edit. Width will only persist until Quill rebuilds
      // the content from its delta (e.g. next keystroke). The custom blot and
      // formatText path below is the supported way.
      img.style.width = size
      img.style.height = 'auto'
      img.setAttribute('width', size)
      return
    }
    const blot = QuillCtor.find(img)
    if (!blot) return
    const index = quill.getIndex(blot)
    quill.formatText(index, 1, { width: size, style: `width: ${size}; height: auto;` })
    // Reposition overlay since the image has changed size.
    requestAnimationFrame(() => {
      const rect = img.getBoundingClientRect()
      setImagePos({ top: rect.top + window.scrollY - 44, left: rect.left + window.scrollX, width: rect.width })
    })
  }, [selectedImage])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(t)
    }
  }, [toast])

  const saveLesson = async () => {
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        title: editTitle.trim(),
        type: editType,
        content: editContent,
        interactiveBlocks: interactiveBlocks.length > 0 ? interactiveBlocks : null,
      }
      if (editType === 'VIDEO') {
        body.videoUrl = editVideoUrl.trim()
        body.transcript = editTranscript.trim() || null
      }
      if (editType === 'SURVEY') {
        if (!editSurveyId) {
          setToast({ message: 'Choose a published survey for this lesson', type: 'error' })
          setSaving(false)
          return
        }
        body.surveyId = editSurveyId
      }
      const res = await fetch(`/api/super-admin/training/lessons/${lessonId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setToast({ message: 'Lesson saved', type: 'success' })
        setTimeout(() => router.push(`/super-admin/training/${moduleId}`), 500)
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
    <div className="space-y-8 animate-page-enter">
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
              <option value="SCORM">SCORM package</option>
              <option value="SURVEY">Survey</option>
            </select>
          </div>
        </div>

        {editType === 'SURVEY' && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <ClipboardList className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <label className="block text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1">
                  Linked published survey
                </label>
                <select
                  value={editSurveyId}
                  onChange={(e) => setEditSurveyId(e.target.value)}
                  className="w-full rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
                >
                  <option value="">Choose a survey...</option>
                  {publishedSurveys.map((survey) => (
                    <option key={survey.id} value={survey.id}>
                      {survey.title} ({survey._count.questions} question{survey._count.questions !== 1 ? 's' : ''})
                    </option>
                  ))}
                </select>
                {publishedSurveys.length === 0 && (
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                    No published open surveys found. Create and publish a survey first, then link it here.
                  </p>
                )}
                <p className="text-xs text-amber-800 dark:text-amber-200 mt-2">
                  Learners must submit this survey before the lesson is marked complete and the next lesson unlocks.
                </p>
              </div>
            </div>
          </div>
        )}

        {editType === 'VIDEO' && (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Video</label>

            {/* Paste a URL */}
            <input
              type="url"
              value={editVideoUrl}
              onChange={(e) => { setEditVideoUrl(e.target.value); setVideoUploadError('') }}
              placeholder="Paste a YouTube, Vimeo, or direct video URL…"
              className="w-full rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400"
            />

            {/* Upload to Vercel Blob */}
            <div className="flex items-center gap-3 flex-wrap">
              <label className={clsx(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-calm-200 dark:border-slate-600 text-xs font-medium cursor-pointer hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors',
                videoUploading && 'opacity-50 pointer-events-none'
              )}>
                {videoUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Video className="h-3.5 w-3.5" />}
                {videoUploading ? 'Uploading…' : 'Upload video file (MP4 / WebM, max 500 MB)'}
                <input
                  type="file"
                  accept="video/mp4,video/webm,.mp4,.webm"
                  className="hidden"
                  disabled={videoUploading}
                  onChange={handleVideoUpload}
                />
              </label>
              {editVideoUrl && editVideoUrl.includes('blob.vercel-storage.com') && (
                <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" /> Hosted — works through school firewalls
                </span>
              )}
            </div>

            {videoUploadError && <p className="text-xs text-red-500">{videoUploadError}</p>}

            {/* Live preview */}
            {editVideoUrl && (
              <div className="rounded-xl overflow-hidden border border-calm-200 dark:border-slate-600">
                <VideoPlayer title={editTitle || 'Preview'} videoUrl={editVideoUrl} />
              </div>
            )}
          </div>
        )}

        {editType === 'VIDEO' && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Transcript (optional)</label>
            <textarea
              value={editTranscript}
              onChange={(e) => setEditTranscript(e.target.value)}
              placeholder="Paste video transcript here for accessibility..."
              className="w-full rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 min-h-[80px]"
            />
          </div>
        )}

        {editType === 'SCORM' && (
          <ScormUpload
            lessonId={lesson.id}
            initial={{
              scormBlobPrefix: lesson.scormBlobPrefix ?? null,
              scormEntryPath: lesson.scormEntryPath ?? null,
              scormVersion: lesson.scormVersion ?? null,
            }}
          />
        )}

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Content</label>
          <div ref={editorContainerRef} className="rounded-xl border border-calm-200 dark:border-slate-600 overflow-hidden [&_.ql-toolbar]:border-calm-200 [&_.ql-toolbar]:dark:border-slate-600 [&_.ql-toolbar]:bg-calm-50 [&_.ql-toolbar]:dark:bg-slate-700 [&_.ql-container]:border-0 [&_.ql-editor]:min-h-[200px] [&_.ql-editor]:text-sm [&_.ql-editor]:text-slate-900 [&_.ql-editor]:dark:text-white [&_.ql-editor]:bg-white [&_.ql-editor]:dark:bg-slate-700">
            <ReactQuill
              theme="snow"
              value={editContent}
              onChange={setEditContent}
              modules={quillModules}
            />
          </div>
        </div>

        {uploadingImage && (
          <div className="flex items-center gap-2 text-sm text-purple-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading image...
          </div>
        )}

        {selectedImage && imagePos && (
          <div
            data-image-size-picker
            role="toolbar"
            aria-label="Image size"
            style={{ position: 'absolute', top: imagePos.top, left: imagePos.left }}
            className="flex items-center gap-1 rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg px-1.5 py-1"
          >
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 px-1.5">Size</span>
            {IMAGE_SIZES.map((s) => {
              const current = selectedImage.getAttribute('width') || selectedImage.style.width || '100%'
              const isActive = current === s.value
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => resizeSelectedImage(s.value)}
                  className={clsx(
                    'text-xs font-medium px-2 py-1 rounded transition-colors',
                    isActive
                      ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700'
                  )}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        )}

        {/* ─── Attachments (PDF) ─── */}
        <div className="border-t border-calm-200 dark:border-slate-600 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              PDF Attachments
            </h3>
            <label className={clsx(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-calm-200 dark:border-slate-600 text-xs font-medium cursor-pointer hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors',
              uploadingAttachment && 'opacity-50 pointer-events-none'
            )}>
              {uploadingAttachment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Upload PDF
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                disabled={uploadingAttachment}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setUploadingAttachment(true)
                  try {
                    const formData = new FormData()
                    formData.append('file', file)
                    const res = await fetch(`/api/super-admin/training/lessons/${lessonId}/attachments`, {
                      method: 'POST',
                      body: formData,
                    })
                    if (res.ok) {
                      const att = await res.json()
                      setAttachments((prev) => [...prev, att])
                      setToast({ message: 'PDF attached', type: 'success' })
                    } else {
                      const d = await res.json()
                      setToast({ message: d.error || 'Upload failed', type: 'error' })
                    }
                  } catch {
                    setToast({ message: 'Upload failed', type: 'error' })
                  } finally {
                    setUploadingAttachment(false)
                    e.target.value = ''
                  }
                }}
              />
            </label>
          </div>

          {attachments.length === 0 ? (
            <p className="text-xs text-slate-400">No PDFs attached. Learners will see download links for any files you add here.</p>
          ) : (
            <div className="space-y-2">
              {attachments.map((att) => (
                <div key={att.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 bg-calm-50 dark:bg-slate-700">
                  <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate hover:underline">
                    {att.fileName}
                  </a>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {att.fileSize < 1024 * 1024
                      ? `${Math.round(att.fileSize / 1024)} KB`
                      : `${(att.fileSize / (1024 * 1024)).toFixed(1)} MB`}
                  </span>
                  <button
                    type="button"
                    className="ml-auto p-1 text-slate-400 hover:text-red-500 transition-colors"
                    title="Remove attachment"
                    onClick={async () => {
                      if (!confirm(`Remove "${att.fileName}"?`)) return
                      try {
                        const res = await fetch(`/api/super-admin/training/lessons/${lessonId}/attachments/${att.id}`, { method: 'DELETE' })
                        if (res.ok) {
                          setAttachments((prev) => prev.filter((a) => a.id !== att.id))
                          setToast({ message: 'Attachment removed', type: 'success' })
                        }
                      } catch {
                        setToast({ message: 'Failed to remove', type: 'error' })
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Interactive Blocks ─── */}
        <InteractiveBlocksPanel
          blocks={interactiveBlocks}
          onChange={handleBlocksChange}
          onInsertPlaceholder={(blockId, title) => {
            const placeholder = generateBlockPlaceholder(blockId, title)
            const qlEditor = editorContainerRef.current?.querySelector('.ql-editor') as HTMLElement | null
            const liveHtml = qlEditor?.innerHTML
            setEditContent(prev => {
              const base = liveHtml && liveHtml !== '<p><br></p>' ? liveHtml : prev
              return base + placeholder
            })
          }}
          onRemovePlaceholder={(blockId) => {
            const qlEditor = editorContainerRef.current?.querySelector('.ql-editor') as HTMLElement | null
            const liveHtml = qlEditor?.innerHTML
            setEditContent(prev => {
              const base = liveHtml && liveHtml !== '<p><br></p>' ? liveHtml : prev
              return removeBlockPlaceholder(base, blockId)
            })
          }}
        />

        <div className="flex items-center gap-3">
          <button
            onClick={saveLesson}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Lesson
          </button>
          <Link
            href="/super-admin/training"
            className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium"
          >
            Back to Training Content
          </Link>
        </div>
      </div>

      {/* ─── Section 2: Quiz Management (opt-in) ─── */}
      {quizVisible ? (
        <QuizSection
          lessonId={lessonId}
          questions={questions}
          setQuestions={setQuestions}
          expandedQ={expandedQ}
          setExpandedQ={setExpandedQ}
          lessonContent={editContent}
          setToast={setToast}
          refetch={fetchLesson}
          onHide={() => setQuizVisible(false)}
        />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-calm-200 dark:border-slate-700 p-6 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <HelpCircle className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Knowledge Quiz</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Optional. Add a quiz to check learners&apos; understanding.</p>
            </div>
          </div>
          <button
            onClick={() => setQuizVisible(true)}
            className="inline-flex items-center gap-2 border border-calm-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Quiz
          </button>
        </div>
      )}
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
  onHide: () => void
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
  onHide,
}: QuizSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [aiCount, setAiCount] = useState(5)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiPreview, setAiPreview] = useState<GeneratedQuestion[] | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [removingQuiz, setRemovingQuiz] = useState(false)

  const removeQuiz = async () => {
    if (questions.length === 0) {
      onHide()
      return
    }
    const ok = window.confirm(
      `Remove this quiz? This will permanently delete ${questions.length} question${questions.length !== 1 ? 's' : ''}.`
    )
    if (!ok) return
    setRemovingQuiz(true)
    try {
      const res = await fetch(`/api/super-admin/training/quiz/${lessonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: [] }),
      })
      if (res.ok) {
        setToast({ message: 'Quiz removed', type: 'success' })
        await refetch()
        onHide()
      } else {
        setToast({ message: 'Failed to remove quiz', type: 'error' })
      }
    } catch {
      setToast({ message: 'Network error removing quiz', type: 'error' })
    } finally {
      setRemovingQuiz(false)
    }
  }

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
          <button
            onClick={removeQuiz}
            disabled={removingQuiz}
            className="inline-flex items-center gap-2 border border-red-200 dark:border-red-900/60 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            title={questions.length > 0 ? 'Remove quiz (deletes all questions)' : 'Remove quiz section'}
            aria-label="Remove quiz"
          >
            {removingQuiz ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Remove Quiz
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
