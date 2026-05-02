'use client'

import { useEffect, useState } from 'react'
import { Loader2, Sparkles, X, RefreshCcw, Check } from 'lucide-react'

interface GenerateBannerModalProps {
  open: boolean
  /** When provided + non-empty, modal opens with this prompt and skips suggest. */
  initialPrompt?: string | null
  aspectRatio: '3:1' | '4:1'
  onClose: () => void
  onUse: (result: { url: string; prompt: string }) => void
}

type Status = 'suggesting' | 'editing' | 'generating' | 'preview' | 'error'

export function GenerateBannerModal({
  open,
  initialPrompt,
  aspectRatio,
  onClose,
  onUse,
}: GenerateBannerModalProps) {
  const [status, setStatus] = useState<Status>('suggesting')
  const [prompt, setPrompt] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!open) return
    setPreviewUrl(null)
    setErrorMessage('')
    if (initialPrompt && initialPrompt.trim()) {
      setPrompt(initialPrompt)
      setStatus('editing')
      return
    }
    let cancelled = false
    setStatus('suggesting')
    setPrompt('')
    fetch('/api/super-admin/home/hero-image/suggest-prompt', { method: 'POST' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setPrompt(data.prompt ?? '')
        setStatus('editing')
      })
      .catch(() => {
        if (cancelled) return
        setStatus('editing')
      })
    return () => {
      cancelled = true
    }
  }, [open, initialPrompt])

  if (!open) return null

  async function generate() {
    if (!prompt.trim() || prompt.length > 500) {
      setErrorMessage('Prompt must be 1–500 characters.')
      return
    }
    setStatus('generating')
    setErrorMessage('')
    try {
      const res = await fetch('/api/super-admin/home/hero-image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, aspectRatio }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        if (res.status === 429) {
          setErrorMessage(
            typeof data?.error === 'string'
              ? data.error
              : 'Too many requests. Please wait a few minutes before trying again.',
          )
        } else if (data?.error === 'gateway_unavailable') {
          setErrorMessage('Banner generation is temporarily unavailable. Try again in a few minutes.')
        } else {
          setErrorMessage('Something went wrong. Try again.')
        }
        return
      }
      setPreviewUrl(data.url)
      setStatus('preview')
    } catch {
      setStatus('error')
      setErrorMessage('Something went wrong. Try again.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Generate banner</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {status === 'suggesting' ? (
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Thinking up a prompt for you…
            </div>
          ) : null}

          {(status === 'editing' || status === 'generating' || status === 'error') && (
            <>
              <label htmlFor="banner-prompt" className="block text-sm font-bold text-slate-900 dark:text-slate-100">
                Banner prompt
              </label>
              <textarea
                id="banner-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                maxLength={500}
                placeholder="Describe the banner you want — colors, shapes, mood. No people, no text."
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <div className="text-xs text-slate-500 dark:text-slate-500 text-right">
                {prompt.length}/500
              </div>
              {errorMessage ? (
                <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
              ) : null}
              <button
                type="button"
                onClick={generate}
                disabled={status === 'generating' || !prompt.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white font-bold hover:bg-primary-600 disabled:opacity-50"
              >
                {status === 'generating' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {status === 'generating'
                  ? 'Generating banner — this can take up to 30 seconds…'
                  : 'Generate banner'}
              </button>
            </>
          )}

          {status === 'preview' && previewUrl ? (
            <>
              <div className="relative w-full aspect-[3/1] overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Banner preview" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onUse({ url: previewUrl, prompt })}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700"
                >
                  <Check className="h-4 w-4" /> Use this banner
                </button>
                <button
                  type="button"
                  onClick={generate}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <RefreshCcw className="h-4 w-4" /> Try again
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
