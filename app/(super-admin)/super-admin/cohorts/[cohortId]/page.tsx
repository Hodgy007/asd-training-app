'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  UsersRound,
  Users,
  BookOpen,
  FolderOpen,
  Calendar,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Upload,
  Download,
  UserPlus,
  ClipboardList,
  Archive,
  ArchiveRestore,
  Link2,
  Copy,
} from 'lucide-react'
import { clsx } from 'clsx'
import { CredentialCardModal } from '@/components/ui/credential-card-modal'
import { SendInviteButton } from '@/components/ui/send-invite-button'

interface TrainingProgram {
  id: string
  name: string
  status: string
}

interface CohortMember {
  id: string
  name: string | null
  email: string
  role: string
  active: boolean
  mustChangePassword: boolean
  createdAt: string
}

interface CohortDocument {
  id: string
  title: string
  description: string
  documentCount: number
  assigned: boolean
}

interface CohortSurvey {
  id: string
  title: string
  description: string | null
  status: 'DRAFT' | 'PUBLISHED'
  closesAt: string | null
  questionCount: number
  assigned: boolean
}

interface CohortSession {
  id: string
  title: string
  scheduledAt: string
  platform: string
  status: string
  _count?: { attendees: number }
}

interface Cohort {
  id: string
  name: string
  active: boolean
  lifecycleStatus: 'ACTIVE' | 'ARCHIVED'
  archivedAt: string | null
  allowedProgramIds: string[]
  allowedRoles: string[]
  createdAt: string
  _count: { users: number }
  users: CohortMember[]
}

interface InviteState {
  code: string | null
  enabled: boolean
  expiresAt: string | null
}

const ROLE_LABELS: Record<string, string> = {
  CAREGIVER: 'Practitioner',
  FAMILY_CARER: 'Parent/Friend/Relative/Carer',
  CAREER_DEV_OFFICER: 'Careers Professional',
  STUDENT: 'Student',
  INTERN: 'Intern',
  EMPLOYEE: 'Employee',
}

const PLATFORM_LABELS: Record<string, string> = {
  ZOOM: 'Zoom',
  TEAMS: 'Teams',
  CUSTOM: 'Custom',
  IN_PERSON: 'In Person',
}

type Tab = 'members' | 'training' | 'documents' | 'surveys' | 'workshops'

