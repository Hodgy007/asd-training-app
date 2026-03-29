'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  Calendar,
  Clock,
  Users,
  Video,
  ExternalLink,
  Loader2,
  Settings,
} from 'lucide-react'
import { format } from 'date-fns'

interface SessionHost {
  id: string
  name: string | null
  email: string
}

interface SessionAttendee {
  id: string
  userId: string
  attended: boolean
  user: { id: string; name: string | null; email: string }
}

interface ClassSession {
  id: string
  title: string
  description: string | null
  scheduledAt: string
  duration: number
  meetingUrl: string | null
  recordingUrl: string | null
  platform: 'ZOOM' | 'TEAMS' | 'CUSTOM'
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  hostId: string
  host: SessionHost
  attendees: SessionAttendee[]
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
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[platform]}`}>
      <Video className="h-3 w-3" />
      {labels[platform]}
    </span>
  )
}

function SessionCard({
  session,
  isHosted,
}: {
  session: ClassSession
  isHosted: boolean
}) {
  const date = new Date(session.scheduledAt)
  const canJoin =
    session.meetingUrl &&
    (session.status === 'SCHEDULED' || session.status === 'IN_PROGRESS')

  return (
    <div className="card flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/sessions/${session.id}`}
            className="text-base font-semibold text-slate-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            {session.title}
          </Link>
          <PlatformBadge platform={session.platform} />
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {format(date, 'EEE d MMM yyyy, h:mmaaa')}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {session.duration} min
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {session._count.attendees} attendee{session._count.attendees !== 1 ? 's' : ''}
          </span>
        </div>
        {!isHosted && (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Hosted by {session.host.name || session.host.email}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {canJoin && (
          <a
            href={session.meetingUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Join <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        {isHosted && (
          <Link
            href={`/sessions/${session.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-xl transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
            Manage
          </Link>
        )}
      </div>
    </div>
  )
}

export default function SessionsPage() {
  const { data: authSession } = useSession()
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

  const userId = authSession?.user?.id
  const hosted = sessions.filter((s) => s.hostId === userId)
  const invited = sessions.filter((s) => s.hostId !== userId)

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Your Sessions</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Virtual classroom sessions you&apos;re hosting or attending.
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-calm-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mb-4">
            <Calendar className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">No upcoming sessions</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            You don&apos;t have any scheduled or in-progress sessions right now.
          </p>
        </div>
      ) : (
        <>
          {hosted.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Sessions You&apos;re Hosting
              </h2>
              {hosted.map((s) => (
                <SessionCard key={s.id} session={s} isHosted />
              ))}
            </section>
          )}

          {invited.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Upcoming Sessions
              </h2>
              {invited.map((s) => (
                <SessionCard key={s.id} session={s} isHosted={false} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  )
}
