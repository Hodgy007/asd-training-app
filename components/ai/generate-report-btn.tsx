'use client'

import { useState } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'

interface GenerateReportBtnProps {
  childId: string
  hasObservations: boolean
  onGenerated: () => void
}

export function GenerateReportBtn({ childId, hasObservations, onGenerated }: GenerateReportBtnProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleGenerate() {
    if (!hasObservations) return
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`/api/children/${childId}/insights`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to generate insights.')
      } else {
        onGenerated()
      }
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleGenerate}
        disabled={loading || !hasObservations}
        className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        title={!hasObservations ? 'Add observations first' : undefined}
      >
        {loading ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Generate AI insights
          </>
        )}
      </button>
      {!hasObservations && (
        <p className="text-xs text-slate-400">Log observations first to generate insights.</p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
