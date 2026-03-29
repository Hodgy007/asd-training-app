'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Video,
  Monitor,
  Link as LinkIcon,
  ExternalLink,
  Copy,
  Play,
  Square,
  XCircle,
  CheckCircle,
  RefreshCw,
  Trash2,
  Save,
  Users,
  Zap,
} from 'lucide-react'
import { clsx } from 'clsx'

type SessionStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
type Platform = 'ZOOM' | 'TEAMS' | 'CUSTOM'

interface Attendee {
  id: string
  userId: string
  attended: boolean
  joinedAt: string | null
  user: { id: string; name: string | null; email: string; role: string }
}

interface ClassSessionDetail {
  id: string
  title: string
  description: string | null
  scheduledAt: string
  duration: number
  meetingUrl: string | null
  recordingUrl: string | null
  platform: Platform
  status: SessionStatus
  hostId: string
  host: { id: string; name: string | null; email: string }
  createdBy: { id: string; name: string | null }
  attendees: Attendee[]
  _count: { attendees: number }
}

interface OrgUser {
  id: string
  name: string | null
  email: string
  role: string
}

interface MeetingConfig {
  platform: string
  configured: boolean
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

const ROLE_STYLES: Record<string, string> = {
  CAREGIVER: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  CAREER_DEV_OFFICER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  STUDENT: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  INTERN: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  EMPLOYEE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  ORG_ADMIN: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
}

const ROLE_LABELS: Record<string, string> = {
  CAREGIVER: 'Practitioner',
  CAREER_DEV_OFFICER: 'Careers',
  STUDENT: 'Student',
  INTERN: 'Intern',
  EMPLOYEE: 'Employee',
  ORG_ADMIN: 'Org Admin',
}

function toLocalDatetime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function SessionDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const sessionId = params.sessionId as string

  const [data, setData] = useState<ClassSessionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<OrgUser[]>([])
  const [meetingConfig, setMeetingConfig] = useState<MeetingConfig | null>(null)

  // Editable fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [duration, setDuration] = useState(60)
  const [platform, setPlatform] = useState<Platform>('ZOOM')
  const [meetingUrl, setMeetingUrl] = useState('')
  const [recordingUrl, setRecordingUrl] = useState('')
  const [hostId, setHostId] = useState('')

  // Attendance
  const [attendance, setAttendance] = useState<Record<string, boolean>>({})

