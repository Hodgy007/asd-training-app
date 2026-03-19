'use client'

import { useState } from 'react'
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { format } from 'date-fns'
import { DOMAIN_LABELS, FREQUENCY_LABELS, CONTEXT_LABELS } from '@/lib/constants'
import { clsx } from 'clsx'
import type { Observation } from '@/types'

interface ObservationTableProps {
  observations: Observation[]
  childId: string
  onDeleted: () => void
}

const DOMAIN_BADGE: Record<string, string> = {
  SOCIAL_COMMUNICATION: 'badge-social',
  BEHAVIOUR_AND_PLAY: 'badge-behaviour',
  SENSORY_RESPONSES: 'badge-sensory',
}

const FREQ_COLOUR: Record<string, string> = {
  RARE: 'text-slate-400',
  SOMETIMES: 'text-warm-500',
  OFTEN: 'text-red-500',
}

export function ObservationTable({ observations, childId, onDeleted }: ObservationTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Delete this observation? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await fetch(`/api/children/${childId}/observations/${id}`, { method: 'DELETE' })
      onDeleted()
    } finally {
      setDeletingId(null)
    }
  }

  if (observations.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400">
        <p>No observations recorded yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {observations.map((obs) => {
        const isExpanded = expanded === obs.id
        return (
          <div
            key={obs.id}
            className={clsx(
              'border rounded-xl overflow-hidden transition-all',
              isExpanded ? 'border-primary-200 shadow-sm' : 'border-calm-200'
            )}
          >
            <div
              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-calm-50 transition-colors"
              onClick={() => setExpanded(isExpanded ? null : obs.id)}
            >
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  obs.domain === 'SOCIAL_COMMUNICATION'
                    ? 'bg-primary-500'
                    : obs.domain === 'BEHAVIOUR_AND_PLAY'
                      ? 'bg-sage-500'
                      : 'bg-warm-400'
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-900 truncate">
                    {obs.behaviourType}
                  </span>
                  <span className={clsx(DOMAIN_BADGE[obs.domain], 'flex-shrink-0')}>
                    {DOMAIN_LABELS[obs.domain]}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-400">
                    {format(new Date(obs.date), 'dd MMM yyyy')}
                  </span>
                  <span className="text-slate-200">·</span>
                  <span className={clsx('text-xs font-medium', FREQ_COLOUR[obs.frequency])}>
                    {FREQUENCY_LABELS[obs.frequency]}
                  </span>
                  <span className="text-slate-200">·</span>
                  <span className="text-xs text-slate-400">{CONTEXT_LABELS[obs.context]}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(obs.id)
                  }}
                  disabled={deletingId === obs.id}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Delete observation"
                >
                  {deletingId === obs.id ? (
                    <span className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin block" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-slate-300" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-300" />
                )}
              </div>
            </div>
            {isExpanded && obs.notes && (
              <div className="px-4 pb-3 bg-calm-50 border-t border-calm-100">
                <p className="text-sm text-slate-600 pt-3">
                  <strong className="text-slate-700">Notes:</strong> {obs.notes}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
