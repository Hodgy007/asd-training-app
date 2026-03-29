'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Users,
  Search,
  ShieldCheck,
  Briefcase,
  UserCircle,
  ChevronDown,
  CheckCircle,
  XCircle,
  RefreshCw,
  Trash2,
  UserPlus,
  X,
  GraduationCap,
  Layers,
  BookOpen,
} from 'lucide-react'
import { clsx } from 'clsx'

const ROLE_LABELS: Record<string, string> = {
  CAREGIVER: 'Caregiver',
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

const ROLE_ICONS: Record<string, React.ElementType> = {
  CAREGIVER: UserCircle,
  CAREER_DEV_OFFICER: Briefcase,
  STUDENT: GraduationCap,
  INTERN: Layers,
  EMPLOYEE: ShieldCheck,
}

interface OrgInfo {
  id: string
  name: string
  allowedRoles: string[]
  allowedModuleIds: string[]
}

interface UserRow {
  id: string
  name: string | null
  email: string
  role: string
  active: boolean
  allowedModuleIds: string[]
  mustChangePassword: boolean
  createdAt: string
  _count: { children: number; trainingProgress: number }
}

interface UsersResponse {
  users: UserRow[]
  total: number
  page: number
  totalPages: number
}

interface CreateForm {
  name: string
  email: string
  role: string
  password: string
  ssoOnly: boolean
  allowedModuleIds: string[]
}

export default function OrgAdminUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [org, setOrg] = useState<OrgInfo | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<UsersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<CreateForm>({
    name: '', email: '', role: '', password: '', ssoOnly: false, allowedModuleIds: [],
  })
  const [createLoading, setCreateLoading] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && session?.user?.role !== 'ORG_ADMIN') router.push('/dashboard')
  }, [status, session, router])

  // Fetch org info once
  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/admin/org')
      .then((r) => r.json())
      .then((o: OrgInfo) => {
        setOrg(o)
        // Pre-select first allowed role and all org modules in create form
        setCreateForm((f) => ({
          ...f,
          role: o.allowedRoles[0] ?? '',
          allowedModuleIds: o.allowedModuleIds,
        }))
      })
  }, [status])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
      })
      const res = await fetch(`/api/admin/users?${params}`)
      if (res.ok) {
        setData(await res.json())
      }
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
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (res.ok) {
        showToast('User updated.', 'success')
        fetchUsers()
      } else {
        const d = await res.json()
        showToast(d.error || 'Update failed.', 'error')
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function deleteUser(userId: string, name: string | null) {
    if (!confirm(`Permanently delete ${name ?? 'this user'}? This cannot be undone.`)) return
    setActionLoading(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('User deleted.', 'success')
        fetchUsers()
      } else {
        const d = await res.json()
        showToast(d.error || 'Delete failed.', 'error')
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    setCreateLoading(true)
    try {
      const payload = { ...createForm }
      if (payload.ssoOnly) {
        delete (payload as Record<string, unknown>).password
      }
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        showToast('User created successfully.', 'success')
        setShowCreate(false)
        setCreateForm({
          name: '', email: '',
          role: org?.allowedRoles[0] ?? '',
          password: '', ssoOnly: false,
          allowedModuleIds: org?.allowedModuleIds ?? [],
        })
        fetchUsers()
      } else {
        const d = await res.json()
        showToast(d.error || 'Failed to create user.', 'error')
      }
    } finally {
      setCreateLoading(false)
    }
  }

  const ASD_IDS = ['module-1', 'module-2', 'module-3', 'module-4', 'module-5']
  const CAREERS_IDS = ['careers-module-1', 'careers-module-2', 'careers-module-3', 'careers-module-4']

  const hasAsd = ASD_IDS.some((id) => createForm.allowedModuleIds.includes(id))
  const hasCareers = CAREERS_IDS.some((id) => createForm.allowedModuleIds.includes(id))

  function toggleTrainingPlan(plan: 'asd' | 'careers') {
    const ids = plan === 'asd' ? ASD_IDS : CAREERS_IDS
    const isOn = plan === 'asd' ? hasAsd : hasCareers
    setCreateForm((f) => ({
      ...f,
      allowedModuleIds: isOn
        ? f.allowedModuleIds.filter((m) => !ids.includes(m))
        : [...f.allowedModuleIds, ...ids.filter((id) => !f.allowedModuleIds.includes(id))],
    }))
  }

  if (status !== 'authenticated' || session?.user?.role !== 'ORG_ADMIN') return null

  const allowedRoles = org?.allowedRoles ?? []

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
          {toast.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-600" />
            User Management
          </h1>
          <p className="text-slate-500 mt-1">
            {org ? `${org.name} — manage users, roles, and account status.` : 'Manage users, roles, and account status.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <div className="text-right hidden sm:block">
              <p className="text-2xl font-bold text-slate-900">{data.total}</p>
              <p className="text-xs text-slate-400">total users</p>
            </div>
          )}
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Create User
          </button>
        </div>
      </div>

      {/* Create User Form */}
      {showCreate && (
        <div className="card border-2 border-emerald-200 bg-emerald-50/40 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-emerald-600" />
              New User
            </h2>
            <button
              onClick={() => setShowCreate(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={createUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-calm-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
                  placeholder="Jane Smith"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-calm-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
                  placeholder="jane@example.com"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
                <div className="relative">
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
                    className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg border border-calm-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white text-slate-700"
                  >
                    {allowedRoles.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r] ?? r}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* SSO Only toggle */}
              <div className="flex items-center gap-3 pt-5">
                <button
                  type="button"
                  onClick={() => setCreateForm((f) => ({ ...f, ssoOnly: !f.ssoOnly }))}
                  className={clsx(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-300',
                    createForm.ssoOnly ? 'bg-emerald-500' : 'bg-slate-200'
                  )}
                >
                  <span
                    className={clsx(
                      'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                      createForm.ssoOnly ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
                <span className="text-sm text-slate-700">SSO only (no password)</span>
              </div>
            </div>

            {/* Password — hidden when ssoOnly */}
            {!createForm.ssoOnly && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Temporary Password
                  <span className="ml-1 text-slate-400 font-normal">(user will be prompted to change on first login)</span>
                </label>
                <input
                  type="text"
                  required={!createForm.ssoOnly}
                  minLength={8}
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-calm-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white font-mono"
                  placeholder="Min. 8 characters"
                />
              </div>
            )}

            {/* Training plan access */}
            {org && org.allowedModuleIds.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Training Plans</label>
                <div className="space-y-2">
                  {ASD_IDS.some((id) => org.allowedModuleIds.includes(id)) && (
                    <button
                      type="button"
                      onClick={() => toggleTrainingPlan('asd')}
                      className={clsx(
                        'flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-medium border transition-colors text-left',
                        hasAsd
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700'
                          : 'bg-white text-slate-500 border-calm-200 hover:border-emerald-300 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600'
                      )}
                    >
                      {hasAsd ? <CheckCircle className="h-4 w-4 flex-shrink-0" /> : <div className="h-4 w-4 rounded-full border-2 border-slate-300 flex-shrink-0" />}
                      <div>
                        <p className="font-bold">ASD Awareness Training</p>
                        <p className="text-xs opacity-75">5 modules — early identification for caregivers</p>
                      </div>
                    </button>
                  )}
                  {CAREERS_IDS.some((id) => org.allowedModuleIds.includes(id)) && (
                    <button
                      type="button"
                      onClick={() => toggleTrainingPlan('careers')}
                      className={clsx(
                        'flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-medium border transition-colors text-left',
                        hasCareers
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700'
                          : 'bg-white text-slate-500 border-calm-200 hover:border-emerald-300 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600'
                      )}
                    >
                      {hasCareers ? <CheckCircle className="h-4 w-4 flex-shrink-0" /> : <div className="h-4 w-4 rounded-full border-2 border-slate-300 flex-shrink-0" />}
                      <div>
                        <p className="font-bold">Careers CPD Training</p>
                        <p className="text-xs opacity-75">4 modules — autism-inclusive careers guidance</p>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-xl border border-calm-200 text-sm text-slate-600 hover:bg-calm-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium transition-colors flex items-center gap-2"
              >
                {createLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                Create User
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Role stats */}
      {data && allowedRoles.length > 0 && (
        <div className={clsx('grid gap-4', allowedRoles.length <= 3 ? `grid-cols-${allowedRoles.length}` : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4')}>
          {allowedRoles.map((role) => {
            const count = data.users.filter((u) => u.role === role).length
            const Icon = ROLE_ICONS[role] ?? UserCircle
            const colors = ROLE_COLORS[role] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-600 dark:text-slate-200'
            return (
              <button
                key={role}
                onClick={() => setRoleFilter(roleFilter === role ? '' : role)}
                className={clsx(
                  'card text-left transition-all hover:shadow-md border-2',
                  roleFilter === role ? 'border-emerald-400' : 'border-transparent'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={clsx('p-2 rounded-lg', colors)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900">{count}</p>
                    <p className="text-xs text-slate-500">{ROLE_LABELS[role] ?? role}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-calm-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
          />
        </div>
        <div className="relative">
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
            className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-calm-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white text-slate-700"
          >
            <option value="">All roles</option>
            {allowedRoles.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
        <button
          onClick={fetchUsers}
          className="p-2.5 rounded-xl border border-calm-200 hover:bg-calm-50 transition-colors text-slate-500"
          title="Refresh"
        >
          <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-calm-200 bg-calm-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">User</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Joined</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Activity</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading users…
                  </td>
                </tr>
              ) : data?.users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No users found.
                  </td>
                </tr>
              ) : (
                data?.users.map((user) => {
                  const Icon = ROLE_ICONS[user.role] ?? UserCircle
                  const colors = ROLE_COLORS[user.role] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-600 dark:text-slate-200'
                  const isSelf = user.id === session.user.id
                  const isLoading = actionLoading === user.id

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-calm-100 hover:bg-calm-50 transition-colors"
                    >
                      {/* User info */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {user.name ?? '—'}
                          {isSelf && (
                            <span className="ml-2 text-xs text-emerald-600 font-normal">(you)</span>
                          )}
                          {user.mustChangePassword && (
                            <span className="ml-2 text-xs text-amber-500 font-normal">must change password</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{user.email}</div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        {isSelf ? (
                          <span className={clsx('inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full', colors)}>
                            <Icon className="h-3 w-3" />
                            {ROLE_LABELS[user.role] ?? user.role}
                          </span>
                        ) : (
                          <div className="relative">
                            <select
                              value={user.role}
                              disabled={isLoading}
                              onChange={(e) => updateUser(user.id, { role: e.target.value })}
                              className={clsx(
                                'text-xs font-semibold px-2 py-0.5 rounded-full border-0 focus:ring-2 focus:ring-emerald-300 cursor-pointer appearance-none pr-5',
                                colors
                              )}
                            >
                              {allowedRoles.map((r) => (
                                <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-0.5 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none opacity-60" />
                          </div>
                        )}
                      </td>

                      {/* Active status */}
                      <td className="px-4 py-3">
                        {isSelf ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Active
                          </span>
                        ) : (
                          <button
                            disabled={isLoading}
                            onClick={() => updateUser(user.id, { active: !user.active })}
                            className={clsx(
                              'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-colors',
                              user.active
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            )}
                          >
                            {user.active ? (
                              <><CheckCircle className="h-3 w-3" />Active</>
                            ) : (
                              <><XCircle className="h-3 w-3" />Inactive</>
                            )}
                          </button>
                        )}
                      </td>

                      {/* Joined date */}
                      <td className="px-4 py-3 text-slate-400 hidden md:table-cell text-xs">
                        {new Date(user.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </td>

                      {/* Activity counts */}
                      <td className="px-4 py-3 text-slate-400 hidden lg:table-cell text-xs">
                        {user.role === 'CAREGIVER' && (
                          <span className="mr-3">{user._count.children} children</span>
                        )}
                        <span>{user._count.trainingProgress} lessons</span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        {!isSelf && (
                          <div className="flex items-center justify-center gap-1">
                            <ModuleToggleButton user={user} org={org} updateUser={updateUser} />
                            <button
                              disabled={isLoading}
                              onClick={() => deleteUser(user.id, user.name)}
                              className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Delete user"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-calm-200">
            <p className="text-xs text-slate-400">
              Page {data.page} of {data.totalPages} &middot; {data.total} users
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-calm-200 text-xs font-medium text-slate-600 hover:bg-calm-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                disabled={page === data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-calm-200 text-xs font-medium text-slate-600 hover:bg-calm-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ──────────────────────────── Module Toggle Button ──────────────────────────── */

const ASD_IDS_LIST = ['module-1', 'module-2', 'module-3', 'module-4', 'module-5']
const CAREERS_IDS_LIST = ['careers-module-1', 'careers-module-2', 'careers-module-3', 'careers-module-4']

function ModuleToggleButton({
  user,
  org,
  updateUser,
}: {
  user: UserRow
  org: OrgInfo | null
  updateUser: (userId: string, patch: Record<string, unknown>) => Promise<void>
}) {
  const [open, setOpen] = useState(false)

  if (!org) return null

  const userHasAsd = ASD_IDS_LIST.some((id) => user.allowedModuleIds.includes(id))
  const userHasCareers = CAREERS_IDS_LIST.some((id) => user.allowedModuleIds.includes(id))
  const orgHasAsd = ASD_IDS_LIST.some((id) => org.allowedModuleIds.includes(id))
  const orgHasCareers = CAREERS_IDS_LIST.some((id) => org.allowedModuleIds.includes(id))

  function toggle(plan: 'asd' | 'careers') {
    const ids = plan === 'asd' ? ASD_IDS_LIST : CAREERS_IDS_LIST
    const isOn = plan === 'asd' ? userHasAsd : userHasCareers
    const newModules = isOn
      ? user.allowedModuleIds.filter((m) => !ids.includes(m))
      : [...user.allowedModuleIds, ...ids.filter((id) => !user.allowedModuleIds.includes(id))]
    updateUser(user.id, { allowedModuleIds: newModules })
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
        title="Edit training access"
      >
        <BookOpen className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-64 bg-white dark:bg-slate-800 rounded-xl border border-calm-200 dark:border-slate-700 shadow-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-slate-500 mb-2">Training Access</p>
            {orgHasAsd && (
              <button
                type="button"
                onClick={() => toggle('asd')}
                className={clsx(
                  'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium border transition-colors text-left',
                  userHasAsd
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-white text-slate-500 border-calm-200 hover:border-emerald-300'
                )}
              >
                {userHasAsd ? <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" /> : <div className="h-3.5 w-3.5 rounded-full border-2 border-slate-300 flex-shrink-0" />}
                ASD Awareness Training
              </button>
            )}
            {orgHasCareers && (
              <button
                type="button"
                onClick={() => toggle('careers')}
                className={clsx(
                  'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium border transition-colors text-left',
                  userHasCareers
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-white text-slate-500 border-calm-200 hover:border-emerald-300'
                )}
              >
                {userHasCareers ? <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" /> : <div className="h-3.5 w-3.5 rounded-full border-2 border-slate-300 flex-shrink-0" />}
                Careers CPD Training
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