export default function CohortDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const cohortId = params.cohortId as string

  const [cohort, setCohort] = useState<Cohort | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('members')
  const [programs, setPrograms] = useState<TrainingProgram[]>([])
  const [documents, setDocuments] = useState<CohortDocument[]>([])
  const [surveys, setSurveys] = useState<CohortSurvey[]>([])
  const [cohortSessions, setCohortSessions] = useState<CohortSession[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Edit state for documents
  const [editingDocuments, setEditingDocuments] = useState(false)
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([])
  const [savingDocuments, setSavingDocuments] = useState(false)

  // Edit state for surveys
  const [editingSurveys, setEditingSurveys] = useState(false)
  const [selectedSurveyIds, setSelectedSurveyIds] = useState<string[]>([])
  const [savingSurveys, setSavingSurveys] = useState(false)

  // Add member form
  const [showAddMember, setShowAddMember] = useState(false)
  const [memberName, setMemberName] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [memberPassword, setMemberPassword] = useState('')
  const [memberRole, setMemberRole] = useState('STUDENT')
  const [addingMember, setAddingMember] = useState(false)

  // Credential card modal
  const [credCard, setCredCard] = useState<{ id: string; name: string; email: string; password: string } | null>(null)

  // Bulk import
  const [bulkResults, setBulkResults] = useState<{ name: string; email: string; password: string; role: string }[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit programs
  const [editingPrograms, setEditingPrograms] = useState(false)
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([])
  const [savingPrograms, setSavingPrograms] = useState(false)

  // Invite state
  const [invite, setInvite] = useState<InviteState | null>(null)
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteCopied, setInviteCopied] = useState(false)

  // Archive busy
  const [archiveBusy, setArchiveBusy] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetchAll()
  }, [status, cohortId])

  async function fetchAll() {
    setLoading(true)
    try {
      const [cohortRes, programsRes, documentsRes, surveysRes, sessionsRes, inviteRes] = await Promise.all([
        fetch(`/api/super-admin/cohorts/${cohortId}`),
        fetch('/api/super-admin/training/programs'),
        fetch(`/api/super-admin/cohorts/${cohortId}/documents`),
        fetch(`/api/super-admin/cohorts/${cohortId}/surveys`),
        fetch('/api/super-admin/sessions'),
        fetch(`/api/super-admin/cohorts/${cohortId}/invite`),
      ])

      if (inviteRes.ok) setInvite(await inviteRes.json())

      if (cohortRes.ok) {
        const c = await cohortRes.json()
        setCohort(c)
        setSelectedProgramIds(c.allowedProgramIds)
      } else {
        router.push('/super-admin/cohorts')
        return
      }

      if (programsRes.ok) {
        const p = await programsRes.json()
        setPrograms(p.filter((prog: TrainingProgram) => prog.status === 'APPROVED' || prog.status === 'UNDER_REVIEW'))
      }

      if (documentsRes.ok) {
        const d: CohortDocument[] = await documentsRes.json()
        setDocuments(d)
        setSelectedDocumentIds(d.filter((x) => x.assigned).map((x) => x.id))
      }

      if (surveysRes.ok) {
        const sv: CohortSurvey[] = await surveysRes.json()
        setSurveys(sv)
        setSelectedSurveyIds(sv.filter((x) => x.assigned).map((x) => x.id))
      }

      if (sessionsRes.ok) {
        const s = await sessionsRes.json()
        // Filter sessions to those where this cohort has attendees (approximate: sessions are charity-level)
        setCohortSessions(s)
      }
    } finally {
      setLoading(false)
    }
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    setAddingMember(true)
    try {
      const res = await fetch(`/api/super-admin/cohorts/${cohortId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: memberName.trim(),
          email: memberEmail.trim(),
          password: memberPassword,
          role: memberRole,
        }),
      })

      if (res.ok) {
        const created = await res.json()
        setCredCard({ id: created.id, name: memberName.trim(), email: memberEmail.trim(), password: memberPassword })
        setMemberName('')
        setMemberEmail('')
        setMemberPassword('')
        setMemberRole('STUDENT')
        setShowAddMember(false)
        fetchAll()
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to add member.', 'error')
      }
    } finally {
      setAddingMember(false)
    }
  }

  async function handleRemoveMember(userId: string, userName: string) {
    if (!confirm(`Remove ${userName} from this cohort?`)) return
    const res = await fetch(`/api/super-admin/cohorts/${cohortId}/members/${userId}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      showToast(`${userName} removed from cohort.`, 'success')
      fetchAll()
    } else {
      showToast('Failed to remove member.', 'error')
    }
  }

  async function handleSavePrograms() {
    setSavingPrograms(true)
    try {
      const res = await fetch(`/api/super-admin/cohorts/${cohortId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedProgramIds: selectedProgramIds }),
      })
      if (res.ok) {
        showToast('Training programs updated.', 'success')
        setEditingPrograms(false)
        fetchAll()
      } else {
        showToast('Failed to update programs.', 'error')
      }
    } finally {
      setSavingPrograms(false)
    }
  }

  async function handleSaveDocuments() {
    setSavingDocuments(true)
    try {
      const res = await fetch(`/api/super-admin/cohorts/${cohortId}/documents`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionIds: selectedDocumentIds }),
      })
      if (res.ok) {
        showToast('Document collections updated.', 'success')
        setEditingDocuments(false)
        fetchAll()
      } else {
        showToast('Failed to update documents.', 'error')
      }
    } finally {
      setSavingDocuments(false)
    }
  }

  async function handleSaveSurveys() {
    setSavingSurveys(true)
    try {
      const res = await fetch(`/api/super-admin/cohorts/${cohortId}/surveys`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surveyIds: selectedSurveyIds }),
      })
      if (res.ok) {
        showToast('Surveys updated.', 'success')
        setEditingSurveys(false)
        fetchAll()
      } else {
        showToast('Failed to update surveys.', 'error')
      }
    } finally {
      setSavingSurveys(false)
    }
  }

  async function handleBulkCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
    // Expect: name,email (skip header if present)
    const members: { name: string; email: string; role: string }[] = []
    for (const line of lines) {
      if (line.toLowerCase().startsWith('name')) continue // skip header
      const parts = line.split(',')
      if (parts.length < 2) continue
      const name = parts[0].trim().replace(/^"|"$/g, '')
      const email = parts[1].trim().replace(/^"|"$/g, '')
      if (name && email) members.push({ name, email, role: 'STUDENT' })
    }

    if (members.length === 0) {
      showToast('No valid rows found. CSV must have name and email columns.', 'error')
      return
    }

    const res = await fetch(`/api/super-admin/cohorts/${cohortId}/members/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ members }),
    })

    if (res.ok) {
      const { created, skipped } = await res.json()
      setBulkResults(created)
      showToast(
        `${created.length} accounts created${skipped.length > 0 ? `, ${skipped.length} skipped (existing emails)` : ''}.`,
        'success'
      )
      fetchAll()
    } else {
      showToast('Bulk import failed.', 'error')
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleArchive() {
    if (!cohort) return
    const confirmMessage = cohort.lifecycleStatus === 'ARCHIVED'
      ? `Reactivate "${cohort.name}"? Members can be invited again and the cohort reappears in targeting.`
      : `Archive "${cohort.name}"? Members keep platform access and read-only access to past content. Invites will be disabled.`
    if (!confirm(confirmMessage)) return
    setArchiveBusy(true)
    try {
      const method = cohort.lifecycleStatus === 'ARCHIVED' ? 'DELETE' : 'POST'
      const res = await fetch(`/api/super-admin/cohorts/${cohortId}/archive`, { method })
      if (res.ok) {
        showToast(cohort.lifecycleStatus === 'ARCHIVED' ? 'Cohort reactivated.' : 'Cohort archived.', 'success')
        fetchAll()
      } else {
        showToast('Failed to update cohort.', 'error')
      }
    } finally {
      setArchiveBusy(false)
    }
  }

  async function handleGenerateInvite() {
    setInviteBusy(true)
    try {
      const res = await fetch(`/api/super-admin/cohorts/${cohortId}/invite`, { method: 'POST' })
      if (res.ok) {
        setInvite(await res.json())
        showToast('Invite link generated.', 'success')
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to generate invite.', 'error')
      }
    } finally {
      setInviteBusy(false)
    }
  }

  async function handleToggleInvite(enabled: boolean) {
    setInviteBusy(true)
    try {
      const res = await fetch(`/api/super-admin/cohorts/${cohortId}/invite`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      if (res.ok) {
        setInvite(await res.json())
        showToast(enabled ? 'Invite link enabled.' : 'Invite link disabled.', 'success')
      } else {
        showToast('Failed to update invite.', 'error')
      }
    } finally {
      setInviteBusy(false)
    }
  }

  function copyInviteLink() {
    if (!invite?.code) return
    const url = `${window.location.origin}/join/${invite.code}`
    navigator.clipboard.writeText(url).then(() => {
      setInviteCopied(true)
      setTimeout(() => setInviteCopied(false), 2000)
    })
  }

  function downloadBulkCredentials() {
    if (!bulkResults) return
    const lines = ['Name,Email,Password,Role', ...bulkResults.map((r) => `"${r.name}","${r.email}","${r.password}","${r.role}"`)]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cohort-credentials-${cohortId}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading || !cohort) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 text-emerald-500 animate-spin" />
      </div>
    )
  }

  const assignedDocumentCount = documents.filter((d) => d.assigned).length
  const assignedSurveyCount = surveys.filter((s) => s.assigned).length

  const tabs: { key: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: 'members', label: 'Members', icon: Users, count: cohort._count.users },
    { key: 'training', label: 'Training', icon: BookOpen, count: cohort.allowedProgramIds.length },
    { key: 'documents', label: 'Documents', icon: FolderOpen, count: assignedDocumentCount },
    { key: 'surveys', label: 'Surveys', icon: ClipboardList, count: assignedSurveyCount },
    { key: 'workshops', label: 'Workshops', icon: Calendar, count: cohortSessions.length },
  ]

  return (
    <div className="space-y-6 animate-page-enter">
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

      {/* Credential card modal */}
      {credCard && (
        <CredentialCardModal
          isOpen
          onClose={() => setCredCard(null)}
          userId={credCard.id}
          userName={credCard.name}
          email={credCard.email}
          temporaryPassword={credCard.password}
        />
      )}

      {/* Breadcrumb */}
      <Link
        href="/super-admin/cohorts"
        className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Cohorts
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <UsersRound className="h-6 w-6 text-emerald-600" />
            {cohort.name}
            {cohort.lifecycleStatus === 'ARCHIVED' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium">
                Archived
              </span>
            )}
            {!cohort.active && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 font-medium">
                Inactive
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Created {new Date(cohort.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            {cohort.archivedAt && (
              <> · Archived {new Date(cohort.archivedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleArchive}
            disabled={archiveBusy}
            className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50"
            title={cohort.lifecycleStatus === 'ARCHIVED' ? 'Reactivate this cohort' : 'Archive this cohort'}
          >
            {cohort.lifecycleStatus === 'ARCHIVED' ? (
              <>
                <ArchiveRestore className="h-4 w-4" />
                Reactivate
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" />
                Archive
              </>
            )}
          </button>
          {cohort.lifecycleStatus === 'ACTIVE' && (
            <Link
              href={`/super-admin/sessions/new`}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Calendar className="h-4 w-4" />
              Create Workshop
            </Link>
          )}
        </div>
      </div>

      {/* Invite link panel — only for active cohorts */}
      {cohort.lifecycleStatus === 'ACTIVE' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4 mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Link2 className="h-4 w-4 text-emerald-600" />
                Invite link
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Share this link to let people sign up and join this cohort. New users get the Workshop Participant role.
              </p>
            </div>
            {invite?.code && (
              <button
                onClick={() => handleToggleInvite(!invite.enabled)}
                disabled={inviteBusy}
                className={clsx(
                  'text-xs px-2.5 py-1 rounded-full font-medium transition disabled:opacity-50',
                  invite.enabled
                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                )}
              >
                {invite.enabled ? 'Enabled' : 'Disabled — click to enable'}
              </button>
            )}
          </div>

          {invite?.code ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/join/${invite.code}`}
                className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm font-mono bg-calm-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={copyInviteLink}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <Copy className="h-4 w-4" />
                {inviteCopied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={handleGenerateInvite}
                disabled={inviteBusy}
                className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50"
                title="Generate a new code (the old link stops working)"
              >
                <RefreshCw className={clsx('h-4 w-4', inviteBusy && 'animate-spin')} />
                Regenerate
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerateInvite}
              disabled={inviteBusy}
              className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <Link2 className="h-4 w-4" />
              {inviteBusy ? 'Generating…' : 'Generate invite link'}
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-calm-200 dark:border-slate-700 overflow-x-auto">
        <nav className="flex gap-0.5 -mb-px min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  activeTab === tab.key
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={clsx(
                    'text-xs px-1.5 py-0.5 rounded-full font-medium',
                    activeTab === tab.key
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab: Members */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {/* Actions bar */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {cohort._count.users} {cohort._count.users === 1 ? 'member' : 'members'} in this cohort
            </p>
            <div className="flex gap-2">
              <label className="btn-secondary flex items-center gap-2 text-sm cursor-pointer">
                <Upload className="h-4 w-4" />
                Import CSV
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleBulkCsv}
                />
              </label>
              <button
                onClick={() => setShowAddMember(!showAddMember)}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <UserPlus className="h-4 w-4" />
                Add Member
              </button>
            </div>
          </div>

          {/* Bulk results download */}
          {bulkResults && bulkResults.length > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                  {bulkResults.length} accounts created
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                  Download the credentials CSV to hand out to participants.
                </p>
              </div>
              <button
                onClick={downloadBulkCredentials}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition"
              >
                <Download className="h-4 w-4" />
                Download Credentials
              </button>
            </div>
          )}

          {/* CSV format hint */}
          <div className="text-xs text-slate-400 dark:text-slate-500 bg-calm-50 dark:bg-slate-800/50 rounded-lg p-3 border border-calm-100 dark:border-slate-700">
            CSV format: <code className="font-mono">name,email</code> — one row per participant. Headers optional. Passwords are auto-generated.
          </div>

          {/* Add member form */}
          {showAddMember && (
            <form
              onSubmit={handleAddMember}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-5 shadow-sm space-y-4"
            >
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-emerald-600" />
                Add Member
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    placeholder="Full name"
                    className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Temporary Password *</label>
                  <input
                    type="text"
                    required
                    value={memberPassword}
                    onChange={(e) => setMemberPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Role</label>
                  <select
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100"
                  >
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingMember}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  {addingMember ? 'Adding…' : 'Add & Show Credentials'}
                </button>
              </div>
            </form>
          )}

          {/* Members list */}
          {cohort.users.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-10 text-center shadow-sm">
              <Users className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No members yet. Add individuals or import a CSV.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-calm-100 dark:border-slate-700 bg-calm-50 dark:bg-slate-900/30">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Name</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Email</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Role</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {cohort.users.map((member, i) => (
                    <tr
                      key={member.id}
                      className={clsx(
                        'border-b border-calm-100 dark:border-slate-700 last:border-0',
                        i % 2 === 0 ? '' : 'bg-calm-50/30 dark:bg-slate-900/10'
                      )}
                    >
                      <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {member.name || '—'}
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs">
                        {member.email}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium">
                          {ROLE_LABELS[member.role] ?? member.role}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {member.mustChangePassword ? (
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Awaiting first login</span>
                        ) : (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Active</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <SendInviteButton userId={member.id} userEmail={member.email} compact />
                          <button
                            onClick={() => handleRemoveMember(member.id, member.name ?? member.email)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                            title="Remove from cohort"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Training */}
      {activeTab === 'training' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Training programs accessible to cohort members.
            </p>
            {!editingPrograms ? (
              <button onClick={() => setEditingPrograms(true)} className="btn-secondary text-sm">
                Edit Programs
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditingPrograms(false); setSelectedProgramIds(cohort.allowedProgramIds) }}
                  className="px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePrograms}
                  disabled={savingPrograms}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  {savingPrograms ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {programs.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-10 text-center shadow-sm">
              <BookOpen className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No approved training programs available.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {programs.map((program) => {
                const isAssigned = selectedProgramIds.includes(program.id)
                return (
                  <div
                    key={program.id}
                    className={clsx(
                      'flex items-center justify-between p-4 rounded-xl border transition',
                      editingPrograms ? 'cursor-pointer' : '',
                      isAssigned
                        ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700'
                        : 'border-calm-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                    )}
                    onClick={editingPrograms ? () => {
                      setSelectedProgramIds((prev) =>
                        prev.includes(program.id) ? prev.filter((id) => id !== program.id) : [...prev, program.id]
                      )
                    } : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className={clsx('h-5 w-5', isAssigned ? 'text-emerald-600' : 'text-slate-400')} />
                      <span className={clsx('font-medium text-sm', isAssigned ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400')}>
                        {program.name}
                      </span>
                    </div>
                    {editingPrograms && (
                      <input
                        type="checkbox"
                        className="rounded accent-emerald-600"
                        checked={isAssigned}
                        onChange={() => {}}
                        readOnly
                      />
                    )}
                    {!editingPrograms && isAssigned && (
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Documents */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Select which document collections are visible to this cohort.
            </p>
            {!editingDocuments ? (
              <button onClick={() => setEditingDocuments(true)} className="btn-secondary text-sm">
                Edit Documents
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingDocuments(false)
                    setSelectedDocumentIds(documents.filter((d) => d.assigned).map((d) => d.id))
                  }}
                  className="px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDocuments}
                  disabled={savingDocuments}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  {savingDocuments ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {documents.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-10 text-center shadow-sm">
              <FolderOpen className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No document collections exist yet.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Create collections in <Link href="/super-admin/library" className="text-emerald-600 hover:underline">Document Library</Link>.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => {
                const isAssigned = selectedDocumentIds.includes(doc.id)
                return (
                  <div
                    key={doc.id}
                    className={clsx(
                      'flex items-center justify-between gap-4 p-4 rounded-xl border transition',
                      editingDocuments ? 'cursor-pointer' : '',
                      isAssigned
                        ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700'
                        : 'border-calm-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                    )}
                    onClick={editingDocuments ? () => {
                      setSelectedDocumentIds((prev) =>
                        prev.includes(doc.id) ? prev.filter((id) => id !== doc.id) : [...prev, doc.id]
                      )
                    } : undefined}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FolderOpen className={clsx('h-5 w-5 flex-shrink-0', isAssigned ? 'text-emerald-600' : 'text-slate-400')} />
                      <div className="min-w-0">
                        <p className={clsx('font-medium text-sm truncate', isAssigned ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400')}>
                          {doc.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {doc.description} · {doc.documentCount} {doc.documentCount === 1 ? 'document' : 'documents'}
                        </p>
                      </div>
                    </div>
                    {editingDocuments ? (
                      <input
                        type="checkbox"
                        className="rounded accent-emerald-600 flex-shrink-0"
                        checked={isAssigned}
                        onChange={() => {}}
                        readOnly
                      />
                    ) : isAssigned ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Surveys */}
      {activeTab === 'surveys' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Select which surveys are sent to this cohort.
            </p>
            {!editingSurveys ? (
              <button onClick={() => setEditingSurveys(true)} className="btn-secondary text-sm">
                Edit Surveys
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingSurveys(false)
                    setSelectedSurveyIds(surveys.filter((s) => s.assigned).map((s) => s.id))
                  }}
                  className="px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSurveys}
                  disabled={savingSurveys}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  {savingSurveys ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {surveys.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-10 text-center shadow-sm">
              <ClipboardList className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No surveys available.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Create surveys in <Link href="/super-admin/surveys" className="text-emerald-600 hover:underline">Surveys</Link>.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {surveys.map((sv) => {
                const isAssigned = selectedSurveyIds.includes(sv.id)
                return (
                  <div
                    key={sv.id}
                    className={clsx(
                      'flex items-center justify-between gap-4 p-4 rounded-xl border transition',
                      editingSurveys ? 'cursor-pointer' : '',
                      isAssigned
                        ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700'
                        : 'border-calm-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                    )}
                    onClick={editingSurveys ? () => {
                      setSelectedSurveyIds((prev) =>
                        prev.includes(sv.id) ? prev.filter((id) => id !== sv.id) : [...prev, sv.id]
                      )
                    } : undefined}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ClipboardList className={clsx('h-5 w-5 flex-shrink-0', isAssigned ? 'text-emerald-600' : 'text-slate-400')} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={clsx('font-medium text-sm truncate', isAssigned ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400')}>
                            {sv.title}
                          </p>
                          <span className={clsx(
                            'text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0',
                            sv.status === 'PUBLISHED'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                          )}>
                            {sv.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {sv.questionCount} {sv.questionCount === 1 ? 'question' : 'questions'}
                          {sv.description ? ` · ${sv.description}` : ''}
                        </p>
                      </div>
                    </div>
                    {editingSurveys ? (
                      <input
                        type="checkbox"
                        className="rounded accent-emerald-600 flex-shrink-0"
                        checked={isAssigned}
                        onChange={() => {}}
                        readOnly
                      />
                    ) : isAssigned ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Workshops */}
      {activeTab === 'workshops' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Workshops created for all organisations (include cohorts when targeting). Create a new workshop and select this cohort as an attendee group.
            </p>
            <Link
              href="/super-admin/sessions/new"
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Plus className="h-4 w-4" />
              Create Workshop
            </Link>
          </div>

          {cohortSessions.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-10 text-center shadow-sm">
              <Calendar className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No workshops yet.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Create a workshop and select this cohort's members as attendees.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {cohortSessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/super-admin/sessions/${s.id}`}
                  className="flex items-center justify-between p-4 rounded-xl border border-calm-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:bg-calm-50 dark:hover:bg-slate-700 transition"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{s.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(s.scheduledAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        {' · '}
                        {PLATFORM_LABELS[s.platform] ?? s.platform}
                      </p>
                    </div>
                  </div>
                  <span className={clsx(
                    'text-xs px-2 py-0.5 rounded-full font-medium',
                    s.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                    s.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                    s.status === 'CANCELLED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                  )}>
                    {s.status.charAt(0) + s.status.slice(1).toLowerCase().replace('_', ' ')}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
