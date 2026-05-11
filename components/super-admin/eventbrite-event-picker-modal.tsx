'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Ticket,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Settings as SettingsIcon,
  X,
} from 'lucide-react'
import { clsx } from 'clsx'

interface EventbriteEventRow {
  id: string
  name: string
  startsAt: string
  endsAt: string | null
  venue: string | null
  ticketUrl: string
  imageUrl: string | null
  priceText: string | null
  capacity: number | null
  soldOut: boolean
  status: 'LIVE' | 'DRAFT' | 'CANCELLED' | 'COMPLETED'
  alreadyLinked: boolean
  existingCohortId: string | null
}

interface ImportResult {
  eventId: string
  cohortId?: string
  created?: boolean
  error?: string
}

interface ImportResponse {
  results: ImportResult[]
  summary: { created: number; skipped: number; failed: number }
}

interface Props {
  open: boolean
  onClose: () => void
  /**
   * Called when the import succeeds. `cohortId` is set when exactly one new
   * cohort was created — the parent should navigate to it. Otherwise, the
   * parent should refetch and show a summary toast.
   */
  onImported: (summary: { created: number; skipped: number; failed: number; firstCohortId: string | null }) => void
}

type Phase =
  | { kind: 'loading' }
  | { kind: 'not_configured' }
  | { kind: 'error'; message: string }
  | { kind: 'loaded'; events: EventbriteEventRow[] }

