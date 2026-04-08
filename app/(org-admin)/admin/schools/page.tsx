'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { clsx } from 'clsx'
import {
  Building2,
  Plus,
  ChevronUp,
  ChevronDown,
  CheckCircle,
  XCircle,
  RefreshCw,
  Link2,
  Users,
} from 'lucide-react'
import { LEAF_ROLES } from '@/types'
import { ORG_TYPES, ORG_TYPE_LABELS } from '@/lib/rbac'

const ROLE_LABELS: Record<string, string> = {
  CAREGIVER: 'Practitioner',
  CAREER_DEV_OFFICER: 'Careers Professional',
  STUDENT: 'Student',
  INTERN: 'Intern',
  EMPLOYEE: 'Employee',
}

interface SchoolRow {
  id: string
  name: string
  slug: string
  organisationType: string
  active: boolean
  inheritSettings: boolean
  _count: { users: number }
  createdAt: string
}

interface ParentOrgInfo {
  allowedRoles: string[]
  allowedProgramIds: string[]
}

interface ProgramOption {
  id: string
  name: string
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function SchoolsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [schools, setSchools] = useState<SchoolRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Parent org info for the create form
  const [parentOrg, setParentOrg] = useState<ParentOrgInfo | null>(null)
  const [programs, setPrograms] = useState<ProgramOption[]>([])

