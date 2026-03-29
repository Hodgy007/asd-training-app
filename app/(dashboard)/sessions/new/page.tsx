'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  Plus,
  RefreshCw,
  Search,
  X,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { clsx } from 'clsx'

interface OrgUser {
  id: string
  name: string | null
  email: string
  role: string
}

const ROLE_LABELS: Record<string, string> = {
  CAREGIVER: 'Practitioner',
  CAREER_DEV_OFFICER: 'Careers Professional',
  STUDENT: 'Student',
  INTERN: 'Intern',
  EMPLOYEE: 'Employee',
}

const CAN_CREATE = ['ORG_ADMIN', 'CAREGIVER', 'CAREER_DEV_OFFICER']

export default function NewSessionPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [orgRoles, setOrgRoles] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [duration, setDuration] = useState(60)
  const [platform, setPlatform] = useState<'ZOOM' | 'TEAMS' | 'CUSTOM'>('ZOOM')
  const [meetingUrl, setMeetingUrl] = useState('')
  const [hostId, setHostId] = useState('')

  // Attendee selection
  const [inviteAll, setInviteAll] = useState(true)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [selectedUsers, setSelectedUsers] = useState<OrgUser[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [searchResults, setSearchResults] = useState<OrgUser[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)

  // Users list for host picker
  const [users, setUsers] = useState<OrgUser[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !CAN_CREATE.includes(session?.user?.role ?? '')) {
      router.push('/sessions')
    }
  }, [status, session, router])

  // Fetch org users for host picker on mount
  useEffect(() => {
    if (status !== 'authenticated') return

    fetch('/api/sessions/org-info')
      .then((r) => r.json())
      .then((org) => { if (org?.allowedRoles) setOrgRoles(org.allowedRoles) })

    fetch('/api/sessions/org-users')
      .then((r) => r.json())
      .then((data) => {
        const userList: OrgUser[] = Array.isArray(data) ? data : (data.users ?? [])
        setUsers(userList)
        // Default host to current user
        if (session?.user?.id) setHostId(session.user.id)
      })
      .catch(() => {})
  }, [status, session])

  // Search users for individual attendee selection
  const searchUsers = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([])
        return
      }
      try {
        const res = await fetch(`/api/sessions/org-users?search=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          const results: OrgUser[] = Array.isArray(data) ? data : (data.users ?? [])
          const selectedIds = new Set(selectedUsers.map((u) => u.id))
          setSearchResults(results.filter((u) => !selectedIds.has(u.id)))
        }
      } catch {
        // ignore
      }
    },
    [selectedUsers]
  )

  useEffect(() => {
    const timer = setTimeout(() => searchUsers(userSearch), 300)
    return () => clearTimeout(timer)
  }, [userSearch, searchUsers])

  function toggleRole(role: string) {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }

  function addUser(user: OrgUser) {
    setSelectedUsers((prev) => [...prev, user])
    setUserSearch('')
    setSearchResults([])
    setShowSearchResults(false)
  }

  function removeUser(userId: string) {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId))
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !scheduledAt || !hostId) return

    setSubmitting(true)
    try {
      const attendees: Record<string, unknown> = {}
      if (inviteAll) {
        attendees.allRoles = true
      } else {
        if (selectedRoles.length > 0) attendees.roles = selectedRoles
        if (selectedUsers.length > 0) attendees.userIds = selectedUsers.map((u) => u.id)
      }

      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          scheduledAt: new Date(scheduledAt).toISOString(),
          duration,
          platform,
          meetingUrl: meetingUrl.trim() || undefined,
          hostId,
          attendees,
        }),
      })

      if (res.ok) {
        router.push('/sessions')
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to create session.', 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (status !== 'authenticated' || !CAN_CREATE.includes(session?.user?.role ?? '')) return null

  return (
    <div className="max-w-3xl mx-auto space-y-6">
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
        href="/sessions"
        className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Sessions
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Plus className="h-6 w-6 text-primary-500" />
          Create Session
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Schedule a new virtual classroom session.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Session Details */}
        <div className="card space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary-500" />
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
              className="w-full px-3 py-2 rounded-xl border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white dark:bg-slate-700 dark:text-slate-100"
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
              className="w-full px-3 py-2 rounded-xl border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white dark:bg-slate-700 dark:text-slate-100 resize-none"
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
                className="w-full px-3 py-2 rounded-xl border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white dark:bg-slate-700 dark:text-slate-100"
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
                className="w-full px-3 py-2 rounded-xl border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white dark:bg-slate-700 dark:text-slate-100"
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
                onChange={(e) => setPlatform(e.target.value as 'ZOOM' | 'TEAMS' | 'CUSTOM')}
                className="w-full appearance-none px-3 py-2 rounded-xl border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white dark:bg-slate-700 dark:text-slate-100"
              >
                <option value="ZOOM">Zoom</option>
                <option value="TEAMS">Microsoft Teams</option>
                <option value="CUSTOM">Custom Link</option>
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
                className="w-full px-3 py-2 rounded-xl border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white dark:bg-slate-700 dark:text-slate-100"
                placeholder="https://..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Host *
            </label>
            <select
              required
              value={hostId}
              onChange={(e) => setHostId(e.target.value)}
              className="w-full appearance-none px-3 py-2 rounded-xl border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white dark:bg-slate-700 dark:text-slate-100"
            >
              <option value="">Select a host...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ?? 'Unnamed'} ({u.email})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Attendee Selection */}
        <div className="card space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Attendee Selection
          </h2>

          {/* Invite all toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setInviteAll(!inviteAll)}
              className={clsx(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-300',
                inviteAll ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-600'
              )}
            >
              <span
                className={clsx(
                  'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                  inviteAll ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
            <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
              Invite all members
            </span>
          </div>

          {!inviteAll && (
            <>
              {/* Role checkboxes */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Invite by role
                </label>
                <div className="flex flex-wrap gap-2">
                  {orgRoles.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={clsx(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                        selectedRoles.includes(role)
                          ? 'bg-primary-50 text-primary-700 border-primary-300 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-700'
                          : 'bg-white text-slate-500 border-calm-200 hover:border-primary-300 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600'
                      )}
                    >
                      {selectedRoles.includes(role) && (
                        <CheckCircle className="inline h-3 w-3 mr-1" />
                      )}
                      {ROLE_LABELS[role] ?? role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Individual user search */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Add individual attendees
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value)
                      setShowSearchResults(true)
                    }}
                    onFocus={() => setShowSearchResults(true)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white dark:bg-slate-700 dark:text-slate-100"
                    placeholder="Search by name or email..."
                  />
                  {showSearchResults && searchResults.length > 0 && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowSearchResults(false)}
                      />
                      <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white dark:bg-slate-800 border border-calm-200 dark:border-slate-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {searchResults.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => addUser(u)}
                            className="w-full text-left px-4 py-2.5 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors text-sm"
                          >
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {u.name ?? 'Unnamed'}
                            </span>
                            <span className="text-slate-400 dark:text-slate-500 ml-2">
                              {u.email}
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Selected user chips */}
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedUsers.map((u) => (
                      <span
                        key={u.id}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 text-xs font-medium"
                      >
                        {u.name ?? u.email}
                        <button
                          type="button"
                          onClick={() => removeUser(u.id)}
                          className="p-0.5 rounded-full hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link
            href="/sessions"
            className="px-4 py-2 rounded-xl border border-calm-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors font-medium"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white text-sm font-bold transition-colors flex items-center gap-2"
          >
            {submitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
            Create Session
          </button>
        </div>
      </form>
    </div>
  )
}