export function EventbriteEventPickerModal({ open, onClose, onImported }: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [purchasable, setPurchasable] = useState(true)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [showUrlFallback, setShowUrlFallback] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setPhase({ kind: 'loading' })
    setSelected(new Set())
    setSearch('')
    setImportError(null)
    setShowUrlFallback(false)
    setUrlInput('')
    setUrlError(null)
    setPurchasable(true)

    fetch('/api/super-admin/eventbrite/events')
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (res.status === 503 && data.error === 'eventbrite_not_configured') {
          setPhase({ kind: 'not_configured' })
          return
        }
        if (!res.ok) {
          setPhase({ kind: 'error', message: data.error || 'Could not load Eventbrite events.' })
          return
        }
        setPhase({ kind: 'loaded', events: (data.events ?? []) as EventbriteEventRow[] })
      })
      .catch(() =>
        setPhase({ kind: 'error', message: 'Network error reaching the platform.' }),
      )
  }, [open])

  const filtered = useMemo(() => {
    if (phase.kind !== 'loaded') return []
    const q = search.trim().toLowerCase()
    if (!q) return phase.events
    return phase.events.filter((e) => e.name.toLowerCase().includes(q))
  }, [phase, search])

  const selectableCount = useMemo(() => {
    if (phase.kind !== 'loaded') return 0
    return phase.events.filter((e) => !e.alreadyLinked).length
  }, [phase])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleImportBulk() {
    if (selected.size === 0) return
    setImporting(true)
    setImportError(null)
    try {
      const res = await fetch('/api/super-admin/cohorts/from-eventbrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventIds: Array.from(selected),
          purchasable,
        }),
      })
      const data: ImportResponse | { error: string } = await res.json()
      if (!res.ok || !('summary' in data)) {
        setImportError(('error' in data && data.error) || 'Could not import events.')
        return
      }
      const firstCreated = data.results.find((r) => r.created === true && r.cohortId)
      onImported({
        ...data.summary,
        firstCohortId: firstCreated?.cohortId ?? null,
      })
    } catch {
      setImportError('Network error. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  async function handleImportUrl() {
    if (!urlInput.trim()) return
    setImporting(true)
    setUrlError(null)
    try {
      const res = await fetch('/api/super-admin/cohorts/from-eventbrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urlOrId: urlInput.trim(), purchasable }),
      })
      const data = await res.json()
      if (res.status === 409 && data.cohortId) {
        onImported({ created: 0, skipped: 1, failed: 0, firstCohortId: data.cohortId })
        return
      }
      if (!res.ok) {
        setUrlError(data.error || 'Could not import event.')
        return
      }
      onImported({ created: 1, skipped: 0, failed: 0, firstCohortId: data.cohortId })
    } catch {
      setUrlError('Network error. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="eventbrite-picker-title"
      onClick={() => !importing && onClose()}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white dark:bg-slate-800 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 pb-4 border-b border-calm-200 dark:border-slate-700">
          <div>
            <h2
              id="eventbrite-picker-title"
              className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"
            >
              <Ticket className="h-5 w-5 text-orange-600" />
              Import cohorts from Eventbrite
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Pick the events you want to import — each becomes a cohort that auto-enrolls
              everyone who books on Eventbrite.
            </p>
          </div>
          <button
            type="button"
            onClick={() => !importing && onClose()}
            disabled={importing}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {phase.kind === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
              <RefreshCw className="h-6 w-6 animate-spin mb-3" />
              <p className="text-sm">Loading your Eventbrite events…</p>
            </div>
          )}

          {phase.kind === 'not_configured' && (
            <div className="rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-900/40 p-6 text-center">
              <SettingsIcon className="h-8 w-8 text-orange-600 dark:text-orange-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Eventbrite isn&apos;t set up yet
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Paste your Eventbrite Private Token in settings first, then come back here
                to pick events.
              </p>
              <Link
                href="/super-admin/settings/eventbrite"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold shadow-sm transition-colors"
              >
                Open Eventbrite settings
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          {phase.kind === 'error' && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{phase.message}</span>
            </div>
          )}

          {phase.kind === 'loaded' && phase.events.length === 0 && (
            <div className="rounded-xl border border-dashed border-calm-200 dark:border-slate-700 p-8 text-center">
              <Ticket className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No upcoming events on your Eventbrite account
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Publish an event on Eventbrite first, or paste a URL below for an event
                on a different account.
              </p>
            </div>
          )}

          {phase.kind === 'loaded' && phase.events.length > 0 && (
            <>
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search events…"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>

              {/* Event list */}
              <div className="space-y-2">
                {filtered.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">
                    No events match &ldquo;{search}&rdquo;.
                  </p>
                ) : (
                  filtered.map((event) => (
                    <EventRow
                      key={event.id}
                      event={event}
                      selected={selected.has(event.id)}
                      disabled={importing}
                      onToggle={() => toggle(event.id)}
                    />
                  ))
                )}
              </div>

              {/* URL fallback disclosure */}
              <div className="mt-6 pt-4 border-t border-calm-200 dark:border-slate-700">
                {showUrlFallback ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        Paste an Eventbrite URL (different account)
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowUrlFallback(false)}
                        className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      >
                        Hide
                      </button>
                    </div>
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      disabled={importing}
                      placeholder="https://www.eventbrite.co.uk/e/...-tickets-1014447087547"
                      className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                    {urlError && (
                      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-xs text-red-700 dark:text-red-300">
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                        <span>{urlError}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleImportUrl}
                      disabled={importing || !urlInput.trim()}
                      className="w-full px-4 py-2 rounded-xl bg-slate-600 hover:bg-slate-700 disabled:opacity-60 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      {importing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                      Import from URL
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowUrlFallback(true)}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
                  >
                    Or paste a URL for an event on a different account
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer — sticky */}
        {phase.kind === 'loaded' && phase.events.length > 0 && (
          <div className="border-t border-calm-200 dark:border-slate-700 p-6 space-y-3">
            {importError && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}
            <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={purchasable}
                onChange={(e) => setPurchasable(e.target.checked)}
                disabled={importing}
                className="mt-0.5 h-4 w-4 rounded border-calm-300 dark:border-slate-600 text-orange-600 focus:ring-orange-500"
              />
              <span>
                <strong>Show on catalogue immediately</strong> — workshops appear on the
                public <code>/courses</code> page right away. (You can toggle this later
                on each cohort&apos;s detail page.)
              </span>
            </label>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selected.size} of {selectableCount} selected
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={importing}
                  className="px-4 py-2 rounded-xl border border-calm-200 dark:border-slate-600 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportBulk}
                  disabled={importing || selected.size === 0}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                >
                  {importing ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Ticket className="h-3.5 w-3.5" />
                  )}
                  {importing
                    ? 'Importing…'
                    : `Import ${selected.size || ''} event${selected.size === 1 ? '' : 's'}`.trim()}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function EventRow({
  event,
  selected,
  disabled,
  onToggle,
}: {
  event: EventbriteEventRow
  selected: boolean
  disabled: boolean
  onToggle: () => void
}) {
  const startsAt = new Date(event.startsAt)
  const dateStr = startsAt.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const timeStr = startsAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const inputId = `event-${event.id}`

  const isDisabled = disabled || event.alreadyLinked

  return (
    <label
      htmlFor={inputId}
      className={clsx(
        'flex items-start gap-3 rounded-xl border p-3 transition-all',
        event.alreadyLinked
          ? 'border-calm-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 opacity-70'
          : selected
            ? 'border-orange-400 bg-orange-50 dark:border-orange-500 dark:bg-orange-900/20 cursor-pointer'
            : 'border-calm-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-600 cursor-pointer',
      )}
    >
      <input
        id={inputId}
        type="checkbox"
        checked={selected}
        disabled={isDisabled}
        onChange={onToggle}
        className="mt-1 h-4 w-4 rounded border-calm-300 dark:border-slate-600 text-orange-600 focus:ring-orange-500 flex-shrink-0 disabled:cursor-not-allowed"
      />
      {event.imageUrl ? (
        <img
          src={event.imageUrl}
          alt=""
          className="w-14 h-14 rounded-lg object-cover flex-shrink-0 bg-slate-100 dark:bg-slate-700"
        />
      ) : (
        <div className="w-14 h-14 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center flex-shrink-0">
          <Ticket className="h-5 w-5 text-orange-600 dark:text-orange-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
            {event.name}
          </p>
          {event.alreadyLinked && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 flex-shrink-0">
              <CheckCircle className="h-3 w-3" />
              Already imported
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {dateStr} · {timeStr}
          {event.venue ? ` · ${event.venue}` : ''}
          {event.priceText ? ` · ${event.priceText}` : ''}
        </p>
        {event.alreadyLinked && event.existingCohortId && (
          <Link
            href={`/super-admin/cohorts/${event.existingCohortId}`}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:underline"
          >
            View cohort
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
    </label>
  )
}
