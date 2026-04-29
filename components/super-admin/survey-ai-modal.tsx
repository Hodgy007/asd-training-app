'use client'

import { useState } from 'react'
import { X, Loader2, Sparkles, Upload, FileText } from 'lucide-react'
import { clsx } from 'clsx'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'topic' | 'files'

interface GeneratedQuestion {
  type: string
  question: string
  options?: string[]
  required: boolean
  order: number
}

interface GeneratedSurvey {
  title: string
  description: string
  questions: GeneratedQuestion[]
}

interface SurveyAiModalProps {
  isOpen: boolean
  onClose: () => void
  onGenerated: (survey: GeneratedSurvey) => void
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function SurveyAiModal({ isOpen, onClose, onGenerated }: SurveyAiModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('topic')

  // Topic tab state
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('')

  // Files tab state
  const [files, setFiles] = useState<File[]>([])

  // Shared state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── Reset ──────────────────────────────────────────────────────────────────

  const reset = () => {
    setActiveTab('topic')
    setTopic('')
    setAudience('')
    setFiles([])
    setLoading(false)
    setError(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  // ─── Generate from Topic ────────────────────────────────────────────────────

  const generateFromTopic = async () => {
    if (!topic.trim()) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/super-admin/surveys/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), audience: audience.trim() || undefined }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Generation failed' }))
        throw new Error(err.error ?? 'Failed to generate survey')
      }

      const data: GeneratedSurvey = await res.json()
      onGenerated(data)
      handleClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  // ─── Generate from Files ────────────────────────────────────────────────────

  const generateFromFiles = async () => {
    if (files.length === 0) return
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      for (const file of files) {
        formData.append('files', file)
      }

      const res = await fetch('/api/super-admin/surveys/generate-ai-from-files', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Generation failed' }))
        throw new Error(err.error ?? 'Failed to generate survey from files')
      }

      const data: GeneratedSurvey = await res.json()
      onGenerated(data)
      handleClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  // ─── File Selection ─────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  if (!isOpen) return null

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="survey-ai-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30">
            <Sparkles className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
          <h2
            id="survey-ai-modal-title"
            className="flex-1 text-base font-semibold text-slate-800 dark:text-slate-100"
          >
            Generate Survey with AI
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
        <div className="px-6 py-5 space-y-4">
          {/* Tab toggle */}
          <div className="flex rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => { setActiveTab('topic'); setError(null) }}
              className={clsx(
                'flex-1 px-4 py-2 text-sm font-medium transition-colors',
                activeTab === 'topic'
                  ? 'bg-primary-500 text-white'
                  : 'bg-calm-100 text-slate-600 hover:text-slate-800 dark:bg-slate-700 dark:text-slate-300 dark:hover:text-slate-100'
              )}
            >
              From Topic
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('files'); setError(null) }}
              className={clsx(
                'flex-1 px-4 py-2 text-sm font-medium transition-colors',
                activeTab === 'files'
                  ? 'bg-primary-500 text-white'
                  : 'bg-calm-100 text-slate-600 hover:text-slate-800 dark:bg-slate-700 dark:text-slate-300 dark:hover:text-slate-100'
              )}
            >
              From Files
            </button>
          </div>

          {/* Topic tab */}
          {activeTab === 'topic' && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="survey-topic"
                  className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  Topic <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="survey-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 placeholder:text-slate-400"
                  placeholder="e.g. Staff satisfaction with ASD training materials and delivery methods"
                />
              </div>

              <div>
                <label
                  htmlFor="survey-audience"
                  className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  Target audience <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  id="survey-audience"
                  type="text"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 placeholder:text-slate-400"
                  placeholder="e.g. Caregivers and practitioners"
                />
              </div>
            </div>
          )}

          {/* Files tab */}
          {activeTab === 'files' && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="survey-files"
                  className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  Upload files
                </label>
                <label
                  htmlFor="survey-files"
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500 hover:border-primary-400 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-400 dark:hover:border-primary-500 dark:hover:bg-slate-700 transition-colors"
                >
                  <Upload className="h-6 w-6" />
                  <span>Click to select files</span>
                  <span className="text-xs text-slate-400">.pdf, .docx, .pptx</span>
                </label>
                <input
                  id="survey-files"
                  type="file"
                  accept=".pdf,.docx,.pptx"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* File list */}
              {files.length > 0 && (
                <ul className="space-y-2">
                  {files.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-700/50"
                    >
                      <FileText className="h-4 w-4 flex-shrink-0 text-slate-400" />
                      <span className="flex-1 truncate text-sm text-slate-700 dark:text-slate-200">
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="rounded p-0.5 text-slate-400 hover:text-red-500 transition-colors"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={activeTab === 'topic' ? generateFromTopic : generateFromFiles}
            disabled={loading || (activeTab === 'topic' ? !topic.trim() : files.length === 0)}
            className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Survey
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
