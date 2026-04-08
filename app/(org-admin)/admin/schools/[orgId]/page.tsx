'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { clsx } from 'clsx'
import {
  ArrowLeft,
  Building2,
  Save,
  Trash2,
  Users,
  UserPlus,
  Search,
  ChevronDown,
  CheckCircle,
  XCircle,
  RefreshCw,
  Link2,
  AlertTriangle,
  X,
} from 'lucide-react'
import { LEAF_ROLES } from '@/types'
import { ORG_TYPES, ORG_TYPE_LABELS } from '@/lib/rbac'
import { CredentialCardModal } from '@/components/ui/credential-card-modal'

const ROLE_LABELS: Record<string, string> = {
  CAREGIVER: 'Practitioner',
  CAREER_DEV_OFFICER: 'Careers Professional',
  STUDENT: 'Student',
  INTERN: 'Intern',
  EMPLOYEE: 'Employee',
}

const ROLE_COLORS: Record<string, string> = {
  CAREGIVER: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  CAREER_DEV_OFFICER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  STUDENT: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  INTERN: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  EMPLOYEE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
}

interface SchoolDetail {
  id: string
  name: string
  slug: string
  organisationType: string
  active: boolean
  inheritSettings: boolean
  allowedRoles: string[]
  allowedProgramIds: string[]
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  county: string | null
  postcode: string | null
  _count: { users: number }
  createdAt: string
}

interface UserRow {
  id: string
  name: string | null
  email: string
  role: string
  active: boolean
  createdAt: string
}

interface UsersResponse {
  users: UserRow[]
  total: number
  page: number
  totalPages: number
}

interface ProgramOption {
  id: string
  name: string
}

