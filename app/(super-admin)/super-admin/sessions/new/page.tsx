'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  Users as UsersIcon,
} from 'lucide-react'
import { clsx } from 'clsx'
import {
  SessionAttendeePicker,
  AttendeePickerConfig,
} from '@/components/super-admin/session-attendee-picker'

interface MeetingConfig {
  platform: string
  configured: boolean
}

const DEFAULT_ATTENDEE_CONFIG: AttendeePickerConfig = {
  allOrgs: false,
  selectedOrgIds: [],
  cohortIds: [],
  userIds: [],
  includeCharityStaff: false,
}

function canManageSessions(session: ReturnType<typeof useSession>['data']): boolean {
  if (!session?.user?.role) return false
  if (session.user.role === 'SUPER_ADMIN') return true
  if (session.user.role === 'CHARITY_EMPLOYEE') {
    const perms = (session.user as { charityPermissions?: string[] }).charityPermissions ?? []
    return perms.includes('manage_sessions')
  }
  return false
}

export default function CreateCharitySessionPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const cohortIdParam = searchParams?.get('cohortId') ?? null

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [duration, setDuration] = useState(60)
  const [platform, setPlatform] = useState<'ZOOM' | 'TEAMS' | 'CUSTOM' | 'IN_PERSON'>('ZOOM')
  const [meetingUrl, setMeetingUrl] = useState('')
  const [meetingConfig, setMeetingConfig] = useState<MeetingConfig | null>(null)

  const [attendeeConfig, setAttendeeConfig] = useState<AttendeePickerConfig>(() => {
    if (cohortIdParam) {
      return { ...DEFAULT_ATTENDEE_CONFIG, cohortIds: [cohortIdParam] }
    }
    return DEFAULT_ATTENDEE_CONFIG
  })

  const [cohortName, setCohortName] = useState<string | null>(null)
  const [cohortBannerDismissed, setCohortBannerDismissed] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  // Look up the cohort name for the pre-fill banner. If the id doesn't match
  // any active cohort, scrub it from the picker so submission isn't silently
  // carrying a phantom selection.
  useEffect(() => {
    if (!cohortIdParam || status !== 'authenticated') return
    let cancelled = false

    fetch(`/api/super-admin/cohorts?status=ACTIVE`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { id: string; name: string }[]) => {
        if (cancelled) return
        const match = data.find((c) => c.id === cohortIdParam)
        if (match) {
          setCohortName(match.name)
        } else {
          setCohortName(null)
          setAttendeeConfig((prev) => ({
            ...prev,
            cohortIds: prev.cohortIds.filter((id) => id !== cohortIdParam),
          }))
        }
      })
      .catch(() => {
        if (!cancelled) setCohortName(null)
      })

    return () => {
      cancelled = true
    }
  }, [cohortIdParam, status])

  // If the user removes the cohort from the picker, drop the banner.
  const cohortStillSelected = cohortIdParam !== null && attendeeConfig.cohortIds.includes(cohortIdParam)
  const showCohortBanner =
    cohortIdParam !== null && cohortName !== null && cohortStillSelected && !cohortBannerDismissed

  // Fetch meeting config on mount
  useEffect(() => {
    if (status !== 'authenticated') return

    fetch('/api/super-admin/settings/meetings')
      .then((r) => {
        if (!r.ok) return null
        return r.json()
      })
      .then((data) => {
        if (data) setMeetingConfig(data)
      })
      .catch(() => {
        // ignore — meeting config is optional
      })
  }, [status])

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !scheduledAt) return

    setSubmitting(true)
    try {
      const attendeePayload = {
        allOrgs: attendeeConfig.allOrgs,
        organisationIds: attendeeConfig.selectedOrgIds,
        cohortIds: attendeeConfig.cohortIds,
        userIds: attendeeConfig.userIds,
        includeCharityStaff: attendeeConfig.includeCharityStaff,
      }

      const res = await fetch('/api/super-admin/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          scheduledAt: new Date(scheduledAt).toISOString(),
          duration,
          platform,
          meetingUrl: meetingUrl.trim() || undefined,
          hostId: session?.user?.id,
          attendees: attendeePayload,
        }),
      })

      if (res.ok) {
        router.push('/super-admin/sessions')
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to create session.', 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') return null
  if (status === 'authenticated' && !canManageSessions(session)) return null

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-page-enter">
      {/* Toast */}
      {toast && (
        <div
          className={clsx(
            'fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2',
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          )}
        >
          {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      {/* Breadcrumb */}
      <Link
        href="/super-admin/sessions"
        className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Sessions
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Plus className="h-6 w-6 text-emerald-600" />
          Create Session
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Schedule a new virtual classroom session across organisations.
        </p>
      </div>

      {/* Cohort pre-fill banner */}
      {showCohortBanner && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20 px-4 py-3 flex items-start gap-3">
          <UsersIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
              Attendees pre-selected from cohort &lsquo;{cohortName}&rsquo;.
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
              Edit the attendee list below if you want to add or remove people.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCohortBannerDismissed(true)}
            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
            aria-label="Dismiss cohort banner"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Session Details */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-6 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-emerald-600" />
            Session Details
          </h2>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100"
              placeholder="e.g. ASD Module 1 — Live Q&A"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100 resize-none"
              placeholder="Optional session description..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Date &amp; Time *
              </label>
              <input
                type="datetime-local"
                required
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                min={5}
                max={480}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Platform
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as 'ZOOM' | 'TEAMS' | 'CUSTOM' | 'IN_PERSON')}
                className="w-full appearance-none px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100"
              >
                <option value="ZOOM">Zoom</option>
                <option value="TEAMS">Microsoft Teams</option>
                <option value="CUSTOM">Custom Link</option>
                <option value="IN_PERSON">In Person</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Meeting Link
              </label>
              <input
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100"
                placeholder="https://..."
              />
              {meetingConfig?.configured && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  You can auto-generate a link from the session detail page after creation.
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Host
            </label>
            <div className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm bg-calm-50 dark:bg-slate-700 dark:text-slate-300 text-slate-600">
              {session?.user?.name ?? session?.user?.email ?? 'Current user'}{' '}
              <span className="text-slate-400 dark:text-slate-500">(you)</span>
            </div>
          </div>
        </div>

        {/* Attendee Selection */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-6 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Attendee Selection
          </h2>
          <SessionAttendeePicker
            value={attendeeConfig}
            onChange={setAttendeeConfig}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link
            href="/super-admin/sessions"
            className="px-4 py-2 rounded-xl border border-calm-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors font-medium"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold transition-colors flex items-center gap-2"
          >
            {submitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
            Create Session
          </button>
        </div>
      </form>
    </div>
  )
}
