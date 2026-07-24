'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Building2,
  Users,
  RefreshCw,
  ShieldCheck,
  FolderOpen,
  ClipboardList,
  ChevronDown,
  Pencil,
  Mail,
  Phone,
  MapPin,
  ClipboardCheck,
} from 'lucide-react'
import { clsx } from 'clsx'
import { LEAF_ROLES } from '@/types'
import { ORG_TYPES, ORG_TYPE_LABELS } from '@/lib/rbac'
import { CredentialCardModal } from '@/components/ui/credential-card-modal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrgUser {
  id: string
  name: string | null
  email: string
  role: string
  active: boolean
  mustChangePassword: boolean
  ssoOnly: boolean
  allowedProgramIds: string[]
  cvBuilderEnabled: boolean | null
  careersAdvisorEnabled: boolean | null
  surveyIds: string[]
  createdAt: string
  _count: { trainingProgress: number }
}

interface AvailableSurvey {
  id: string
  title: string
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED'
}

const SYSTEM_ORG_ROLES = ['LEARNER'] as const

interface ChildOrgSummary {
  id: string
  name: string
  active: boolean
}

interface ParentOrgSummary {
  id: string
  name: string
}

const SYSTEM_ORG_SLUG = 'independent-learners'

interface OrgDetail {
  id: string
  name: string
  slug: string
  active: boolean
  allowedRoles: string[]
  allowedProgramIds: string[]
  isParentOrg: boolean
  orgType?: string
  parentOrgId: string | null
  inheritSettings: boolean
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  county: string | null
  postcode: string | null
  country: string
  users: OrgUser[]
  _count: { users: number }
  assignedCollectionIds: string[]
  assignedSurveyIds: string[]
  availableSurveys: AvailableSurvey[]
  cvBuilderEnabled: boolean
  careersAdvisorEnabled: boolean
  organisationType: string
  childOrgs: ChildOrgSummary[]
  parentOrg: ParentOrgSummary | null
}

interface ProgramSummary {
  id: string
  name: string
  active: boolean
  _count: { modules: number }
}

interface CollectionSummary {
  id: string
  title: string
  active: boolean
  _count: { documents: number }
}

interface SurveySummary {
  id: string
  title: string
  status: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  ORG_ADMIN: 'Org Admin',
  CAREGIVER: 'Practitioner',
  FAMILY_CARER: 'Parent/Friend/Relative/Carer',
  CAREER_DEV_OFFICER: 'Careers Professional',
  STUDENT: 'Student',
  INTERN: 'Intern',
  EMPLOYEE: 'Employee',
  PARTICIPANT: 'Workshop Participant',
}