export default function SchoolDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const orgId = params.orgId as string

  const [school, setSchool] = useState<SchoolDetail | null>(null)
  const [schoolLoading, setSchoolLoading] = useState(true)
  const [programs, setPrograms] = useState<ProgramOption[]>([])
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editOrgType, setEditOrgType] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [editContactName, setEditContactName] = useState('')
  const [editContactEmail, setEditContactEmail] = useState('')
  const [editContactPhone, setEditContactPhone] = useState('')
  const [editAddress1, setEditAddress1] = useState('')
  const [editAddress2, setEditAddress2] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editCounty, setEditCounty] = useState('')
  const [editPostcode, setEditPostcode] = useState('')
  const [editInherit, setEditInherit] = useState(true)
  const [editRoles, setEditRoles] = useState<string[]>([])
  const [editPrograms, setEditPrograms] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // Delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Users
  const [usersData, setUsersData] = useState<UsersResponse | null>(null)
  const [usersLoading, setUsersLoading] = useState(true)
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [userPage, setUserPage] = useState(1)

  // Create user form
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [createUserName, setCreateUserName] = useState('')
  const [createUserEmail, setCreateUserEmail] = useState('')
  const [createUserRole, setCreateUserRole] = useState('')
  const [createUserPassword, setCreateUserPassword] = useState('')
  const [createUserLoading, setCreateUserLoading] = useState(false)
  const [credentialCard, setCredentialCard] = useState<{
    name: string; email: string; password: string
  } | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && session?.user?.role !== 'ORG_ADMIN') router.push('/dashboard')
  }, [status, session, router])

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Populate edit form from school data
  function populateForm(s: SchoolDetail) {
    setEditName(s.name)
    setEditSlug(s.slug)
    setEditOrgType(s.organisationType)
    setEditActive(s.active)
    setEditContactName(s.contactName ?? '')
    setEditContactEmail(s.contactEmail ?? '')
    setEditContactPhone(s.contactPhone ?? '')
    setEditAddress1(s.addressLine1 ?? '')
    setEditAddress2(s.addressLine2 ?? '')
    setEditCity(s.city ?? '')
    setEditCounty(s.county ?? '')
    setEditPostcode(s.postcode ?? '')
    setEditInherit(s.inheritSettings)
    setEditRoles(s.allowedRoles ?? [])
    setEditPrograms(s.allowedProgramIds ?? [])
    if (!createUserRole && s.allowedRoles?.length > 0) {
      setCreateUserRole(s.allowedRoles[0])
    }
  }

  const fetchSchool = useCallback(async () => {
    setSchoolLoading(true)
    try {
      const res = await fetch(`/api/admin/schools/${orgId}`)
      if (res.ok) {
        const data = await res.json()
        setSchool(data)
        populateForm(data)
      } else if (res.status === 404) {
        router.push('/admin/schools')
      }
    } finally {
      setSchoolLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  const fetchPrograms = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/schools/programs')
      if (res.ok) {
        const data = await res.json()
        setPrograms(data.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })))
      }
    } catch {
      // Programs will be empty
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(userPage),
        ...(userSearch && { search: userSearch }),
        ...(userRoleFilter && { role: userRoleFilter }),
      })
      const res = await fetch(`/api/admin/schools/${orgId}/users?${params}`)
      if (res.ok) {
        setUsersData(await res.json())
      }
    } finally {
      setUsersLoading(false)
    }
  }, [orgId, userPage, userSearch, userRoleFilter])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchSchool()
      fetchPrograms()
    }
  }, [status, fetchSchool, fetchPrograms])

  // Debounced user fetch
  useEffect(() => {
    if (status !== 'authenticated') return
    const id = setTimeout(fetchUsers, 300)
    return () => clearTimeout(id)
  }, [fetchUsers, status])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/schools/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          slug: editSlug,
          organisationType: editOrgType,
          active: editActive,
          contactName: editContactName || null,
          contactEmail: editContactEmail || null,
          contactPhone: editContactPhone || null,
          addressLine1: editAddress1 || null,
          addressLine2: editAddress2 || null,
          city: editCity || null,
          county: editCounty || null,
          postcode: editPostcode || null,
          inheritSettings: editInherit,
          ...(!editInherit && {
            allowedRoles: editRoles,
            allowedProgramIds: editPrograms,
          }),
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        setSchool(updated)
        showToast('School updated successfully.', 'success')
      } else {
        const d = await res.json()
        showToast(d.error || 'Failed to update school.', 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/schools/${orgId}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('School deleted.', 'success')
        router.push('/admin/schools')
      } else {
        const d = await res.json()
        showToast(d.error || 'Failed to delete school.', 'error')
        setShowDeleteConfirm(false)
      }
    } finally {
      setDeleting(false)
    }
  }

  function toggleEditRole(role: string) {
    setEditRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }

  function toggleEditProgram(programId: string) {
    setEditPrograms((prev) =>
      prev.includes(programId) ? prev.filter((p) => p !== programId) : [...prev, programId]
    )
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    setCreateUserLoading(true)
    try {
      const payload: Record<string, unknown> = {
        name: createUserName,
        email: createUserEmail,
        role: createUserRole,
      }
      if (createUserPassword) {
        payload.password = createUserPassword
      }
      const res = await fetch(`/api/admin/schools/${orgId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        if (createUserPassword) {
          setCredentialCard({
            name: createUserName,
            email: createUserEmail,
            password: createUserPassword,
          })
        }
        showToast('User created successfully.', 'success')
        setShowCreateUser(false)
        setCreateUserName('')
        setCreateUserEmail('')
        setCreateUserPassword('')
        setCreateUserRole(school?.allowedRoles[0] ?? '')
        fetchUsers()
      } else {
        const d = await res.json()
        showToast(d.error || 'Failed to create user.', 'error')
      }
    } finally {
      setCreateUserLoading(false)
    }
  }

  if (status !== 'authenticated' || session?.user?.role !== 'ORG_ADMIN') return null

  const allowedRolesForUsers = school?.allowedRoles ?? []

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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

      {/* Back link */}
      <Link
        href="/admin/schools"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Schools
      </Link>

      {schoolLoading ? (
        <div className="flex items-center justify-center py-24 text-slate-400 dark:text-slate-500">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          Loading school details...
        </div>
      ) : !school ? (
        <div className="text-center py-24 text-slate-400 dark:text-slate-500">
          <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>School not found.</p>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="h-6 w-6 text-emerald-600" />
                {school.name}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                {ORG_TYPE_LABELS[school.organisationType] || school.organisationType} — {school._count.users} user{school._count.users !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Section 1: School Details */}
          <div className="card space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-600" />
              School Details
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Name</label>
                  <input className="input w-full" type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required />
                </div>
                <div>
                  <label className="label">URL Identifier</label>
                  <input className="input w-full font-mono text-sm" type="text" value={editSlug} onChange={(e) => setEditSlug(e.target.value)} required />
                </div>
              </div>

              {/* Organisation Type */}
              <div>
                <label className="label">Organisation Type</label>
                <div className="relative">
                  <select
                    value={editOrgType}
                    onChange={(e) => setEditOrgType(e.target.value)}
                    className="input w-full appearance-none pr-8"
                  >
                    {ORG_TYPES.map((t) => (
                      <option key={t} value={t}>{ORG_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Active toggle */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setEditActive(!editActive)}
                    className={clsx(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-300',
                      editActive ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-600'
                    )}
                  >
                    <span
                      className={clsx(
                        'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                        editActive ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Active</span>
                </label>
              </div>

              {/* Contact fields */}
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

              {/* Inherit Settings */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setEditInherit(!editInherit)}
                    className={clsx(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-300',
                      editInherit ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-600'
                    )}
                  >
                    <span
                      className={clsx(
                        'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                        editInherit ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Inherit settings from parent organisation</span>
                </label>

                {editInherit && (
                  <div className="ml-14 flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <Link2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      This school inherits training programs, roles, and features from the parent organisation.
                    </p>
                  </div>
                )}

                {!editInherit && (
                  <div className="ml-14 space-y-4 pt-2">
                    {/* Allowed Roles */}
                    <div>
                      <label className="label mb-2 block">Allowed Roles</label>
                      <div className="flex flex-wrap gap-3">
                        {LEAF_ROLES.map((role) => (
                          <label key={role} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editRoles.includes(role)}
                              onChange={() => toggleEditRole(role)}
                              className="rounded border-calm-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300">{ROLE_LABELS[role] ?? role}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Training Programs */}
                    <div>
                      <label className="label mb-2 block">Training Programs</label>
                      <div className="flex flex-wrap gap-3">
                        {programs.length > 0 ? programs.map((prog) => (
                          <label key={prog.id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editPrograms.includes(prog.id)}
                              onChange={() => toggleEditProgram(prog.id)}
                              className="rounded border-calm-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300">{prog.name}</span>
                          </label>
                        )) : (
                          <p className="text-xs text-slate-400">No programs available.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  {school._count.users === 0 && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete School
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
                >
                  {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Delete confirmation dialog */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/40">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">Delete School</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Are you sure you want to permanently delete <strong>{school.name}</strong>? This action cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 rounded-xl border border-calm-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    {deleting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Users */}
          <div className="card overflow-hidden p-0">
            <div className="px-4 py-4 border-b border-calm-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-600" />
                  Users
                </h2>
                <button
                  onClick={() => setShowCreateUser((v) => !v)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
                >
                  <UserPlus className="h-4 w-4" />
                  Add User
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={userSearch}
                    onChange={(e) => { setUserSearch(e.target.value); setUserPage(1) }}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100"
                  />
                </div>
                <div className="relative">
                  <select
                    value={userRoleFilter}
                    onChange={(e) => { setUserRoleFilter(e.target.value); setUserPage(1) }}
                    className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    <option value="">All roles</option>
                    {allowedRolesForUsers.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
                <button
                  onClick={fetchUsers}
                  className="p-2 rounded-xl border border-calm-200 dark:border-slate-600 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors text-slate-500"
                  title="Refresh"
                >
                  <RefreshCw className={clsx('h-4 w-4', usersLoading && 'animate-spin')} />
                </button>
              </div>
            </div>

            {/* Create user form */}
            {showCreateUser && (
              <div className="px-4 py-4 border-b border-calm-200 dark:border-slate-700 bg-emerald-50/40 dark:bg-emerald-900/10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-emerald-600" />
                    New User
                  </h3>
                  <button
                    onClick={() => setShowCreateUser(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={createUserName}
                        onChange={(e) => setCreateUserName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100"
                        placeholder="Jane Smith"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        value={createUserEmail}
                        onChange={(e) => setCreateUserEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100"
                        placeholder="jane@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Role</label>
                      <div className="relative">
                        <select
                          value={createUserRole}
                          onChange={(e) => setCreateUserRole(e.target.value)}
                          className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                        >
                          {allowedRolesForUsers.map((r) => (
                            <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                        Password
                        <span className="ml-1 text-slate-400 font-normal">(optional — leave blank for SSO users)</span>
                      </label>
                      <input
                        type="text"
                        minLength={8}
                        value={createUserPassword}
                        onChange={(e) => setCreateUserPassword(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100 font-mono"
                        placeholder="Min. 8 characters"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateUser(false)}
                      className="px-4 py-2 rounded-xl border border-calm-200 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createUserLoading}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      {createUserLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                      Create User
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Users table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-calm-200 dark:border-slate-700 bg-calm-50 dark:bg-slate-800">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Email</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Role</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 hidden md:table-cell">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {usersLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                        Loading users...
                      </td>
                    </tr>
                  ) : !usersData || usersData.users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    usersData.users.map((user) => {
                      const colors = ROLE_COLORS[user.role] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-600 dark:text-slate-200'
                      return (
                        <tr key={user.id} className="border-b border-calm-100 dark:border-slate-700 hover:bg-calm-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                            {user.name ?? '--'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                            {user.email}
                          </td>
                          <td className="px-4 py-3">
                            <span className={clsx('inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full', colors)}>
                              {ROLE_LABELS[user.role] ?? user.role}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={clsx(
                                'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                                user.active
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                              )}
                            >
                              {user.active ? (
                                <><CheckCircle className="h-3 w-3" />Active</>
                              ) : (
                                <><XCircle className="h-3 w-3" />Inactive</>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400 hidden md:table-cell">
                            {new Date(user.createdAt).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {usersData && usersData.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-calm-200 dark:border-slate-700">
                <p className="text-xs text-slate-400">
                  Page {usersData.page} of {usersData.totalPages} &middot; {usersData.total} users
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={userPage === 1}
                    onClick={() => setUserPage((p) => p - 1)}
                    className="px-3 py-1.5 rounded-lg border border-calm-200 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    disabled={userPage === usersData.totalPages}
                    onClick={() => setUserPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-lg border border-calm-200 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {credentialCard && (
        <CredentialCardModal
          isOpen={!!credentialCard}
          onClose={() => setCredentialCard(null)}
          userName={credentialCard.name}
          email={credentialCard.email}
          temporaryPassword={credentialCard.password}
        />
      )}
    </div>
  )
}
