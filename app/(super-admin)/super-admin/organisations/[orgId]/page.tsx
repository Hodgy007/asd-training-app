'use client'

import { useState, useEffect, useCallback } from 'react'
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
} from 'lucide-react'
import { clsx } from 'clsx'
import { LEAF_ROLES } from '@/types'
import { ASD_MODULE_IDS, CAREERS_MODULE_IDS } from '@/lib/modules'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrgUser {
  id: string
  name: string | null
  email: string
  role: string
  active: boolean
  allowedModuleIds: string[]
  mustChangePassword: boolean
  createdAt: string
  _count: { trainingProgress: number }
}

interface OrgDetail {
  id: string
  name: string
  slug: string
  active: boolean
  allowedRoles: string[]
  allowedModuleIds: string[]
  users: OrgUser[]
  _count: { users: number }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  ORG_ADMIN: 'Org Admin',
  CAREGIVER: 'Caregiver',
  CAREER_DEV_OFFICER: 'Careers Professional',
  STUDENT: 'Student',
  INTERN: 'Intern',
  EMPLOYEE: 'Employee',
}

const ROLE_COLORS: Record<string, string> = {
  ORG_ADMIN: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  CAREGIVER: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  CAREER_DEV_OFFICER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  STUDENT: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  INTERN: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  EMPLOYEE: 'bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-200',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrgDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orgId = params.orgId as string

  // Data
  const [org, setOrg] = useState<OrgDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Edit form state (mirrors org data)
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editRoles, setEditRoles] = useState<string[]>([])
  const [editModules, setEditModules] = useState<string[]>([])
  const [editActive, setEditActive] = useState(true)
  const [saving, setSaving] = useState(false)

  // Add org admin form
  const [showAdminForm, setShowAdminForm] = useState(false)
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminSubmitting, setAdminSubmitting] = useState(false)

  // Delete
  const [deleting, setDeleting] = useState(false)

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
        setEditModules(data.allowedModuleIds)
        setEditActive(data.active)
      }
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => { fetchOrg() }, [fetchOrg])

  // ── Toast ──────────────────────────────────────────────────────────────────

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Edit helpers ───────────────────────────────────────────────────────────

  function toggleRole(role: string) {
    setEditRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }

  function toggleTrainingPlan(plan: 'asd' | 'careers') {
    const ids: string[] = plan === 'asd' ? [...ASD_MODULE_IDS] : [...CAREERS_MODULE_IDS]
    const isOn = ids.some((id) => editModules.includes(id))
    setEditModules((prev) =>
      isOn ? prev.filter((m) => !ids.includes(m)) : [...prev, ...ids.filter((id) => !prev.includes(id))]
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
          allowedModuleIds: editModules,
          active: editActive,
        }),
      })
      if (res.ok) {
        showToast('Organisation saved.', 'success')
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
    try {
      const res = await fetch(`/api/super-admin/organisations/${orgId}/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: adminName, email: adminEmail, password: adminPassword }),
      })
      if (res.ok) {
        showToast('Org admin created.', 'success')
        setShowAdminForm(false)
        setAdminName('')
        setAdminEmail('')
        setAdminPassword('')
        fetchOrg()
      } else {
        const d = await res.json()
        showToast(d.error || 'Failed to create admin.', 'error')
      }
    } finally {
      setAdminSubmitting(false)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!org) return
    if (!confirm(`Delete "${org.name}"? This cannot be undone.`)) return
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
    }
  }

  // ── Render states ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-24 text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading…
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

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto space-y-6">

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
              <Building2 className="h-6 w-6 text-purple-600" />
              {org.name}
            </h1>
            <p className="text-slate-500 mt-1 font-mono text-sm">{org.slug}</p>
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

      {/* Edit form */}
      <div className="card space-y-5">
        <h2 className="text-lg font-semibold text-slate-900">Organisation Details</h2>
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
              <label className="label">Slug</label>
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

          {/* Training Plans */}
          <div>
            <label className="label mb-2 block">Training Plans</label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => toggleTrainingPlan('asd')}
                className={clsx(
                  'flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium border transition-colors text-left',
                  ASD_MODULE_IDS.some((id) => editModules.includes(id))
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700'
                    : 'bg-white text-slate-500 border-calm-200 hover:border-emerald-300 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600'
                )}
              >
                {ASD_MODULE_IDS.some((id) => editModules.includes(id))
                  ? <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  : <div className="h-4 w-4 rounded-full border-2 border-slate-300 flex-shrink-0" />}
                <div>
                  <p className="font-bold">ASD Awareness Training</p>
                  <p className="text-xs opacity-75">5 modules — early identification for caregivers</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => toggleTrainingPlan('careers')}
                className={clsx(
                  'flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium border transition-colors text-left',
                  CAREERS_MODULE_IDS.some((id) => editModules.includes(id))
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700'
                    : 'bg-white text-slate-500 border-calm-200 hover:border-emerald-300 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600'
                )}
              >
                {CAREERS_MODULE_IDS.some((id) => editModules.includes(id))
                  ? <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  : <div className="h-4 w-4 rounded-full border-2 border-slate-300 flex-shrink-0" />}
                <div>
                  <p className="font-bold">Careers CPD Training</p>
                  <p className="text-xs opacity-75">4 modules — autism-inclusive careers guidance</p>
                </div>
              </button>
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

          <div className="flex justify-end pt-1">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Users table */}
      <div className="card overflow-hidden p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-calm-200">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-600" />
            Users
            <span className="text-xs font-normal text-slate-400 ml-1">({org._count.users})</span>
          </h2>
          <button
            onClick={() => setShowAdminForm((v) => !v)}
            className={clsx(
              'inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition-colors',
              showAdminForm
                ? 'border-calm-200 text-slate-600 bg-calm-50 hover:bg-calm-100'
                : 'border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100'
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            {showAdminForm ? 'Cancel' : 'Add Org Admin'}
          </button>
        </div>

        {/* Add admin inline form */}
        {showAdminForm && (
          <div className="px-4 py-4 border-b border-calm-200 bg-purple-50">
            <p className="text-sm font-medium text-purple-800 mb-3">New Org Admin</p>
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
                  placeholder="admin@example.com"
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
                  className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {adminSubmitting ? 'Creating…' : 'Create Admin'}
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
              </tr>
            </thead>
            <tbody>
              {org.users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    <Users className="h-7 w-7 mx-auto mb-2 opacity-30" />
                    No users yet.
                  </td>
                </tr>
              ) : (
                org.users.map((user) => (
                  <tr key={user.id} className="border-b border-calm-100 hover:bg-calm-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {user.name ?? <span className="text-slate-400 italic">—</span>}
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Danger zone */}
      <div className="card border border-red-200 space-y-3">
        <h2 className="text-base font-semibold text-red-700">Danger Zone</h2>
        <p className="text-sm text-slate-500">
          Permanently delete this organisation. Only available when there are no users.
        </p>
        <button
          onClick={handleDelete}
          disabled={deleting || org._count.users > 0}
          className={clsx(
            'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
            org._count.users > 0
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50'
          )}
          title={org._count.users > 0 ? 'Remove all users before deleting this organisation' : undefined}
        >
          <Trash2 className="h-4 w-4" />
          {deleting ? 'Deleting…' : 'Delete Organisation'}
        </button>
        {org._count.users > 0 && (
          <p className="text-xs text-slate-400">
            This organisation has {org._count.users} user{org._count.users !== 1 ? 's' : ''}. Reassign or delete all users first.
          </p>
        )}
      </div>

    </div>
  )
}
