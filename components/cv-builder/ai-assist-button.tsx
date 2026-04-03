'use client'

import { Sparkles, Loader2 } from 'lucide-react'

interface AiAssistButtonProps {
  onClick: () => void
  loading: boolean
  label?: string
}

export function AiAssistButton({ onClick, loading, label = 'Help me write this' }: AiAssistButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="btn-secondary inline-flex items-center gap-2 text-sm"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4 text-primary-500" />
      )}
      {loading ? 'Thinking...' : label}
    </button>
  )
}
