'use client'

import { useEffect, useRef } from 'react'
import { X, Sparkles, Loader2, RefreshCw } from 'lucide-react'

interface AiSuggestionModalProps {
  isOpen: boolean
  onClose: () => void
  suggestion: string
  onAccept: () => void
  onRetry: () => void
  loading: boolean
}

export function AiSuggestionModal({
  isOpen,
  onClose,
  suggestion,
  onAccept,
  onRetry,
  loading,
}: AiSuggestionModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus()
    }
  }, [isOpen])

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal card */}
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-label="AI Suggestion"
        className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-calm-200 dark:border-slate-700 w-full max-w-lg max-h-[80vh] flex flex-col outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-calm-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary-500" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100">AI Suggestion</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-calm-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
              <span className="ml-3 text-sm text-slate-500 dark:text-slate-400">Generating suggestion...</span>
            </div>
          ) : (
            <div className="bg-calm-50 dark:bg-slate-700/50 rounded-xl p-4 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {suggestion}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-calm-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="btn-secondary text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onRetry}
            disabled={loading}
            className="btn-secondary inline-flex items-center gap-2 text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <button
            onClick={onAccept}
            disabled={loading || !suggestion}
            className="btn-primary inline-flex items-center gap-2 text-sm"
          >
            Use this
          </button>
        </div>
      </div>
    </div>
  )
}
