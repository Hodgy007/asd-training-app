'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Calendar,
  Plus,
  RefreshCw,
  Users,
  Clock,
  Video,
  Monitor,
  Link as LinkIcon,
} from 'lucide-react'
import { clsx } from 'clsx'

type SessionStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
type Platform = 'ZOOM' | 'TEAMS' | 'CUSTOM'

interface ClassSession {
  id: string
  title: string
  description: string | null
  scheduledAt: string
  duration: number
  meetingUrl: string | null
  platform: Platform
  status: SessionStatus
  host: { id: string; name: string | null; email: string }
  _count: { attendees: number }
}

const STATUS_STYLES: Record<SessionStatus, string> = {
  SCHEDULED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  IN_PROGRESS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  COMPLETED: 'bg-sage-100 text-sage-700 dark:bg-slate-600 dark:text-slate-300',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const STATUS_LABELS: Record<SessionStatus, string> = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

const PLATFORM_STYLES: Record<Platform, string> = {
  ZOOM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  TEAMS: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  CUSTOM: 'bg-slate-100 text-slate-700 dark:bg-slate-600 dark:text-slate-300',
}

const PLATFORM_LABELS: Record<Platform, string> = {
  ZOOM: 'Zoom',
  TEAMS: 'Teams',
  CUSTOM: 'Custom',
}

const PLATFORM_ICONS: Record<Platform, React.ElementType> = {
  ZOOM: Video,
  TEAMS: Monitor,
  CUSTOM: LinkIcon,
}

type FilterTab = 'ALL' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED'

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'UPCOMING', label: 'Upcoming' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
]

function formatSessionDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }) + ' at ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export default function SessionListPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [sessions, setSessions] = useState<ClassSession[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>('ALL')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && session?.user?.role !== 'ORG_ADMIN') router.push('/dashboard')
  }, [status, session, router])

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter === 'UPCOMING') params.set('status', 'SCHEDULED')
      else if (filter === 'COMPLETED') params.set('status', 'COMPLETED')
      else if (filter === 'CANCELLED') params.set('status', 'CANCELLED')

      const res = await fetch(`/api/admin/sessions?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions ?? data)
      }
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    if (status === 'authenticated') fetchSessions()
  }, [status, fetchSessions])

  if (status !== 'authenticated' || session?.user?.role !== 'ORG_ADMIN') return null

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-emerald-600" />
            Virtual Classroom Sessions
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Schedule and manage virtual training sessions for your organisation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchSessions}
            className="p-2.5 rounded-xl border border-calm-200 dark:border-slate-700 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400"
            title="Refresh"
          >
            <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
          </button>
          <Link
            href="/admin/sessions/new"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Session
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-calm-100 dark:bg-slate-700 rounded-xl p-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={clsx(
              'flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all',
              filter === tab.key
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sessions List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
          <RefreshCw className="h-6 w-6 animate-spin mb-3" />
          <p className="text-sm">Loading sessions...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
          <Calendar className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">No sessions found</p>
          <p className="text-xs mt-1">Create your first virtual classroom session to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const PlatformIcon = PLATFORM_ICONS[s.platform]
            return (
              <Link
                key={s.id}
                href={`/admin/sessions/${s.id}`}
                className="block bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-600 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                      {s.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatSessionDate(s.scheduledAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {s.duration} min
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {s._count.attendees} attendee{s._count.attendees !== 1 ? 's' : ''}
                      </span>
                      {s.host && (
                        <span className="text-slate-400 dark:text-slate-500">
                          Host: {s.host.name ?? s.host.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={clsx('inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full', PLATFORM_STYLES[s.platform])}>
                      <PlatformIcon className="h-3 w-3" />
                      {PLATFORM_LABELS[s.platform]}
                    </span>
                    <span className={clsx('inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full', STATUS_STYLES[s.status])}>
                      {STATUS_LABELS[s.status]}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
