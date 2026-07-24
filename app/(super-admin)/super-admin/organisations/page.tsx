'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { clsx } from 'clsx'
import {
  Building2,
  Plus,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronDown,
  Clock,
  AlertCircle,
  Search,
} from 'lucide-react'
import { LEAF_ROLES } from '@/types'
import { ORG_TYPES, ORG_TYPE_LABELS } from '@/lib/rbac'
import { HowToPanel } from '@/components/howto/panel'
import OrganisationsHowTo from '@/components/howto/super-admin/organisations'

interface ProgramOption {
  id: string
  name: string
}

interface OrgRow {
  id: string
  name: string
  slug: string
  active: boolean
  allowedRoles: string[]
  allowedProgramIds: string[]
  isParentOrg: boolean
  orgType?: string
  isPersonal?: boolean
  createdAt: string
  _count: { users: number; childOrgs: number }
}

const SYSTEM_ORG_SLUG = 'independent-learners'
const isSystem = (org: { slug: string }) => org.slug === SYSTEM_ORG_SLUG

const ROLE_LABELS: Record<string, string> = {
  CAREGIVER: 'Practitioner',
  FAMILY_CARER: 'Parent/Friend/Relative/Carer',
  CAREER_DEV_OFFICER: 'Careers Professional',
  STUDENT: 'Student',
  INTERN: 'Intern',
  EMPLOYEE: 'Employee',
}

export default function OrganisationsPage() {
  return (
    <Suspense>
      <OrganisationsContent />
    </Suspense>
  )
}

function OrganisationsContent() {
  const [orgs, setOrgs] = useState<OrgRow[]>([])
  const [search, setSearch] = useState('')
  const [programs, setPrograms] = useState<ProgramOption[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Create form state

  const fetchOrgs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/organisations')
      if (res.ok) setOrgs(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPrograms = useCallback(async () => {
    try {
      const res = await fetch('/api/super-admin/training/programs')
      if (res.ok) {
        const data = await res.json()
        setPrograms(data.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })))
      }
    } catch {
      // Programs will be empty - form will still work
    }
  }, [])

  useEffect(() => { fetchOrgs(); fetchPrograms() }, [fetchOrgs, fetchPrograms])

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


  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-page-enter">
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary-600" />
            Organisations
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage all organisations on the platform.</p>
        </div>
        <Link
          href="/super-admin/organisations/new"
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Organisation
        </Link>
      </div>


      {/* Table */}
      {(() => {
        const q = search.trim().toLowerCase()
        const filteredOrgs = q
          ? orgs.filter((o) =>
              o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q)
            )
          : orgs
        return (
        <div className="card overflow-hidden p-0">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-calm-200 dark:border-slate-700 bg-calm-50 dark:bg-slate-800">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or URL ID"
              className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {filteredOrgs.length} of {orgs.length}
          </span>
          <button
            onClick={fetchOrgs}
            className="p-2 rounded-xl border border-calm-200 dark:border-slate-600 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors text-slate-500"
            title="Refresh"
          >
            <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>
        <div className="overflow-auto max-h-[22rem]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-calm-200 dark:border-slate-700 bg-calm-50 dark:bg-slate-800">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">URL ID</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Users</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Active</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 hidden md:table-cell">Created</th>
                <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody className={!loading && filteredOrgs.length > 0 ? 'animate-stagger' : ''}>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading...
                  </td>
                </tr>
              ) : orgs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No organisations yet.
                  </td>
                </tr>
              ) : filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">
                    No organisations match &ldquo;{search}&rdquo;.
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org) => {
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
                        {org.isParentOrg && (
                          <span className="ml-2 inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                            Parent
                          </span>
                        )}
                        {isSystem(org) && (
                          <span
                            className="ml-2 inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            title="System-managed catch-all for unaffiliated learners. Targetable by libraries, surveys and announcements but cannot be renamed or deleted."
                          >
                            System
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{org.slug}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {org._count.users}
                        {org._count.childOrgs > 0 && (
                          <span className="ml-1.5 text-xs text-primary-600 dark:text-primary-400" title={`${org._count.childOrgs} child organisation${org._count.childOrgs !== 1 ? 's' : ''}`}>
                            +{org._count.childOrgs} sub
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isSystem(org) ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" title="System orgs are always active.">
                            <CheckCircle className="h-3 w-3" />Active
                          </span>
                        ) : (
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
                        )}
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
      )
      })()}

      <HowToPanel>
        <OrganisationsHowTo />
      </HowToPanel>
    </div>
  )
}