  // UI state
  const [saving, setSaving] = useState(false)
  const [savingAttendance, setSavingAttendance] = useState(false)
  const [statusChanging, setStatusChanging] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && session?.user?.role !== 'ORG_ADMIN') router.push('/dashboard')
  }, [status, session, router])

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchSession = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}`)
      if (res.ok) {
        const d: ClassSessionDetail = await res.json()
        setData(d)
        setTitle(d.title)
        setDescription(d.description ?? '')
        setScheduledAt(toLocalDatetime(d.scheduledAt))
        setDuration(d.duration)
        setPlatform(d.platform)
        setMeetingUrl(d.meetingUrl ?? '')
        setRecordingUrl(d.recordingUrl ?? '')
        setHostId(d.hostId)
        const att: Record<string, boolean> = {}
        d.attendees.forEach((a) => { att[a.userId] = a.attended })
        setAttendance(att)
      } else {
        showToast('Failed to load session.', 'error')
      }
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetchSession()

    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? d))

    fetch('/api/admin/settings/meetings')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setMeetingConfig(d) })
  }, [status, fetchSession])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          scheduledAt: new Date(scheduledAt).toISOString(),
          duration,
          platform,
          meetingUrl: meetingUrl.trim() || null,
          recordingUrl: recordingUrl.trim() || null,
          hostId,
        }),
      })
      if (res.ok) {
        showToast('Session updated.', 'success')
        fetchSession()
      } else {
        const d = await res.json()
        showToast(d.error || 'Update failed.', 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(newStatus: SessionStatus) {
    setStatusChanging(true)
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        showToast(`Session ${STATUS_LABELS[newStatus].toLowerCase()}.`, 'success')
        fetchSession()
      } else {
        const d = await res.json()
        showToast(d.error || 'Status change failed.', 'error')
      }
    } finally {
      setStatusChanging(false)
    }
  }

  async function handleSaveAttendance() {
    setSavingAttendance(true)
    try {
      const attendees = Object.entries(attendance).map(([userId, attended]) => ({
        userId,
        attended,
      }))
      const res = await fetch(`/api/admin/sessions/${sessionId}/attendance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendees }),
      })
      if (res.ok) {
        showToast('Attendance saved.', 'success')
        fetchSession()
      } else {
        const d = await res.json()
        showToast(d.error || 'Failed to save attendance.', 'error')
      }
    } finally {
      setSavingAttendance(false)
    }
  }

  async function generateMeeting() {
    setGenerating(true)
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}/generate-meeting`, {
        method: 'POST',
      })
      if (res.ok) {
        showToast('Meeting link generated.', 'success')
        fetchSession()
      } else {
        const d = await res.json()
        showToast(d.error || 'Failed to generate meeting.', 'error')
      }
    } finally {
      setGenerating(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this session? This cannot be undone.')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/admin/sessions')
      } else {
        const d = await res.json()
        showToast(d.error || 'Delete failed.', 'error')
      }
    } finally {
      setDeleting(false)
    }
  }

  function copyLink() {
    if (meetingUrl) {
      navigator.clipboard.writeText(meetingUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function markAll(value: boolean) {
    const updated: Record<string, boolean> = {}
    data?.attendees.forEach((a) => { updated[a.userId] = value })
    setAttendance(updated)
  }

  if (status !== 'authenticated' || session?.user?.role !== 'ORG_ADMIN') return null

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-500">
        <RefreshCw className="h-6 w-6 animate-spin mb-3" />
        <p className="text-sm">Loading session...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/admin/sessions" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-emerald-600 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Sessions
        </Link>
        <p className="text-slate-500 dark:text-slate-400">Session not found.</p>
      </div>
    )
  }

  const canEdit = data.status === 'SCHEDULED' || data.status === 'IN_PROGRESS'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div className={clsx(
          'fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2',
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        )}>
          {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      {/* Breadcrumb */}
      <Link href="/admin/sessions" className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Sessions
      </Link>

      {/* Section 1: Session Info */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-emerald-600" />
            Session Details
          </h2>
          <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full', STATUS_STYLES[data.status])}>
            {STATUS_LABELS[data.status]}
          </span>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!canEdit}
            className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100 disabled:opacity-60"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!canEdit}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100 disabled:opacity-60 resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Date & Time</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100 disabled:opacity-60"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Duration (minutes)</label>
            <input
              type="number"
              min={5}
              max={480}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              disabled={!canEdit}
              className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100 disabled:opacity-60"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
              disabled={!canEdit}
              className="w-full appearance-none px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100 disabled:opacity-60"
            >
              <option value="ZOOM">Zoom</option>
              <option value="TEAMS">Microsoft Teams</option>
              <option value="CUSTOM">Custom Link</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Host</label>
            <select
              value={hostId}
              onChange={(e) => setHostId(e.target.value)}
              disabled={!canEdit}
              className="w-full appearance-none px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100 disabled:opacity-60"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name ?? 'Unnamed'} ({u.email})</option>
              ))}
            </select>
          </div>
        </div>

        {canEdit && (
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold transition-colors flex items-center gap-2"
            >
              {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Changes
            </button>
          </div>
        )}
      </div>

      {/* Section 2: Status Controls */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Status Controls</h2>
        <div className="flex flex-wrap items-center gap-3">
          {data.status === 'SCHEDULED' && (
            <>
              <button
                onClick={() => changeStatus('IN_PROGRESS')}
                disabled={statusChanging}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-bold transition-colors"
              >
                <Play className="h-3.5 w-3.5" /> Start Session
              </button>
              <button
                onClick={() => changeStatus('CANCELLED')}
                disabled={statusChanging}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-bold transition-colors"
              >
                <XCircle className="h-3.5 w-3.5" /> Cancel
              </button>
            </>
          )}
          {data.status === 'IN_PROGRESS' && (
            <>
              <button
                onClick={() => changeStatus('COMPLETED')}
                disabled={statusChanging}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold transition-colors"
              >
                <Square className="h-3.5 w-3.5" /> Complete
              </button>
              <button
                onClick={() => changeStatus('CANCELLED')}
                disabled={statusChanging}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-bold transition-colors"
              >
                <XCircle className="h-3.5 w-3.5" /> Cancel
              </button>
            </>
          )}
          {(data.status === 'COMPLETED' || data.status === 'CANCELLED') && (
            <p className="text-sm text-slate-400 dark:text-slate-500">
              This session is {data.status.toLowerCase()}. No further status changes available.
            </p>
          )}
        </div>
      </div>

      {/* Section 3: Meeting Link */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Video className="h-5 w-5 text-emerald-600" />
          Meeting Link
        </h2>

        {data.meetingUrl ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 px-3 py-2 rounded-lg bg-calm-50 dark:bg-slate-700 border border-calm-200 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300 truncate">
              {data.meetingUrl}
            </div>
            <a
              href={data.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open
            </a>
            <button
              onClick={copyLink}
              className="flex items-center gap-1 px-3 py-2 rounded-xl border border-calm-200 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="Paste meeting URL..."
                className="flex-1 px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100"
              />
              <button
                onClick={handleSave}
                disabled={saving || !meetingUrl.trim()}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
              >
                Save
              </button>
            </div>
            {meetingConfig && meetingConfig.configured && (
              <button
                onClick={generateMeeting}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-sm font-bold transition-colors"
              >
                {generating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                Auto-generate Meeting Link
              </button>
            )}
          </div>
        )}
      </div>

      {/* Section 4: Attendee List & Attendance */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            Attendees
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {data.attendees.length}
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => markAll(true)}
              className="px-3 py-1.5 rounded-lg border border-calm-200 dark:border-slate-600 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
            >
              Mark all present
            </button>
            <button
              onClick={() => markAll(false)}
              className="px-3 py-1.5 rounded-lg border border-calm-200 dark:border-slate-600 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors"
            >
              Mark all absent
            </button>
          </div>
        </div>

        {data.attendees.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">No attendees for this session.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-calm-200 dark:border-slate-700">
                  <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">Name</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">Email</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">Role</th>
                  <th className="text-center px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">Attended</th>
                </tr>
              </thead>
              <tbody>
                {data.attendees.map((a) => (
                  <tr key={a.id} className="border-b border-calm-100 dark:border-slate-700/50">
                    <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                      {a.user.name ?? '---'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{a.user.email}</td>
                    <td className="px-3 py-2.5">
                      <span className={clsx(
                        'text-xs font-semibold px-2 py-0.5 rounded-full',
                        ROLE_STYLES[a.user.role] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      )}>
                        {ROLE_LABELS[a.user.role] ?? a.user.role}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={attendance[a.userId] ?? false}
                        onChange={(e) => setAttendance((prev) => ({ ...prev, [a.userId]: e.target.checked }))}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data.attendees.length > 0 && (
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveAttendance}
              disabled={savingAttendance}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold transition-colors flex items-center gap-2"
            >
              {savingAttendance ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Attendance
            </button>
          </div>
        )}
      </div>

      {/* Section 5: Recording */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Monitor className="h-5 w-5 text-emerald-600" />
          Recording
        </h2>
        <div className="flex items-center gap-3">
          <input
            type="url"
            value={recordingUrl}
            onChange={(e) => setRecordingUrl(e.target.value)}
            placeholder="Paste recording URL..."
            className="flex-1 px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
          >
            Save
          </button>
        </div>
        {data.recordingUrl && (
          <a
            href={data.recordingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Watch Recording
          </a>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-red-200 dark:border-red-900/50 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-red-600 dark:text-red-400">Danger Zone</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Permanently delete this session and all attendance records. This cannot be undone.
        </p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-bold transition-colors"
        >
          {deleting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Delete Session
        </button>
      </div>
    </div>
  )
}
