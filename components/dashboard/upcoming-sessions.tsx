'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Calendar, Video, ExternalLink, Loader2, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'

interface SessionHost {
  id: string
  name: string | null
  email: string
}

interface ClassSession {
  id: string
  title: string
  scheduledAt: string
  duration: number
  meetingUrl: string | null
  platform: 'ZOOM' | 'TEAMS' | 'CUSTOM'
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  host: SessionHost
  _count: { attendees: number }
}

function PlatformBadge({ platform }: { platform: ClassSession['platform'] }) {
  const styles = {
    ZOOM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    TEAMS: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    CUSTOM: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  }
  const labels = { ZOOM: 'Zoom', TEAMS: 'Teams', CUSTOM: 'Custom' }
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${styles[platform]}`}>
      <Video className="h-2.5 w-2.5" />
      {labels[platform]}
    </span>
  )
}

export function UpcomingSessions() {
  const [sessions, setSessions] = useState<ClassSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/sessions/upcoming')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSessions(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      </div>
    )
  }

  if (sessions.length === 0) return null

  const displayed = sessions.slice(0, 3)

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Upcoming Sessions</h2>
        </div>
        <Link
          href="/sessions"
          className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 flex items-center gap-1"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="space-y-2">
        {displayed.map((s) => {
          const date = new Date(s.scheduledAt)
          const canJoin =
            s.meetingUrl &&
            (s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS')

          return (
            <div
              key={s.id}
              className="flex items-center gap-3 p-3 bg-calm-50 dark:bg-slate-700/50 rounded-xl"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/sessions/${s.id}`}
                    className="text-sm font-medium text-slate-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors truncate"
                  >
                    {s.title}
                  </Link>
                  <PlatformBadge platform={s.platform} />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {format(date, 'EEE d MMM, h:mmaaa')} &middot;{' '}
                  {s.host.name || s.host.email}
                </p>
              </div>
              {canJoin && (
                <a
                  href={s.meetingUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-xs font-medium rounded-lg transition-colors flex-shrink-0"
                >
                  Join <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