const ROLE_COLORS: Record<string, string> = {
  ORG_ADMIN: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  CAREGIVER: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  CAREER_DEV_OFFICER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  STUDENT: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  INTERN: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
  EMPLOYEE: 'bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-200',
  PARTICIPANT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrgDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orgId = params.orgId as string

  // Data
  const [org, setOrg] = useState<OrgDetail | null>(null)
  const [programs, setPrograms] = useState<ProgramSummary[]>([])
  const [collections, setCollections] = useState<CollectionSummary[]>([])
  const [surveys, setSurveys] = useState<SurveySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Edit form state (mirrors org data)
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editRoles, setEditRoles] = useState<string[]>([])
  const [editProgramIds, setEditProgramIds] = useState<string[]>([])
  const [editActive, setEditActive] = useState(true)
  const [editContactName, setEditContactName] = useState('')
  const [editContactEmail, setEditContactEmail] = useState('')
  const [editContactPhone, setEditContactPhone] = useState('')
  const [editAddress1, setEditAddress1] = useState('')
  const [editAddress2, setEditAddress2] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editCounty, setEditCounty] = useState('')
  const [editPostcode, setEditPostcode] = useState('')
  const [editCountry, setEditCountry] = useState('United Kingdom')
  const [editCollectionIds, setEditCollectionIds] = useState<string[]>([])
  const [editSurveyIds, setEditSurveyIds] = useState<string[]>([])
  const [editCvBuilder, setEditCvBuilder] = useState(true)
  const [editCareersAdvisor, setEditCareersAdvisor] = useState(true)
  const [editOrgType, setEditOrgType] = useState<string>('SCHOOL')
  const [editIsParentOrg, setEditIsParentOrg] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Add org admin form
  const [showAdminForm, setShowAdminForm] = useState(false)
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminRole, setAdminRole] = useState<typeof SYSTEM_ORG_ROLES[number]>('LEARNER')
  const [adminProgramIds, setAdminProgramIds] = useState<string[]>([])
  const [adminCvBuilder, setAdminCvBuilder] = useState(false)
  const [adminCareersAdvisor, setAdminCareersAdvisor] = useState(false)
  const [adminSurveyIds, setAdminSurveyIds] = useState<string[]>([])
  const [credentialCard, setCredentialCard] = useState<{
    id: string; name: string; email: string; password: string
  } | null>(null)
  const [adminSubmitting, setAdminSubmitting] = useState(false)

  // Inline edit state for system-org users (one row at a time)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editUserName, setEditUserName] = useState('')
  const [editUserRole, setEditUserRole] = useState<typeof SYSTEM_ORG_ROLES[number]>('LEARNER')
  const [editUserActive, setEditUserActive] = useState(true)
  const [editUserProgramIds, setEditUserProgramIds] = useState<string[]>([])
  const [editUserCvBuilder, setEditUserCvBuilder] = useState(false)
  const [editUserCareersAdvisor, setEditUserCareersAdvisor] = useState(false)
  const [editUserSurveyIds, setEditUserSurveyIds] = useState<string[]>([])
  const [editUserSaving, setEditUserSaving] = useState(false)

  // Delete
  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchOrg = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/super-admin/organisations/${orgId}`)
      if (res.status === 404) { setNotFound(true); return }
      if (res.ok) {
        const data: OrgDetail = await res.json()
        setOrg(data)
        setEditName(data.name)
        setEditSlug(data.slug)
        setEditRoles(data.allowedRoles)
        setEditProgramIds(data.allowedProgramIds)
        setEditActive(data.active)
        setEditContactName(data.contactName || '')
        setEditContactEmail(data.contactEmail || '')
        setEditContactPhone(data.contactPhone || '')
        setEditAddress1(data.addressLine1 || '')
        setEditAddress2(data.addressLine2 || '')
        setEditCity(data.city || '')
        setEditCounty(data.county || '')
        setEditPostcode(data.postcode || '')
        setEditCountry(data.country || 'United Kingdom')
        setEditCollectionIds(data.assignedCollectionIds || [])
        setEditSurveyIds(data.assignedSurveyIds || [])
        setEditCvBuilder(data.cvBuilderEnabled ?? true)
        setEditCareersAdvisor(data.careersAdvisorEnabled ?? true)
        setEditOrgType(data.organisationType ?? 'SCHOOL')
        setEditIsParentOrg(data.isParentOrg ?? false)
      }
    } finally {
      setLoading(false)
    }
  }, [orgId])

  // Fetch programs, collections, and surveys
  useEffect(() => {
    fetch('/api/super-admin/training/programs')
      .then((r) => r.json())
      .then((data: ProgramSummary[]) => setPrograms(data))
      .catch(() => {})
    fetch('/api/super-admin/library')
      .then((r) => r.json())
      .then((data: CollectionSummary[]) => setCollections(data))
      .catch(() => {})
    fetch('/api/super-admin/surveys')
      .then((r) => r.json())
      .then((data: SurveySummary[]) => setSurveys(data))
      .catch(() => {})
  }, [])

  useEffect(() => { fetchOrg() }, [fetchOrg])

  // ── Toast ──────────────────────────────────────────────────────────────────

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Edit helpers ───────────────────────────────────────────────────────────

  function cancelEdit() {
    if (!org) return
    setEditName(org.name)
    setEditSlug(org.slug)
    setEditRoles(org.allowedRoles)
    setEditProgramIds(org.allowedProgramIds)
    setEditActive(org.active)
    setEditContactName(org.contactName || '')
    setEditContactEmail(org.contactEmail || '')
    setEditContactPhone(org.contactPhone || '')
    setEditAddress1(org.addressLine1 || '')
    setEditAddress2(org.addressLine2 || '')
    setEditCity(org.city || '')
    setEditCounty(org.county || '')
    setEditPostcode(org.postcode || '')
    setEditCountry(org.country || 'United Kingdom')
    setEditCollectionIds(org.assignedCollectionIds || [])
    setEditSurveyIds(org.assignedSurveyIds || [])
    setEditCvBuilder(org.cvBuilderEnabled ?? true)
    setEditCareersAdvisor(org.careersAdvisorEnabled ?? true)
    setEditOrgType(org.organisationType ?? 'SCHOOL')
    setEditIsParentOrg(org.isParentOrg ?? false)
    setIsEditing(false)
  }

  function toggleRole(role: string) {
    setEditRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }

  function toggleProgram(programId: string) {
    setEditProgramIds((prev) =>
      prev.includes(programId) ? prev.filter((id) => id !== programId) : [...prev, programId]
    )
  }

  function toggleCollection(collectionId: string) {
    setEditCollectionIds((prev) =>
      prev.includes(collectionId) ? prev.filter((id) => id !== collectionId) : [...prev, collectionId]
    )
  }

  function toggleSurvey(surveyId: string) {
    setEditSurveyIds((prev) =>
      prev.includes(surveyId) ? prev.filter((id) => id !== surveyId) : [...prev, surveyId]
    )
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/super-admin/organisations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          slug: editSlug,
          allowedRoles: editRoles,
          allowedProgramIds: editProgramIds,
          active: editActive,
          contactName: editContactName || undefined,
          contactEmail: editContactEmail || undefined,
          contactPhone: editContactPhone || undefined,
          addressLine1: editAddress1 || undefined,
          addressLine2: editAddress2 || undefined,
          city: editCity || undefined,
          county: editCounty || undefined,
          postcode: editPostcode || undefined,
          country: editCountry || undefined,
          assignedCollectionIds: editCollectionIds,
          assignedSurveyIds: editSurveyIds,
          cvBuilderEnabled: editCvBuilder,
          careersAdvisorEnabled: editCareersAdvisor,
          organisationType: editOrgType,
          isParentOrg: editIsParentOrg,
        }),
      })
      if (res.ok) {
        showToast('Organisation saved.', 'success')
        setIsEditing(false)
        fetchOrg()
      } else {
        const d = await res.json()
        showToast(d.error || 'Save failed.', 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  // ── Add admin ──────────────────────────────────────────────────────────────

  async function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault()
    setAdminSubmitting(true)
    const isSystem = org?.slug === SYSTEM_ORG_SLUG
    try {
      const res = await fetch(`/api/super-admin/organisations/${orgId}/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: adminName,
          email: adminEmail,
          password: adminPassword,
          ...(isSystem ? {
            role: adminRole,
            allowedProgramIds: adminProgramIds,
            cvBuilderEnabled: adminCvBuilder,
            careersAdvisorEnabled: adminCareersAdvisor,
            surveyIds: adminSurveyIds,
          } : {}),
        }),
      })
      if (res.ok) {
        const created = await res.json()
        setCredentialCard({
          id: created.id,
          name: adminName,
          email: adminEmail,
          password: adminPassword,
        })
        showToast(isSystem ? 'User created.' : 'Org admin created.', 'success')
        setShowAdminForm(false)
        setAdminName('')
        setAdminEmail('')
        setAdminPassword('')
        setAdminRole('LEARNER')
        setAdminProgramIds([])
        setAdminCvBuilder(false)
        setAdminCareersAdvisor(false)
        setAdminSurveyIds([])
        fetchOrg()
      } else {
        const d = await res.json()
        showToast(d.error || `Failed to create ${isSystem ? 'user' : 'admin'}.`, 'error')
      }
    } finally {
      setAdminSubmitting(false)
    }
  }

  // ── Edit user (system org only) ────────────────────────────────────────────

  function startEditUser(u: OrgUser) {
    setEditingUserId(u.id)
    setEditUserName(u.name ?? '')
    setEditUserRole(
      (SYSTEM_ORG_ROLES as readonly string[]).includes(u.role)
        ? (u.role as typeof SYSTEM_ORG_ROLES[number])
        : 'LEARNER'
    )
    setEditUserActive(u.active)
    setEditUserProgramIds(u.allowedProgramIds ?? [])
    // null override means "inherit org default"; for simplicity we treat that as off
    setEditUserCvBuilder(u.cvBuilderEnabled ?? false)
    setEditUserCareersAdvisor(u.careersAdvisorEnabled ?? false)
    setEditUserSurveyIds(u.surveyIds ?? [])
  }

  function cancelEditUser() {
    setEditingUserId(null)
  }

  async function handleSaveUser(userId: string) {
    setEditUserSaving(true)
    try {
      const res = await fetch(`/api/super-admin/organisations/${orgId}/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editUserName.trim(),
          role: editUserRole,
          active: editUserActive,
          allowedProgramIds: editUserProgramIds,
          cvBuilderEnabled: editUserCvBuilder,
          careersAdvisorEnabled: editUserCareersAdvisor,
          surveyIds: editUserSurveyIds,
        }),
      })
      if (res.ok) {
        showToast('User updated.', 'success')
        setEditingUserId(null)
        fetchOrg()
      } else {
        const d = await res.json()
        showToast(d.error || 'Failed to update user.', 'error')
      }
    } finally {
      setEditUserSaving(false)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!org) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/super-admin/organisations/${orgId}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/super-admin/organisations')
      } else {
        const d = await res.json()
        showToast(d.error || 'Delete failed.', 'error')
      }
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
      setDeleteConfirmText('')
    }
  }

  // ── Render states ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-24 text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading...
      </div>
    )
  }

  if (notFound || !org) {
    return (
      <div className="max-w-4xl mx-auto py-24 text-center text-slate-400">
        <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Organisation not found.</p>
        <Link href="/super-admin/organisations" className="text-primary-600 hover:underline text-sm mt-2 inline-block">
          Back to organisations
        </Link>
      </div>
    )
  }

  // Only show active programs in the toggle list
  const activePrograms = programs.filter((p) => p.active)

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-page-enter">

      {/* Toast */}
      {toast && (
        <div
          className={clsx(
            'fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2',
            toast.type === 'success' ? 'bg-sage-600 text-white' : 'bg-red-600 text-white'
          )}
        >
          {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      {/* Back link + header */}
      <div>
        <Link
          href="/super-admin/organisations"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Organisations
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary-600" />
              {org.name}
              {org.slug === SYSTEM_ORG_SLUG && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  System
                </span>
              )}
            </h1>
            <p className="text-slate-500 mt-1 font-mono text-sm">{org.slug}</p>
            {org.slug === SYSTEM_ORG_SLUG && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-prose">
                System-managed catch-all for unaffiliated learners (workshop participants, individual signups).
                You can target this org with libraries, surveys, and announcements, but its name, slug, type and
                membership rules are read-only.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={clsx(
                'inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full',
                org.active ? 'bg-sage-100 text-sage-700' : 'bg-red-100 text-red-700'
              )}
            >
              {org.active ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {org.active ? 'Active' : 'Inactive'}
            </span>
            <button
              onClick={fetchOrg}
              className="p-2 rounded-xl border border-calm-200 hover:bg-calm-50 transition-colors text-slate-500"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Organisation Details (view / edit) */}
      <div className="card space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Organisation Details</h2>
          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border border-primary-200 text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          )}
        </div>

        {!isEditing ? (
          <OrgDetailsView
            org={org}
            programs={programs}
            collections={collections}
            surveys={surveys}
          />
        ) : (
        <form onSubmit={handleSave} className="space-y-5">

          {/* Name + Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Name</label>
              <input
                className="input w-full"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">URL Identifier</label>
              <input
                className="input w-full font-mono text-sm"
                type="text"
                value={editSlug}
                onChange={(e) => setEditSlug(e.target.value)}
                required
                pattern="[a-z0-9-]+"
                title="Lowercase letters, numbers, and hyphens only"
              />
            </div>
          </div>

          {/* Primary Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Contact Name</label>
              <input className="input w-full" type="text" value={editContactName} onChange={(e) => setEditContactName(e.target.value)} placeholder="e.g. Jane Smith" />
            </div>
            <div>
              <label className="label">Contact Email</label>
              <input className="input w-full" type="email" value={editContactEmail} onChange={(e) => setEditContactEmail(e.target.value)} placeholder="e.g. jane@example.com" />
            </div>
            <div>
              <label className="label">Contact Phone</label>
              <input className="input w-full" type="tel" value={editContactPhone} onChange={(e) => setEditContactPhone(e.target.value)} placeholder="e.g. 07700 123456" />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="label">Address Line 1</label>
            <input className="input w-full" type="text" value={editAddress1} onChange={(e) => setEditAddress1(e.target.value)} placeholder="e.g. 10 High Street" />
          </div>
          <div>
            <label className="label">Address Line 2</label>
            <input className="input w-full" type="text" value={editAddress2} onChange={(e) => setEditAddress2(e.target.value)} placeholder="Optional" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">City / Town</label>
              <input className="input w-full" type="text" value={editCity} onChange={(e) => setEditCity(e.target.value)} placeholder="e.g. London" />
            </div>
            <div>
              <label className="label">County</label>
              <input className="input w-full" type="text" value={editCounty} onChange={(e) => setEditCounty(e.target.value)} placeholder="e.g. Hertfordshire" />
            </div>
            <div>
              <label className="label">Postcode</label>
              <input className="input w-full" type="text" value={editPostcode} onChange={(e) => setEditPostcode(e.target.value)} placeholder="e.g. AL5 2QP" />
            </div>
          </div>
          <div>
            <label className="label">Country</label>
            <input className="input w-full" type="text" value={editCountry} onChange={(e) => setEditCountry(e.target.value)} />
          </div>

          {/* Allowed Roles */}
          <div>
            <label className="label mb-2 block">Allowed Roles</label>
            <div className="flex flex-wrap gap-3">
              {LEAF_ROLES.map((role) => (
                <label key={role} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editRoles.includes(role)}
                    onChange={() => toggleRole(role)}
                    className="rounded border-calm-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-700">{ROLE_LABELS[role] ?? role}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Organisation type */}
          <div>
            <label className="label mb-1 block">Organisation Type</label>
            <p className="text-xs text-slate-400 mb-2">Determines the default role assigned to self-registered users.</p>
            <div className="relative w-full sm:w-64">
              <select
                value={editOrgType}
                onChange={(e) => setEditOrgType(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg border border-calm-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white dark:bg-slate-700 dark:border-slate-600 text-slate-700 dark:text-slate-200"
              >
                {ORG_TYPES.map((t) => (
                  <option key={t} value={t}>{ORG_TYPE_LABELS[t]}</option>
                ))}
                {/* Show legacy values if the org still has one */}
                {editOrgType === 'EDUCATION' && <option value="EDUCATION">Education (legacy)</option>}
                {editOrgType === 'BUSINESS' && <option value="BUSINESS">Business (legacy)</option>}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Features */}
          <div>
            <label className="label mb-2 block">Features</label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editCvBuilder}
                onChange={(e) => setEditCvBuilder(e.target.checked)}
                className="rounded border-calm-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">CV Builder</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editCareersAdvisor}
                onChange={(e) => setEditCareersAdvisor(e.target.checked)}
                className="rounded border-calm-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Careers Advisor</span>
            </label>
          </div>

          {/* Training Programs */}
          <div>
            <label className="label mb-2 block">Training Programs</label>
            <div className="space-y-2">
              {activePrograms.length === 0 ? (
                <p className="text-sm text-slate-400">No active training programs available.</p>
              ) : (
                activePrograms.map((program) => {
                  const isEnabled = editProgramIds.includes(program.id)
                  return (
                    <button
                      key={program.id}
                      type="button"
                      onClick={() => toggleProgram(program.id)}
                      className={clsx(
                        'flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium border transition-colors text-left',
                        isEnabled
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700'
                          : 'bg-white text-slate-500 border-calm-200 hover:border-emerald-300 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600'
                      )}
                    >
                      {isEnabled
                        ? <CheckCircle className="h-4 w-4 flex-shrink-0" />
                        : <div className="h-4 w-4 rounded-full border-2 border-slate-300 flex-shrink-0" />}
                      <div>
                        <p className="font-bold">{program.name}</p>
                        <p className="text-xs opacity-75">
                          {program._count.modules} {program._count.modules === 1 ? 'module' : 'modules'}
                        </p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Document Collections */}
          <div>
            <label className="label mb-2 block flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-emerald-600" />
              Document Collections
            </label>
            <p className="text-xs text-slate-400 mb-2">
              Select which document collections are available to this organisation. Unassigned collections with no org filter are visible to all.
            </p>
            <div className="space-y-2">
              {collections.filter((c) => c.active).length === 0 ? (
                <p className="text-sm text-slate-400">No document collections available.</p>
              ) : (
                collections.filter((c) => c.active).map((col) => {
                  const isEnabled = editCollectionIds.includes(col.id)
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => toggleCollection(col.id)}
                      className={clsx(
                        'flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium border transition-colors text-left',
                        isEnabled
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700'
                          : 'bg-white text-slate-500 border-calm-200 hover:border-emerald-300 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600'
                      )}
                    >
                      {isEnabled
                        ? <CheckCircle className="h-4 w-4 flex-shrink-0" />
                        : <div className="h-4 w-4 rounded-full border-2 border-slate-300 flex-shrink-0" />}
                      <div>
                        <p className="font-bold">{col.title}</p>
                        <p className="text-xs opacity-75">
                          {col._count.documents} {col._count.documents === 1 ? 'document' : 'documents'}
                        </p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Surveys */}
          <div>
            <label className="label mb-2 block flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-blue-600" />
              Surveys
            </label>
            <p className="text-xs text-slate-400 mb-2">
              Select which surveys are assigned to this organisation.
            </p>
            <div className="space-y-2">
              {surveys.filter((s) => s.status !== 'DRAFT').length === 0 ? (
                <p className="text-sm text-slate-400">No published surveys available.</p>
              ) : (
                surveys.filter((s) => s.status !== 'DRAFT').map((survey) => {
                  const isEnabled = editSurveyIds.includes(survey.id)
                  return (
                    <button
                      key={survey.id}
                      type="button"
                      onClick={() => toggleSurvey(survey.id)}
                      className={clsx(
                        'flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium border transition-colors text-left',
                        isEnabled
                          ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700'
                          : 'bg-white text-slate-500 border-calm-200 hover:border-blue-300 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600'
                      )}
                    >
                      {isEnabled
                        ? <CheckCircle className="h-4 w-4 flex-shrink-0" />
                        : <div className="h-4 w-4 rounded-full border-2 border-slate-300 flex-shrink-0" />}
                      <div>
                        <p className="font-bold">{survey.title}</p>
                        <p className="text-xs opacity-75">
                          {survey.status === 'PUBLISHED' ? 'Active' : survey.status === 'CLOSED' ? 'Closed' : survey.status}
                        </p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Active toggle */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
                className="rounded border-calm-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-slate-700">Active</span>
            </label>
          </div>

          {/* Parent org toggle */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={editIsParentOrg}
                onChange={(e) => setEditIsParentOrg(e.target.checked)}
                className="rounded border-calm-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-slate-700">Parent Organisation</span>
            </label>
            <p className="text-xs text-slate-400 mt-1 ml-7">Enable if this organisation will have child organisations underneath it.</p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={cancelEdit}
              className="px-4 py-2 rounded-xl border border-calm-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
        )}
      </div>

      {/* Hierarchy section */}
      {(org.parentOrg || (org.isParentOrg && org.childOrgs.length > 0)) && (
        <div className="card space-y-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary-600" />
            Hierarchy
          </h2>

          {org.parentOrg && (
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Parent Organisation</p>
              <Link
                href={`/super-admin/organisations/${org.parentOrg.id}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                <Building2 className="h-4 w-4" />
                {org.parentOrg.name}
              </Link>
            </div>
          )}

          {org.isParentOrg && org.childOrgs.length > 0 && (
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                Child Organisations ({org.childOrgs.length})
              </p>
              <div className="space-y-1.5">
                {org.childOrgs.map((child) => (
                  <div key={child.id} className="flex items-center gap-2">
                    <Link
                      href={`/super-admin/organisations/${child.id}`}
                      className="text-sm font-medium text-primary-600 hover:text-primary-700"
                    >
                      {child.name}
                    </Link>
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                        child.active
                          ? 'bg-sage-100 text-sage-700 dark:bg-sage-900/40 dark:text-sage-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                      )}
                    >
                      {child.active ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {child.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Users table */}
      <div className="card overflow-hidden p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-calm-200">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary-600" />
            Users
            <span className="text-xs font-normal text-slate-400 ml-1">({org._count.users})</span>
          </h2>
          <button
            onClick={() => setShowAdminForm((v) => !v)}
            className={clsx(
              'inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition-colors',
              showAdminForm
                ? 'border-calm-200 text-slate-600 bg-calm-50 hover:bg-calm-100'
                : 'border-primary-200 text-primary-700 bg-primary-50 hover:bg-primary-100'
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            {showAdminForm
              ? 'Cancel'
              : org.slug === SYSTEM_ORG_SLUG
                ? 'Add User'
                : 'Add Org Admin'}
          </button>
        </div>

        {/* Add admin inline form */}
        {showAdminForm && (
          <div className="px-4 py-4 border-b border-calm-200 bg-primary-50">
            <p className="text-sm font-medium text-primary-800 mb-3">
              {org.slug === SYSTEM_ORG_SLUG ? 'New User' : 'New Org Admin'}
            </p>
            <form onSubmit={handleAddAdmin} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label text-xs">Name</label>
                <input
                  className="input w-full text-sm"
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  required
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="label text-xs">Email</label>
                <input
                  className="input w-full text-sm"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="label text-xs">Temporary Password</label>
                <input
                  className="input w-full text-sm"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Min 8 characters"
                />
              </div>

              {org.slug === SYSTEM_ORG_SLUG && (
                <>
                  <div className="sm:col-span-3">
                    <label className="label text-xs">Role</label>
                    <select
                      className="input w-full text-sm"
                      value={adminRole}
                      onChange={(e) => setAdminRole(e.target.value as typeof SYSTEM_ORG_ROLES[number])}
                    >
                      {SYSTEM_ORG_ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="label text-xs">
                      Training programs <span className="text-slate-400">(none = no training access)</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto rounded-lg border border-calm-200 bg-white p-2">
                      {programs.length === 0 ? (
                        <p className="text-xs text-slate-400 italic px-2 py-1">No active programs.</p>
                      ) : (
                        programs.map((p) => (
                          <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer px-2 py-1 rounded hover:bg-calm-50">
                            <input
                              type="checkbox"
                              checked={adminProgramIds.includes(p.id)}
                              onChange={() => setAdminProgramIds((prev) =>
                                prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]
                              )}
                              className="accent-primary-600"
                            />
                            <span className="text-slate-700 truncate">{p.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 text-xs cursor-pointer px-3 py-2 rounded-lg border border-calm-200 bg-white hover:bg-calm-50">
                      <input
                        type="checkbox"
                        checked={adminCvBuilder}
                        onChange={(e) => setAdminCvBuilder(e.target.checked)}
                        className="accent-primary-600"
                      />
                      <span className="text-slate-700 font-medium">CV Builder</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer px-3 py-2 rounded-lg border border-calm-200 bg-white hover:bg-calm-50">
                      <input
                        type="checkbox"
                        checked={adminCareersAdvisor}
                        onChange={(e) => setAdminCareersAdvisor(e.target.checked)}
                        className="accent-primary-600"
                      />
                      <span className="text-slate-700 font-medium">Careers Advisor</span>
                    </label>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="label text-xs">
                      Surveys assigned to this user <span className="text-slate-400">(optional)</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto rounded-lg border border-calm-200 bg-white p-2">
                      {org.availableSurveys.length === 0 ? (
                        <p className="text-xs text-slate-400 italic px-2 py-1">No surveys available.</p>
                      ) : (
                        org.availableSurveys.map((s) => (
                          <label key={s.id} className="flex items-center gap-2 text-xs cursor-pointer px-2 py-1 rounded hover:bg-calm-50">
                            <input
                              type="checkbox"
                              checked={adminSurveyIds.includes(s.id)}
                              onChange={() => setAdminSurveyIds((prev) =>
                                prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id]
                              )}
                              className="accent-primary-600"
                            />
                            <span className="text-slate-700 truncate">
                              {s.title} <span className="text-slate-400">· {s.status.toLowerCase()}</span>
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="sm:col-span-3 flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdminForm(false)}
                  className="px-3 py-1.5 rounded-xl border border-calm-200 text-xs font-medium text-slate-600 hover:bg-calm-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminSubmitting}
                  className="px-3 py-1.5 rounded-xl bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {adminSubmitting
                    ? 'Creating...'
                    : org.slug === SYSTEM_ORG_SLUG
                      ? 'Create User'
                      : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users table body */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-calm-200 bg-calm-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Active</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Lessons</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Created</th>
                {org.slug === SYSTEM_ORG_SLUG && (
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 w-px"></th>
                )}
              </tr>
            </thead>
            <tbody className={org.users.length > 0 ? 'animate-stagger' : ''}>
              {org.users.length === 0 ? (
                <tr>
                  <td colSpan={org.slug === SYSTEM_ORG_SLUG ? 7 : 6} className="px-4 py-10 text-center text-slate-400">
                    <Users className="h-7 w-7 mx-auto mb-2 opacity-30" />
                    No users yet.
                  </td>
                </tr>
              ) : (
                org.users.map((user) => (
                  <React.Fragment key={user.id}>
                    <tr className="border-b border-calm-100 hover:bg-calm-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                        <span className="inline-flex items-center gap-1.5">
                          {user.name ?? <span className="text-slate-400 italic">--</span>}
                          {user.ssoOnly && (
                            <span title="SSO account"><ShieldCheck className="h-3.5 w-3.5 text-primary-500 dark:text-primary-400 flex-shrink-0" /></span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{user.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={clsx(
                            'inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full',
                            ROLE_COLORS[user.role] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-600 dark:text-slate-200'
                          )}
                        >
                          {ROLE_LABELS[user.role] ?? user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {user.active ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-sage-700">
                            <CheckCircle className="h-3 w-3" /> Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                            <XCircle className="h-3 w-3" /> No
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                        {user._count.trainingProgress}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 hidden md:table-cell">
                        {new Date(user.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      {org.slug === SYSTEM_ORG_SLUG && (
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => editingUserId === user.id ? cancelEditUser() : startEditUser(user)}
                            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border border-calm-200 text-slate-600 hover:bg-calm-100"
                          >
                            <Pencil className="h-3 w-3" />
                            {editingUserId === user.id ? 'Cancel' : 'Edit'}
                          </button>
                        </td>
                      )}
                    </tr>

                    {editingUserId === user.id && org.slug === SYSTEM_ORG_SLUG && (
                      <tr className="border-b border-calm-200 bg-primary-50/50">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="label text-xs">Name</label>
                              <input
                                className="input w-full text-sm"
                                type="text"
                                value={editUserName}
                                onChange={(e) => setEditUserName(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="label text-xs">Role</label>
                              <select
                                className="input w-full text-sm"
                                value={editUserRole}
                                onChange={(e) => setEditUserRole(e.target.value as typeof SYSTEM_ORG_ROLES[number])}
                              >
                                {SYSTEM_ORG_ROLES.map((r) => (
                                  <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="label text-xs">Active</label>
                              <select
                                className="input w-full text-sm"
                                value={editUserActive ? 'true' : 'false'}
                                onChange={(e) => setEditUserActive(e.target.value === 'true')}
                              >
                                <option value="true">Yes — can log in</option>
                                <option value="false">No — sign-in blocked</option>
                              </select>
                            </div>
                            <div className="sm:col-span-3">
                              <label className="label text-xs">
                                Training programs <span className="text-slate-400">(none = no training access)</span>
                              </label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto rounded-lg border border-calm-200 bg-white p-2">
                                {programs.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic px-2 py-1">No active programs.</p>
                                ) : (
                                  programs.map((p) => (
                                    <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer px-2 py-1 rounded hover:bg-calm-50">
                                      <input
                                        type="checkbox"
                                        checked={editUserProgramIds.includes(p.id)}
                                        onChange={() => setEditUserProgramIds((prev) =>
                                          prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]
                                        )}
                                        className="accent-primary-600"
                                      />
                                      <span className="text-slate-700 truncate">{p.name}</span>
                                    </label>
                                  ))
                                )}
                              </div>
                            </div>
                            <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <label className="flex items-center gap-2 text-xs cursor-pointer px-3 py-2 rounded-lg border border-calm-200 bg-white hover:bg-calm-50">
                                <input
                                  type="checkbox"
                                  checked={editUserCvBuilder}
                                  onChange={(e) => setEditUserCvBuilder(e.target.checked)}
                                  className="accent-primary-600"
                                />
                                <span className="text-slate-700 font-medium">CV Builder</span>
                              </label>
                              <label className="flex items-center gap-2 text-xs cursor-pointer px-3 py-2 rounded-lg border border-calm-200 bg-white hover:bg-calm-50">
                                <input
                                  type="checkbox"
                                  checked={editUserCareersAdvisor}
                                  onChange={(e) => setEditUserCareersAdvisor(e.target.checked)}
                                  className="accent-primary-600"
                                />
                                <span className="text-slate-700 font-medium">Careers Advisor</span>
                              </label>
                            </div>
                            <div className="sm:col-span-3">
                              <label className="label text-xs">
                                Surveys assigned to this user <span className="text-slate-400">(optional)</span>
                              </label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto rounded-lg border border-calm-200 bg-white p-2">
                                {org.availableSurveys.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic px-2 py-1">No surveys available.</p>
                                ) : (
                                  org.availableSurveys.map((s) => (
                                    <label key={s.id} className="flex items-center gap-2 text-xs cursor-pointer px-2 py-1 rounded hover:bg-calm-50">
                                      <input
                                        type="checkbox"
                                        checked={editUserSurveyIds.includes(s.id)}
                                        onChange={() => setEditUserSurveyIds((prev) =>
                                          prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id]
                                        )}
                                        className="accent-primary-600"
                                      />
                                      <span className="text-slate-700 truncate">
                                        {s.title} <span className="text-slate-400">· {s.status.toLowerCase()}</span>
                                      </span>
                                    </label>
                                  ))
                                )}
                              </div>
                            </div>
                            <div className="sm:col-span-3 flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={cancelEditUser}
                                className="px-3 py-1.5 rounded-xl border border-calm-200 text-xs font-medium text-slate-600 hover:bg-calm-50"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveUser(user.id)}
                                disabled={editUserSaving}
                                className="px-3 py-1.5 rounded-xl bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
                              >
                                {editUserSaving ? 'Saving…' : 'Save'}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Danger zone — hidden for system orgs */}
      {org.slug !== SYSTEM_ORG_SLUG && (
        <div className="card border border-red-200 dark:border-red-900 space-y-3">
          <h2 className="text-base font-semibold text-red-700 dark:text-red-400">Danger Zone</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Permanently delete this organisation. Only available when there are no users.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={deleting || org._count.users > 0}
            className={clsx(
              'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
              org._count.users > 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500'
                : 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50'
            )}
            title={org._count.users > 0 ? 'Remove all users before deleting this organisation' : undefined}
          >
            <Trash2 className="h-4 w-4" />
            Delete Organisation
          </button>
          {org._count.users > 0 && (
            <p className="text-xs text-slate-400">
              This organisation has {org._count.users} user{org._count.users !== 1 ? 's' : ''}. Reassign or delete all users first.
            </p>
          )}
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Delete Organisation</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              To confirm, type{' '}
              <span className="font-mono font-bold text-red-600 dark:text-red-400">
                Yes I want to delete this
              </span>{' '}
              below:
            </p>

            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type the confirmation phrase..."
              className="input w-full text-sm"
              autoFocus
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText('') }}
                className="px-4 py-2 rounded-xl border border-calm-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteConfirmText !== 'Yes I want to delete this' || deleting}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {credentialCard && (
        <CredentialCardModal
          isOpen={!!credentialCard}
          onClose={() => setCredentialCard(null)}
          userId={credentialCard.id}
          userName={credentialCard.name}
          email={credentialCard.email}
          temporaryPassword={credentialCard.password}
        />
      )}
    </div>
  )
}

// ─── Read-only view ───────────────────────────────────────────────────────────

function OrgDetailsView({
  org,
  programs,
  collections,
  surveys,
}: {
  org: OrgDetail
  programs: ProgramSummary[]
  collections: CollectionSummary[]
  surveys: SurveySummary[]
}) {
  const addressLines = [
    org.addressLine1,
    org.addressLine2,
    [org.city, org.county].filter(Boolean).join(', '),
    org.postcode,
    org.country,
  ].filter(Boolean) as string[]

  const orgTypeLabel =
    ORG_TYPE_LABELS[org.organisationType] ??
    (org.organisationType === 'EDUCATION'
      ? 'Education (legacy)'
      : org.organisationType === 'BUSINESS'
        ? 'Business (legacy)'
        : org.organisationType)

  const assignedPrograms = programs.filter((p) => org.allowedProgramIds.includes(p.id))
  const assignedCollections = collections.filter((c) => org.assignedCollectionIds.includes(c.id))
  const assignedSurveys = surveys.filter((s) => org.assignedSurveyIds.includes(s.id))

  function Field({ label, value }: { label: string; value: React.ReactNode }) {
    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">{label}</p>
        <div className="text-sm text-slate-800 dark:text-slate-200">{value || <span className="text-slate-400 italic">--</span>}</div>
      </div>
    )
  }

  function Chip({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'slate' | 'emerald' | 'blue' | 'primary' }) {
    const tones: Record<string, string> = {
      slate: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
      emerald: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
      blue: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
      primary: 'bg-primary-50 text-primary-700 border border-primary-200 dark:bg-primary-900/20 dark:text-primary-300 dark:border-primary-800',
    }
    return (
      <span className={clsx('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium', tones[tone])}>
        {children}
      </span>
    )
  }

  const roleLabels: Record<string, string> = {
    ORG_ADMIN: 'Org Admin',
    CAREGIVER: 'Practitioner',
    FAMILY_CARER: 'Parent/Friend/Relative/Carer',
    CAREER_DEV_OFFICER: 'Careers Professional',
    STUDENT: 'Student',
    INTERN: 'Intern',
    EMPLOYEE: 'Employee',
  }

  return (
    <div className="space-y-6">
      {/* Identity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Name" value={org.name} />
        <Field
          label="URL Identifier"
          value={<span className="font-mono text-xs">{org.slug}</span>}
        />
        <Field label="Organisation Type" value={orgTypeLabel} />
        <Field
          label="Status"
          value={
            <span className="inline-flex items-center gap-1">
              {org.active ? (
                <><CheckCircle className="h-3.5 w-3.5 text-sage-600" /> Active</>
              ) : (
                <><XCircle className="h-3.5 w-3.5 text-red-600" /> Inactive</>
              )}
              {org.isParentOrg && (
                <span className="ml-2"><Chip tone="primary">Parent Organisation</Chip></span>
              )}
            </span>
          }
        />
      </div>

      {/* Contact */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Primary Contact</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Name" value={org.contactName} />
          <Field
            label="Email"
            value={
              org.contactEmail ? (
                <a href={`mailto:${org.contactEmail}`} className="inline-flex items-center gap-1.5 text-primary-600 hover:underline">
                  <Mail className="h-3.5 w-3.5" />
                  {org.contactEmail}
                </a>
              ) : null
            }
          />
          <Field
            label="Phone"
            value={
              org.contactPhone ? (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {org.contactPhone}
                </span>
              ) : null
            }
          />
        </div>
      </div>

      {/* Address */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Address</p>
        {addressLines.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No address on file.</p>
        ) : (
          <div className="flex items-start gap-2 text-sm text-slate-800 dark:text-slate-200">
            <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              {addressLines.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Allowed Roles */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Allowed Roles</p>
        {org.allowedRoles.length === 0 ? (
          <p className="text-sm text-slate-400 italic">None</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {org.allowedRoles.map((role) => (
              <Chip key={role}>{roleLabels[role] ?? role}</Chip>
            ))}
          </div>
        )}
      </div>

      {/* Features */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Features</p>
        <div className="flex flex-wrap gap-2">
          <Chip tone={org.cvBuilderEnabled ? 'emerald' : 'slate'}>
            {org.cvBuilderEnabled ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            CV Builder
          </Chip>
          <Chip tone={org.careersAdvisorEnabled ? 'emerald' : 'slate'}>
            {org.careersAdvisorEnabled ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            Careers Advisor
          </Chip>
        </div>
      </div>

      {/* Training Programs */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
          <ClipboardCheck className="h-3.5 w-3.5" />
          Training Programs
        </p>
        {assignedPrograms.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No training programs assigned.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {assignedPrograms.map((p) => (
              <Chip key={p.id} tone="emerald">
                <CheckCircle className="h-3 w-3" />
                {p.name}
                <span className="opacity-70">·  {p._count.modules} {p._count.modules === 1 ? 'module' : 'modules'}</span>
              </Chip>
            ))}
          </div>
        )}
      </div>

      {/* Document Collections */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
          <FolderOpen className="h-3.5 w-3.5" />
          Document Collections
        </p>
        {assignedCollections.length === 0 ? (
          <p className="text-sm text-slate-400 italic">None assigned.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {assignedCollections.map((c) => (
              <Chip key={c.id} tone="emerald">
                <CheckCircle className="h-3 w-3" />
                {c.title}
              </Chip>
            ))}
          </div>
        )}
      </div>

      {/* Surveys */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
          <ClipboardList className="h-3.5 w-3.5" />
          Surveys
        </p>
        {assignedSurveys.length === 0 ? (
          <p className="text-sm text-slate-400 italic">None assigned.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {assignedSurveys.map((s) => (
              <Chip key={s.id} tone="blue">
                <CheckCircle className="h-3 w-3" />
                {s.title}
              </Chip>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