  // Create form state
  const [formName, setFormName] = useState('')
  const [formSlug, setFormSlug] = useState('')
  const [formOrgType, setFormOrgType] = useState<string>('SCHOOL')
  const [formContactName, setFormContactName] = useState('')
  const [formContactEmail, setFormContactEmail] = useState('')
  const [formContactPhone, setFormContactPhone] = useState('')
  const [formAddress1, setFormAddress1] = useState('')
  const [formAddress2, setFormAddress2] = useState('')
  const [formCity, setFormCity] = useState('')
  const [formCounty, setFormCounty] = useState('')
  const [formPostcode, setFormPostcode] = useState('')
  const [formInherit, setFormInherit] = useState(true)
  const [formRoles, setFormRoles] = useState<string[]>([])
  const [formPrograms, setFormPrograms] = useState<string[]>([])
  const [formSubmitting, setFormSubmitting] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && session?.user?.role !== 'ORG_ADMIN') router.push('/dashboard')
  }, [status, session, router])

  const fetchSchools = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/schools')
      if (res.ok) {
        const data = await res.json()
        setSchools(data.schools ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchParentOrg = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/org')
      if (res.ok) {
        const data = await res.json()
        setParentOrg({ allowedRoles: data.allowedRoles ?? [], allowedProgramIds: data.allowedProgramIds ?? [] })
      }
    } catch {
      // Org info will be empty
    }
  }, [])

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

  useEffect(() => {
    if (status === 'authenticated') {
      fetchSchools()
      fetchParentOrg()
      fetchPrograms()
    }
  }, [status, fetchSchools, fetchParentOrg, fetchPrograms])

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function toggleActive(school: SchoolRow) {
    setActionLoading(school.id)
    try {
      const res = await fetch(`/api/admin/schools/${school.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !school.active }),
      })
      if (res.ok) {
        showToast(`${school.name} ${!school.active ? 'activated' : 'deactivated'}.`, 'success')
        fetchSchools()
      } else {
        const d = await res.json()
        showToast(d.error || 'Update failed.', 'error')
      }
    } finally {
      setActionLoading(null)
    }
  }

  function handleNameChange(name: string) {
    setFormName(name)
    setFormSlug(slugify(name))
  }

  function toggleRole(role: string) {
    setFormRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }

  function toggleProgram(programId: string) {
    setFormPrograms((prev) =>
      prev.includes(programId) ? prev.filter((p) => p !== programId) : [...prev, programId]
    )
  }

  function resetForm() {
    setFormName('')
    setFormSlug('')
    setFormOrgType('SCHOOL')
    setFormContactName('')
    setFormContactEmail('')
    setFormContactPhone('')
    setFormAddress1('')
    setFormAddress2('')
    setFormCity('')
    setFormCounty('')
    setFormPostcode('')
    setFormInherit(true)
    setFormRoles([])
    setFormPrograms([])
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormSubmitting(true)
    try {
      const res = await fetch('/api/admin/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          slug: formSlug,
          organisationType: formOrgType,
          contactName: formContactName || undefined,
          contactEmail: formContactEmail || undefined,
          contactPhone: formContactPhone || undefined,
          addressLine1: formAddress1 || undefined,
          addressLine2: formAddress2 || undefined,
          city: formCity || undefined,
          county: formCounty || undefined,
          postcode: formPostcode || undefined,
          inheritSettings: formInherit,
          ...(!formInherit && {
            allowedRoles: formRoles,
            allowedProgramIds: formPrograms,
          }),
        }),
      })
      if (res.ok) {
        showToast('School created successfully.', 'success')
        setShowForm(false)
        resetForm()
        fetchSchools()
      } else {
        const d = await res.json()
        showToast(d.error || 'Failed to create school.', 'error')
      }
    } finally {
      setFormSubmitting(false)
    }
  }

  if (status !== 'authenticated' || session?.user?.role !== 'ORG_ADMIN') return null

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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-6 w-6 text-emerald-600" />
            Schools
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage child organisations within your organisation.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
        >
          {showForm ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Cancel' : 'Create School'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-900/10 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">New School</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Name</label>
                <input
                  className="input w-full"
                  type="text"
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                  placeholder="e.g. Sunrise Academy"
                />
              </div>
              <div>
                <label className="label">URL Identifier</label>
                <input
                  className="input w-full font-mono text-sm"
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  required
                  placeholder="e.g. sunrise-academy"
                />
              </div>
            </div>

            {/* Organisation Type */}
            <div>
              <label className="label">Organisation Type</label>
              <div className="relative">
                <select
                  value={formOrgType}
                  onChange={(e) => setFormOrgType(e.target.value)}
                  className="input w-full appearance-none pr-8"
                >
                  {ORG_TYPES.map((t) => (
                    <option key={t} value={t}>{ORG_TYPE_LABELS[t]}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Primary Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label">Contact Name</label>
                <input className="input w-full" type="text" value={formContactName} onChange={(e) => setFormContactName(e.target.value)} placeholder="e.g. Jane Smith" />
              </div>
              <div>
                <label className="label">Contact Email</label>
                <input className="input w-full" type="email" value={formContactEmail} onChange={(e) => setFormContactEmail(e.target.value)} placeholder="e.g. jane@example.com" />
              </div>
              <div>
                <label className="label">Contact Phone</label>
                <input className="input w-full" type="tel" value={formContactPhone} onChange={(e) => setFormContactPhone(e.target.value)} placeholder="e.g. 07700 123456" />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="label">Address Line 1</label>
              <input className="input w-full" type="text" value={formAddress1} onChange={(e) => setFormAddress1(e.target.value)} placeholder="e.g. 10 High Street" />
            </div>
            <div>
              <label className="label">Address Line 2</label>
              <input className="input w-full" type="text" value={formAddress2} onChange={(e) => setFormAddress2(e.target.value)} placeholder="Optional" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label">City / Town</label>
                <input className="input w-full" type="text" value={formCity} onChange={(e) => setFormCity(e.target.value)} placeholder="e.g. London" />
              </div>
              <div>
                <label className="label">County</label>
                <input className="input w-full" type="text" value={formCounty} onChange={(e) => setFormCounty(e.target.value)} placeholder="e.g. Hertfordshire" />
              </div>
              <div>
                <label className="label">Postcode</label>
                <input className="input w-full" type="text" value={formPostcode} onChange={(e) => setFormPostcode(e.target.value)} placeholder="e.g. AL5 2QP" />
              </div>
            </div>

            {/* Inherit Settings toggle */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setFormInherit(!formInherit)}
                  className={clsx(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-300',
                    formInherit ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-600'
                  )}
                >
                  <span
                    className={clsx(
                      'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                      formInherit ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Inherit settings from parent organisation</span>
              </label>

              {formInherit && (
                <p className="text-xs text-slate-400 dark:text-slate-500 ml-14">
                  This school will use the same training programs, allowed roles, and feature settings as the parent organisation.
                </p>
              )}

              {/* Custom settings when inherit is off */}
              {!formInherit && (
                <div className="ml-14 space-y-4 pt-2">
                  {/* Allowed Roles */}
                  <div>
                    <label className="label mb-2 block">Allowed Roles</label>
                    <div className="flex flex-wrap gap-3">
                      {LEAF_ROLES.map((role) => (
                        <label key={role} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formRoles.includes(role)}
                            onChange={() => toggleRole(role)}
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
                            checked={formPrograms.includes(prog.id)}
                            onChange={() => toggleProgram(prog.id)}
                            className="rounded border-calm-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-300">{prog.name}</span>
                        </label>
                      )) : (
                        <p className="text-xs text-slate-400">Loading programs...</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm() }}
                className="px-4 py-2 rounded-xl border border-calm-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button type="submit" disabled={formSubmitting} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium transition-colors flex items-center gap-2">
                {formSubmitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                {formSubmitting ? 'Creating...' : 'Create School'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-calm-200 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">{schools.length} school{schools.length !== 1 ? 's' : ''}</p>
          <button
            onClick={fetchSchools}
            className="p-2 rounded-xl border border-calm-200 dark:border-slate-600 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors text-slate-500"
            title="Refresh"
          >
            <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-calm-200 dark:border-slate-700 bg-calm-50 dark:bg-slate-800">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Users</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Settings</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 hidden md:table-cell">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading...
                  </td>
                </tr>
              ) : schools.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No schools yet. Create one to get started.
                  </td>
                </tr>
              ) : (
                schools.map((school) => {
                  const isLoading = actionLoading === school.id
                  return (
                    <tr key={school.id} className="border-b border-calm-100 dark:border-slate-700 hover:bg-calm-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/schools/${school.id}`}
                          className="font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                        >
                          {school.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {ORG_TYPE_LABELS[school.organisationType] || school.organisationType}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          {school._count.users}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {school.inheritSettings ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            <Link2 className="h-3 w-3" />
                            Inherited
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                            Custom
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          disabled={isLoading}
                          onClick={() => toggleActive(school)}
                          className={clsx(
                            'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-colors',
                            school.active
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60'
                              : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60'
                          )}
                        >
                          {school.active ? (
                            <><CheckCircle className="h-3 w-3" />Active</>
                          ) : (
                            <><XCircle className="h-3 w-3" />Inactive</>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 hidden md:table-cell">
                        {new Date(school.createdAt).toLocaleDateString('en-GB', {
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
      </div>
    </div>
  )
}
