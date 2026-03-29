'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Video,
  ExternalLink,
  Play,
  CheckCircle,
  XCircle,
  Save,
  Loader2,
  Link as LinkIcon,
  Film,
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

function StatusBadge({ status }: { status: ClassSession['status'] }) {
  const styles = {
    SCHEDULED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    IN_PROGRESS: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    COMPLETED: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  }
  const labels = {
    SCHEDULED: 'Scheduled',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

export default function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { data: authSession } = useSession()
  const [session, setSession] = useState<ClassSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Host editable fields
  const [meetingUrl, setMeetingUrl] = useState('')
  const [recordingUrl, setRecordingUrl] = useState('')
  const [savingLinks, setSavingLinks] = useState(false)
  const [linksSaved, setLinksSaved] = useState(false)

  // Attendance
  const [attendance, setAttendance] = useState<Record<string, boolean>>({})
  const [savingAttendance, setSavingAttendance] = useState(false)
  const [attendanceSaved, setAttendanceSaved] = useState(false)

  // Status update
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const fetchSession = useCallback(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load session')
        return r.json()
      })
      .then((data: ClassSession) => {
        setSession(data)
        setMeetingUrl(data.meetingUrl || '')
        setRecordingUrl(data.recordingUrl || '')
        const att: Record<string, boolean> = {}
        data.attendees.forEach((a) => {
          att[a.id] = a.attended
        })
        setAttendance(att)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [sessionId])

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  const isHost = authSession?.user?.id === session?.hostId

  async function saveLinks() {
    setSavingLinks(true)
    setLinksSaved(false)
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingUrl: meetingUrl || null, recordingUrl: recordingUrl || null }),
      })
      if (!res.ok) throw new Error('Failed to save')
      const data = await res.json()
      setSession(data)
      setLinksSaved(true)
      setTimeout(() => setLinksSaved(false), 2000)
    } catch {
      setError('Failed to save links')
    } finally {
      setSavingLinks(false)
    }
  }

  async function updateStatus(newStatus: ClassSession['status']) {
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      const data = await res.json()
      setSession(data)
    } catch {
      setError('Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  async function saveAttendance() {
    setSavingAttendance(true)
    setAttendanceSaved(false)
    try {
      const payload = Object.entries(attendance).map(([attendeeId, attended]) => ({
        attendeeId,
        attended,
      }))
      const res = await fetch(`/api/sessions/${sessionId}/attendance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance: payload }),
      })
      if (!res.ok) throw new Error('Failed to save attendance')
      const data = await res.json()
      setSession(data)
      setAttendanceSaved(true)
      setTimeout(() => setAttendanceSaved(false), 2000)
    } catch {
      setError('Failed to save attendance')
    } finally {
      setSavingAttendance(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
      </div>
    )
  }

  if (error && !session) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="card text-center py-12">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <Link href="/sessions" className="text-sm text-primary-600 hover:text-primary-700 mt-2 inline-block">
            Back to sessions
          </Link>
        </div>
      </div>
    )
  }

  if (!session) return null

  const date = new Date(session.scheduledAt)
  const canJoin =
    session.meetingUrl &&
    (session.status === 'SCHEDULED' || session.status === 'IN_PROGRESS')

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/sessions"
          className="text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Sessions
        </Link>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span className="text-slate-900 dark:text-white font-medium truncate">{session.title}</span>
      </div>

      {/* Session Info Card */}
      <div className="card space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{session.title}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Hosted by {session.host.name || session.host.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PlatformBadge platform={session.platform} />
            <StatusBadge status={session.status} />
          </div>
        </div>

        {session.description && (
          <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">
            {session.description}
          </p>
        )}

        <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400 flex-wrap">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {format(date, 'EEEE d MMMM yyyy, h:mmaaa')}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {session.duration} minutes
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            {session._count.attendees} attendee{session._count.attendees !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 flex-wrap pt-2">
          {canJoin && (
            <a
              href={session.meetingUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-colors"
            >
              Join Meeting <ExternalLink className="h-4 w-4" />
            </a>
          )}
          {session.recordingUrl && (
            <a
              href={session.recordingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-xl transition-colors"
            >
              <Film className="h-4 w-4" />
              Watch Recording
            </a>
          )}
        </div>
      </div>

      {/* Host Controls */}
      {isHost && (
        <>
          {/* Status Controls */}
          <div className="card space-y-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Session Controls</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {session.status === 'SCHEDULED' && (
                <button
                  onClick={() => updateStatus('IN_PROGRESS')}
                  disabled={updatingStatus}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  <Play className="h-3.5 w-3.5" /> Start Session
                </button>
              )}
              {(session.status === 'SCHEDULED' || session.status === 'IN_PROGRESS') && (
                <button
                  onClick={() => updateStatus('COMPLETED')}
                  disabled={updatingStatus}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-500 hover:bg-slate-600 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  <CheckCircle className="h-3.5 w-3.5" /> Complete
                </button>
              )}
              {session.status !== 'CANCELLED' && session.status !== 'COMPLETED' && (
                <button
                  onClick={() => updateStatus('CANCELLED')}
                  disabled={updatingStatus}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  <XCircle className="h-3.5 w-3.5" /> Cancel
                </button>
              )}
              {updatingStatus && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
            </div>
          </div>

          {/* Meeting & Recording Links */}
          <div className="card space-y-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Meeting Links</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  <LinkIcon className="h-3.5 w-3.5 inline mr-1" />
                  Meeting URL
                </label>
                <input
                  type="url"
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  placeholder="https://zoom.us/j/..."
                  className="w-full px-3 py-2 rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  <Film className="h-3.5 w-3.5 inline mr-1" />
                  Recording URL
                </label>
                <input
                  type="url"
                  value={recordingUrl}
                  onChange={(e) => setRecordingUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={saveLinks}
                disabled={savingLinks}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
              >
                {savingLinks ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save Links
              </button>
              {linksSaved && (
                <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" /> Saved
                </span>
              )}
            </div>
          </div>
        </>
      )}

      {/* Attendee List */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Attendees ({session.attendees.length})
          </h2>
        </div>
        {session.attendees.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No attendees assigned.</p>
        ) : (
          <div className="space-y-2">
            {session.attendees.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 p-3 bg-calm-50 dark:bg-slate-700/50 rounded-xl"
              >
                <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/40 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                    {(a.user.name || a.user.email).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {a.user.name || a.user.email}
                  </p>
                  {a.user.name && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                      {a.user.email}
                    </p>
                  )}
                </div>
                {isHost ? (
                  <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={attendance[a.id] ?? false}
                      onChange={(e) =>
                        setAttendance((prev) => ({ ...prev, [a.id]: e.target.checked }))
                      }
                      className="w-4 h-4 rounded border-calm-300 text-primary-500 focus:ring-primary-500"
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400">Attended</span>
                  </label>
                ) : (
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      a.attended
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {a.attended ? 'Attended' : 'Pending'}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        {isHost && session.attendees.length > 0 && (
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={saveAttendance}
              disabled={savingAttendance}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {savingAttendance ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save Attendance
            </button>
            {attendanceSaved && (
              <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" /> Saved
              </span>
            )}
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
    </div>
  )
}
