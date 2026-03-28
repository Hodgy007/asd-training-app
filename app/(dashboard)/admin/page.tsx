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
} from 'lucide-react'
import { clsx } from 'clsx'

type Role = 'CAREGIVER' | 'CAREER_DEV_OFFICER' | 'ADMIN'

interface UserRow {
  id: string
  name: string | null
  email: string
  role: Role
  active: boolean
  createdAt: string
  _count: { children: number; trainingProgress: number }
}

interface UsersResponse {
  users: UserRow[]
  total: number
  page: number
  totalPages: number
}

const ROLE_LABELS: Record<Role, string> = {
  CAREGIVER: 'Caregiver',
  CAREER_DEV_OFFICER: 'Careers Professional',
  ADMIN: 'Admin',
}

const ROLE_COLORS: Record<Role, string> = {
  CAREGIVER: 'bg-orange-100 text-orange-700',
  CAREER_DEV_OFFICER: 'bg-blue-100 text-blue-700',
  ADMIN: 'bg-purple-100 text-purple-700',
}

const ROLE_ICONS: Record<Role, React.ElementType> = {
  CAREGIVER: UserCircle,
  CAREER_DEV_OFFICER: Briefcase,
  ADMIN: ShieldCheck,
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<UsersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && session?.user?.role !== 'ADMIN') router.push('/dashboard')
  }, [status, session, router])

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

  async function updateUser(userId: string, patch: Partial<{ role: Role; active: boolean }>) {
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

  if (status !== 'authenticated' || session?.user?.role !== 'ADMIN') return null

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={clsx(
            'fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2',
            toast.type === 'success'
              ? 'bg-sage-600 text-white'
              : 'bg-red-600 text-white'
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
            <ShieldCheck className="h-6 w-6 text-purple-600" />
            Admin Panel
          </h1>
          <p className="text-slate-500 mt-1">Manage users, roles, and account status.</p>
        </div>
        {data && (
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">{data.total}</p>
            <p className="text-xs text-slate-400">total users</p>
          </div>
        )}
      </div>

      {/* Stats row */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          {(['CAREGIVER', 'CAREER_DEV_OFFICER', 'ADMIN'] as Role[]).map((role) => {
            const count = data.users.filter((u) => u.role === role).length
            const Icon = ROLE_ICONS[role]
            return (
              <button
                key={role}
                onClick={() => setRoleFilter(roleFilter === role ? '' : role)}
                className={clsx(
                  'card text-left transition-all hover:shadow-md border-2',
                  roleFilter === role ? 'border-purple-400' : 'border-transparent'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={clsx('p-2 rounded-lg', ROLE_COLORS[role])}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900">{count}</p>
                    <p className="text-xs text-slate-500">{ROLE_LABELS[role]}</p>
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
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-calm-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
          />
        </div>
        <div className="relative">
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
            className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-calm-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white text-slate-700"
          >
            <option value="">All roles</option>
            <option value="CAREGIVER">Caregiver</option>
            <option value="CAREER_DEV_OFFICER">Careers Professional</option>
            <option value="ADMIN">Admin</option>
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
                  const Icon = ROLE_ICONS[user.role]
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
                            <span className="ml-2 text-xs text-purple-500 font-normal">(you)</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{user.email}</div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        {isSelf ? (
                          <span className={clsx('inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full', ROLE_COLORS[user.role])}>
                            <Icon className="h-3 w-3" />
                            {ROLE_LABELS[user.role]}
                          </span>
                        ) : (
                          <select
                            value={user.role}
                            disabled={isLoading}
                            onChange={(e) =>
                              updateUser(user.id, { role: e.target.value as Role })
                            }
                            className={clsx(
                              'text-xs font-semibold px-2 py-0.5 rounded-full border-0 focus:ring-2 focus:ring-purple-300 cursor-pointer',
                              ROLE_COLORS[user.role]
                            )}
                          >
                            <option value="CAREGIVER">Caregiver</option>
                            <option value="CAREER_DEV_OFFICER">Careers Professional</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                        )}
                      </td>

                      {/* Active status */}
                      <td className="px-4 py-3">
                        {isSelf ? (
                          <span className="inline-flex items-center gap-1 text-xs text-sage-600">
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
                                ? 'bg-sage-100 text-sage-700 hover:bg-sage-200'
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
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Activity counts */}
                      <td className="px-4 py-3 text-slate-400 hidden lg:table-cell text-xs">
                        {user.role !== 'CAREER_DEV_OFFICER' && (
                          <span className="mr-3">{user._count.children} children</span>
                        )}
                        <span>{user._count.trainingProgress} lessons</span>
                      </td>

                      {/* Delete */}
                      <td className="px-4 py-3 text-center">
                        {!isSelf && (
                          <button
                            disabled={isLoading}
                            onClick={() => deleteUser(user.id, user.name)}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete user"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
