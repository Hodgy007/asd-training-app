'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { getBufferedLogs } from '@/lib/client-log-buffer'

type FeedbackType = 'BUG' | 'SUGGESTION' | 'QUESTION' | 'OTHER'

const TYPES: { value: FeedbackType; label: string }[] = [
  { value: 'BUG', label: 'Bug' },
  { value: 'SUGGESTION', label: 'Suggestion' },
  { value: 'QUESTION', label: 'Question' },
  { value: 'OTHER', label: 'Other' },
]

interface FeedbackModalProps {
  open: boolean
  onClose: () => void
}

export function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const [type, setType] = useState<FeedbackType>('BUG')
  const [message, setMessage] = useState('')
  const [showContext, setShowContext] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submittedToast, setSubmittedToast] = useState(false)

  if (!open) return null

  function reset() {
    setType('BUG')
    setMessage('')
    setShowContext(false)
    setError(null)
    setSubmitting(false)
  }

  async function handleSubmit() {
    setError(null)
    if (message.trim().length < 10) {
      setError('Please give us a few more words — 10 characters minimum.')
      return
    }
    setSubmitting(true)
    try {
      const logs = getBufferedLogs()
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type,
          message: message.trim(),
          url: window.location.href,
          userAgent: navigator.userAgent,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          clientLogs: logs,
        }),
      })
      if (!res.ok) {
        if (res.status === 429) {
          setError('You have sent feedback recently. Please wait a few minutes.')
        } else if (res.status === 401) {
          setError('You are no longer signed in. Please refresh and try again.')
        } else {
          setError('Something went wrong sending your feedback. Please try again.')
        }
        setSubmitting(false)
        return
      }
      setSubmittedToast(true)
      setTimeout(() => {
        setSubmittedToast(false)
        reset()
        onClose()
      }, 1500)
    } catch {
      setError('Network error — please try again.')
      setSubmitting(false)
    }
  }

  const previewLogs = getBufferedLogs()

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Send feedback</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {submittedToast ? (
          <p className="text-emerald-700 dark:text-emerald-300 font-medium py-8 text-center">
            Thanks — we got it.
          </p>
        ) : (
          <>
            <fieldset className="mb-4">
              <legend className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Type</legend>
              <div className="flex flex-wrap gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    aria-pressed={type === t.value}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
                      type === t.value
                        ? 'bg-primary-500 border-primary-500 text-white'
                        : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="block mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor="fb-msg">
              What&apos;s on your mind?
            </label>
            <textarea
              id="fb-msg"
              rows={5}
              maxLength={5000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Describe what happened, what you expected, or your suggestion..."
            />
            <div className="text-right text-xs text-slate-500 dark:text-slate-400 mb-3">{message.length}/5000</div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              We&apos;ll also include the page URL, your browser, and recent error logs to help us fix it.{' '}
              <button
                type="button"
                onClick={() => setShowContext((v) => !v)}
                className="underline text-primary-600 dark:text-primary-400"
              >
                {showContext ? 'Hide' : 'Show'} what we&apos;re sending
              </button>
            </p>

            {showContext && (
              <pre className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 max-h-48 overflow-auto mb-3">
                {`URL: ${typeof window !== 'undefined' ? window.location.href : ''}
Viewport: ${typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : ''}
User agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : ''}

Recent logs (${previewLogs.length}):
${previewLogs.map((l) => `[${new Date(l.ts).toISOString().slice(11, 19)}] ${l.level} ${l.message}`).join('\n')}`}
              </pre>
            )}

            {error && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400 mb-3">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50"
              >
                {submitting ? 'Sending...' : 'Send'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
