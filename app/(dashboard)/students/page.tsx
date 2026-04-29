'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Users, Search, GraduationCap, Layers, ShieldCheck,
  UserPlus, CheckCircle, XCircle, Loader2, BarChart3, RotateCcw,
} from 'lucide-react'
import { clsx } from 'clsx'
import { CredentialCardModal } from '@/components/ui/credential-card-modal'

const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Student',
  INTERN: 'Intern',
  EMPLOYEE: 'Employee',
}

const ROLE_COLORS: Record<string, string> = {
  STUDENT: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  INTERN: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  EMPLOYEE: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
}

const ROLE_ICONS: Record<string, React.ElementType> = {
  STUDENT: GraduationCap,
  INTERN: Layers,
  EMPLOYEE: ShieldCheck,
}

const MANAGED_ROLES = ['STUDENT', 'INTERN', 'EMPLOYEE'] as const

interface UserRow {
  id: string
  name: string | null
  email: string
  role: string
  active: boolean
  ssoOnly: boolean
  createdAt: string
  _count: { trainingProgress: number; cvs: number; careerAdvisorSessions: number }
}

interface UsersResponse {
  users: UserRow[]
  total: number
  page: number
  totalPages: number
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out + '!1'
}

export default function CdoStudentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<UsersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '', email: '', role: 'STUDENT', password: generateTempPassword(), ssoOnly: false,
  })
  const [createLoading, setCreateLoading] = useState(false)
  const [credentialCard, setCredentialCard] = useState<{
    userId: string; userName: string; email: string; temporaryPassword: string
  } | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && session?.user?.role !== 'CAREER_DEV_OFFICER') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
      })
      const res = await fetch(`/api/careers/users?${params}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [page, search, roleFilter])

  useEffect(() => {
    const id = setTimeout(fetchUsers, 300)
    return () => clearTimeout(id)
  }, [fetchUsers])

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function updateUser(userId: string, patch: Record<string, unknown>) {
    setActionLoading(userId)
    try {
      const res = await fetch(`/api/careers/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (res.ok) {
        showToast('Student updated.', 'success')
        fetchUsers()
      } else {
        const d = await res.json()
        showToast(d.error || 'Update failed.', 'error')
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function deactivateUser(userId: string, name: string | null) {
    if (!confirm(`Deactivate ${name ?? 'this student'}? They will no longer be able to sign in.`)) return
    setActionLoading(userId)
    try {
      const res = await fetch(`/api/careers/users/${userId}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('Student deactivated.', 'success')
        fetchUsers()
      } else {
        const d = await res.json()
        showToast(d.error || 'Deactivate failed.', 'error')
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    setCreateLoading(true)
    try {
      const payload: Record<string, unknown> = { ...createForm }
      if (createForm.ssoOnly) delete payload.password
      const res = await fetch('/api/careers/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const created = await res.json()
        if (!createForm.ssoOnly) {
          setCredentialCard({
            userId: created.id,
            userName: createForm.name,
            email: createForm.email,
            temporaryPassword: createForm.password,
          })
        }
        showToast('Student created successfully.', 'success')
        setShowCreate(false)
        setCreateForm({
          name: '', email: '', role: 'STUDENT',
          password: generateTempPassword(), ssoOnly: false,
        })
        fetchUsers()
      } else {
        const d = await res.json()
        showToast(d.error || 'Failed to create student.', 'error')
      }
    } finally {
      setCreateLoading(false)
    }
  }

  if (status !== 'authenticated' || session?.user?.role !== 'CAREER_DEV_OFFICER') return null

  const allowedRoles = [...MANAGED_ROLES]

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-page-enter">
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="h-6 w-6 text-primary-600" />
            My Students
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage students, interns, and employees in your organisation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/students/reports"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-calm-100 dark:bg-slate-700 hover:bg-calm-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium transition-colors"
          >
            <BarChart3 className="h-4 w-4" />
            Reports
          </Link>
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Add Student
          </button>
        </div>
      </div>

      {showCreate && (
        <form onSubmit={createUser} className="card space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">New student</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full name</label>
              <input
                required
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
              <input
                required
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                {allowedRoles.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Temporary password
              </label>
              <div className="flex gap-2">
                <input
                  disabled={createForm.ssoOnly}
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  className="flex-1 px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setCreateForm((f) => ({ ...f, password: generateTempPassword() }))}
                  disabled={createForm.ssoOnly}
                  className="px-3 rounded-lg bg-calm-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-calm-200 dark:hover:bg-slate-600 disabled:opacity-50"
                  title="Generate new password"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={createForm.ssoOnly}
              onChange={(e) => setCreateForm((f) => ({ ...f, ssoOnly: e.target.checked }))}
            />
            SSO only (no password — user signs in with Google or Microsoft)
          </label>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={createLoading}
              className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium disabled:opacity-50"
            >
              {createLoading ? 'Creating…' : 'Create student'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-xl bg-calm-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search name or email"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
        >
          <option value="">All roles</option>
          {MANAGED_ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
          </div>
        ) : !data || data.users.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-calm-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-slate-300 dark:text-slate-500" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No students yet</h2>
            <p className="text-slate-400 dark:text-slate-500 text-sm max-w-sm mx-auto">
              Add your first student using the button above.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-calm-200 dark:border-slate-700">
                <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-6 py-3">Name</th>
                <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-6 py-3 hidden sm:table-cell">Email</th>
                <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-6 py-3">Role</th>
                <th className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-6 py-3 hidden md:table-cell">Training</th>
                <th className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-6 py-3 hidden md:table-cell">CVs</th>
                <th className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-6 py-3 hidden lg:table-cell">Advisor</th>
                <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-calm-100 dark:divide-slate-700/50">
              {data.users.map((u) => {
                const RoleIcon = ROLE_ICONS[u.role] ?? Users
                return (
                  <tr key={u.id} className="hover:bg-calm-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                      {u.name || 'Unnamed'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                      {u.email}
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        'text-xs font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1',
                        ROLE_COLORS[u.role],
                      )}>
                        <RoleIcon className="h-3 w-3" />
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-semibold text-slate-700 dark:text-slate-300 hidden md:table-cell">
                      {u._count.trainingProgress}
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-semibold text-slate-700 dark:text-slate-300 hidden md:table-cell">
                      {u._count.cvs}
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-semibold text-slate-700 dark:text-slate-300 hidden lg:table-cell">
                      {u._count.careerAdvisorSessions}
                    </td>
                    <td className="px-6 py-4">
                      {u.active ? (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Active</span>
                      ) : (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">Inactive</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {actionLoading === u.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400 inline" />
                      ) : u.active ? (
                        <button
                          onClick={() => deactivateUser(u.id, u.name)}
                          className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => updateUser(u.id, { active: true })}
                          className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                        >
                          Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>Page {data.page} of {data.totalPages} • {data.total} students</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={data.page <= 1}
              className="px-3 py-1.5 rounded-lg bg-calm-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={data.page >= data.totalPages}
              className="px-3 py-1.5 rounded-lg bg-calm-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {credentialCard && (
        <CredentialCardModal
          isOpen={true}
          {...credentialCard}
          onClose={() => setCredentialCard(null)}
        />
      )}
    </div>
  )
}
