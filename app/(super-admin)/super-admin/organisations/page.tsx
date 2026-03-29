'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { clsx } from 'clsx'
import {
  Building2,
  Plus,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { LEAF_ROLES } from '@/types'
import { ASD_MODULE_IDS, CAREERS_MODULE_IDS } from '@/lib/modules'

interface OrgRow {
  id: string
  name: string
  slug: string
  active: boolean
  allowedRoles: string[]
  allowedModuleIds: string[]
  createdAt: string
  _count: { users: number }
}

const MODULE_LABELS: Record<string, string> = {
  'module-1': 'Module 1: What is ASD?',
  'module-2': 'Module 2: Communication',
  'module-3': 'Module 3: Social Skills',
  'module-4': 'Module 4: Sensory Processing',
  'module-5': 'Module 5: Supporting Strategies',
  'careers-module-1': 'Careers Module 1',
  'careers-module-2': 'Careers Module 2',
  'careers-module-3': 'Careers Module 3',
  'careers-module-4': 'Careers Module 4',
}

const ROLE_LABELS: Record<string, string> = {
  CAREGIVER: 'Caregiver',
  CAREER_DEV_OFFICER: 'Careers Professional',
  STUDENT: 'Student',
  INTERN: 'Intern',
  EMPLOYEE: 'Employee',
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function OrganisationsPage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Create form state
  const [formName, setFormName] = useState('')
  const [formSlug, setFormSlug] = useState('')
  const [formRoles, setFormRoles] = useState<string[]>([])
  const [formModules, setFormModules] = useState<string[]>([])
  const [formActive, setFormActive] = useState(true)
  const [formSubmitting, setFormSubmitting] = useState(false)

  const fetchOrgs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/organisations')
      if (res.ok) setOrgs(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchOrgs() }, [fetchOrgs])

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function toggleActive(org: OrgRow) {
    setActionLoading(org.id)
    try {
      const res = await fetch(`/api/super-admin/organisations/${org.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !org.active }),
      })
      if (res.ok) {
        showToast(`${org.name} ${!org.active ? 'activated' : 'deactivated'}.`, 'success')
        fetchOrgs()
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

  function toggleModule(mod: string) {
    setFormModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    )
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormSubmitting(true)
    try {
      const res = await fetch('/api/super-admin/organisations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          slug: formSlug,
          allowedRoles: formRoles,
          allowedModuleIds: formModules,
          active: formActive,
        }),
      })
      if (res.ok) {
        showToast('Organisation created.', 'success')
        setShowForm(false)
        setFormName('')
        setFormSlug('')
        setFormRoles([])
        setFormModules([])
        setFormActive(true)
        fetchOrgs()
      } else {
        const d = await res.json()
        showToast(d.error || 'Create failed.', 'error')
      }
    } finally {
      setFormSubmitting(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary-600" />
            Organisations
          </h1>
          <p className="text-slate-500 mt-1">Manage all organisations on the platform.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn-primary flex items-center gap-2"
        >
          {showForm ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Cancel' : 'Create Organisation'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">New Organisation</h2>
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
                  placeholder="e.g. Sunrise Care"
                />
              </div>
              <div>
                <label className="label">Slug</label>
                <input
                  className="input w-full font-mono text-sm"
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  required
                  placeholder="e.g. sunrise-care"
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
                      checked={formRoles.includes(role)}
                      onChange={() => toggleRole(role)}
                      className="rounded border-calm-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-slate-700">{ROLE_LABELS[role] ?? role}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Allowed Modules */}
            <div>
              <label className="label mb-2 block">Allowed Modules</label>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">ASD Modules</p>
                <div className="flex flex-wrap gap-3">
                  {ASD_MODULE_IDS.map((mod) => (
                    <label key={mod} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formModules.includes(mod)}
                        onChange={() => toggleModule(mod)}
                        className="rounded border-calm-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-slate-700">{MODULE_LABELS[mod] ?? mod}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-2">Careers Modules</p>
                <div className="flex flex-wrap gap-3">
                  {CAREERS_MODULE_IDS.map((mod) => (
                    <label key={mod} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formModules.includes(mod)}
                        onChange={() => toggleModule(mod)}
                        className="rounded border-calm-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-slate-700">{MODULE_LABELS[mod] ?? mod}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Active toggle */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="rounded border-calm-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-slate-700">Active</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl border border-calm-200 text-sm font-medium text-slate-600 hover:bg-calm-50"
              >
                Cancel
              </button>
              <button type="submit" disabled={formSubmitting} className="btn-primary">
                {formSubmitting ? 'Creating…' : 'Create Organisation'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-calm-200">
          <p className="text-sm text-slate-500">{orgs.length} organisation{orgs.length !== 1 ? 's' : ''}</p>
          <button
            onClick={fetchOrgs}
            className="p-2 rounded-xl border border-calm-200 hover:bg-calm-50 transition-colors text-slate-500"
            title="Refresh"
          >
            <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-calm-200 bg-calm-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Slug</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Users</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Active</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Created</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading…
                  </td>
                </tr>
              ) : orgs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No organisations yet.
                  </td>
                </tr>
              ) : (
                orgs.map((org) => {
                  const isLoading = actionLoading === org.id
                  return (
                    <tr key={org.id} className="border-b border-calm-100 hover:bg-calm-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/super-admin/organisations/${org.id}`}
                          className="font-medium text-primary-600 hover:text-primary-700"
                        >
                          {org.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{org.slug}</td>
                      <td className="px-4 py-3 text-slate-700">{org._count.users}</td>
                      <td className="px-4 py-3">
                        <button
                          disabled={isLoading}
                          onClick={() => toggleActive(org)}
                          className={clsx(
                            'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-colors',
                            org.active
                              ? 'bg-sage-100 text-sage-700 hover:bg-sage-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          )}
                        >
                          {org.active ? (
                            <><CheckCircle className="h-3 w-3" />Active</>
                          ) : (
                            <><XCircle className="h-3 w-3" />Inactive</>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 hidden md:table-cell">
                        {new Date(org.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/super-admin/organisations/${org.id}`}
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Manage
                        </Link>
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
