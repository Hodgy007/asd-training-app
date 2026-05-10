'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import {
  Ticket,
  RefreshCw,
  ExternalLink,
  Calendar,
  MapPin,
  AlertCircle,
  CheckCircle,
  XCircle,
  Users,
} from 'lucide-react'

export interface CohortEventbriteEvent {
  id: string
  externalEventId: string
  name: string
  imageUrl: string | null
  startsAt: string
  endsAt: string | null
  venue: string | null
  ticketUrl: string
  priceText: string | null
  capacity: number | null
  soldOut: boolean
  status: 'LIVE' | 'DRAFT' | 'CANCELLED' | 'COMPLETED'
  audience: 'EDUCATION' | 'EMPLOYER'
  purchasable: boolean
  lastSyncedAt: string | null
}

interface SyncResult {
  matched: number
  invited: number
  skipped: number
  unmatchedEmails: string[]
}

interface Props {
  cohortId: string
  event: CohortEventbriteEvent
  onChange: (event: CohortEventbriteEvent) => void
}

const STATUS_STYLES: Record<CohortEventbriteEvent['status'], string> = {
  LIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  DRAFT: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  COMPLETED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
}

export function CohortEventbriteSection({ cohortId, event, onChange }: Props) {
  const [syncing, setSyncing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSync() {
    setSyncing(true)
    setError(null)
    setSyncResult(null)
    try {
      const res = await fetch(
        `/api/super-admin/cohorts/${cohortId}/eventbrite-sync`,
        { method: 'POST' },
      )
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Sync failed.')
        return
      }
      setSyncResult(data.sync)
    } finally {
      setSyncing(false)
    }
  }

  async function patchEventbrite(patch: Partial<{ purchasable: boolean; audience: 'EDUCATION' | 'EMPLOYER' }>) {
    setSaving(true)
    try {
      const res = await fetch(`/api/super-admin/cohorts/${cohortId}/eventbrite`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (res.ok) {
        const data = await res.json()
        onChange(data.eventbriteEvent)
      }
    } finally {
      setSaving(false)
    }
  }

  const startsAt = new Date(event.startsAt)
  const dateStr = startsAt.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const timeStr = startsAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-orange-200 dark:border-orange-900/40 p-6 shadow-sm space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          {event.imageUrl ? (
            <img
              src={event.imageUrl}
              alt=""
              className="w-20 h-20 rounded-xl object-cover flex-shrink-0 bg-slate-100 dark:bg-slate-700"
            />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center flex-shrink-0">
              <Ticket className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-600 dark:text-orange-400">
              Linked to Eventbrite
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
              This cohort auto-enrolls people who book on Eventbrite
            </h2>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {dateStr} · {timeStr}
              </span>
              {event.venue ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {event.venue}
                </span>
              ) : null}
              {event.priceText ? <span className="font-medium">{event.priceText}</span> : null}
            </div>
            <a
              href={event.ticketUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:underline"
            >
              Open on Eventbrite
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
        <span
          className={clsx(
            'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0',
            STATUS_STYLES[event.status],
          )}
        >
          {event.status === 'LIVE' ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
          {event.status}
        </span>
      </div>

      {/* Catalogue toggle */}
      <div className="flex items-start justify-between gap-4 pt-3 border-t border-orange-100 dark:border-orange-900/30">
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Show on public catalogue</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            When on, this workshop appears at <code>/courses</code>. People who book are auto-enrolled into this cohort.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={event.purchasable}
          disabled={saving}
          onClick={() => patchEventbrite({ purchasable: !event.purchasable })}
          className={clsx(
            'relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-60',
            event.purchasable ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600',
          )}
        >
          <span
            className={clsx(
              'inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5',
              event.purchasable ? 'translate-x-5' : 'translate-x-0.5',
            )}
          />
        </button>
      </div>

      {/* Audience picker */}
      <div>
        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Audience filter</p>
        <div className="flex gap-2">
          {(['EDUCATION', 'EMPLOYER'] as const).map((aud) => (
            <button
              key={aud}
              type="button"
              disabled={saving}
              onClick={() => patchEventbrite({ audience: aud })}
              className={clsx(
                'flex-1 px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all',
                event.audience === aud
                  ? 'border-orange-400 bg-orange-50 text-orange-700 dark:border-orange-500 dark:bg-orange-900/30 dark:text-orange-300'
                  : 'border-calm-200 text-slate-500 hover:border-orange-300 dark:border-slate-600 dark:text-slate-400 dark:hover:border-orange-600',
              )}
            >
              {aud === 'EDUCATION' ? 'Education' : 'Employer'}
            </button>
          ))}
        </div>
      </div>

      {/* Sync */}
      <div className="pt-3 border-t border-orange-100 dark:border-orange-900/30">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-emerald-600" />
              Attendee sync
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pulls every Eventbrite booking and enrolls them in this cohort per your email-match policy.
              {event.lastSyncedAt ? (
                <> Last synced {new Date(event.lastSyncedAt).toLocaleString('en-GB')}.</>
              ) : (
                <> Never synced — webhook will keep it live in production.</>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-60 flex items-center gap-1.5"
          >
            <RefreshCw className={clsx('h-3.5 w-3.5', syncing && 'animate-spin')} />
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        </div>

        {syncResult ? (
          <div className="mt-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200">
            <p className="font-medium">
              <CheckCircle className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
              {syncResult.matched} matched · {syncResult.invited} invited · {syncResult.skipped} skipped
            </p>
            {syncResult.unmatchedEmails.length > 0 ? (
              <details className="mt-1">
                <summary className="cursor-pointer">
                  {syncResult.unmatchedEmails.length} unmatched email{syncResult.unmatchedEmails.length === 1 ? '' : 's'}
                </summary>
                <ul className="mt-2 list-disc pl-5 space-y-0.5">
                  {syncResult.unmatchedEmails.slice(0, 50).map((email) => (
                    <li key={email}>{email}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
