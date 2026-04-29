'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  Users,
  Plus,
  Pencil,
  Crown,
  Shield,
  X,
  Check,
  AlertCircle,
  Loader2,
  Search,
} from 'lucide-react'
import { clsx } from 'clsx'
import { PERMISSION_LABELS, ALL_CHARITY_PERMISSIONS } from '@/lib/rbac'
import { HowToPanel } from '@/components/howto/panel'
import UsersHowTo from '@/components/howto/super-admin/users'

interface CharityUser {
  id: string
  name: string | null
  email: string
  role: 'SUPER_ADMIN' | 'CHARITY_EMPLOYEE'
  active: boolean
  charityPermissions: string[]
  createdAt: string
}

type FormMode = 'closed' | 'create' | 'edit'

export default function CharityUsersPage() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<CharityUser[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formMode, setFormMode] = useState<FormMode>('closed')
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Form fields
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole] = useState<'SUPER_ADMIN' | 'CHARITY_EMPLOYEE'>('CHARITY_EMPLOYEE')
  const [formPermissions, setFormPermissions] = useState<string[]>([])
  const [formActive, setFormActive] = useState(true)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/users')
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      setUsers(data)
    } catch {
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const resetForm = () => {
    setFormName('')
    setFormEmail('')
    setFormPassword('')
    setFormRole('CHARITY_EMPLOYEE')
    setFormPermissions([])
    setFormActive(true)
    setFormError('')
    setEditingUserId(null)
  }

  const openCreate = () => {
    resetForm()
    setFormMode('create')
  }

  const openEdit = (user: CharityUser) => {
    setFormName(user.name ?? '')
    setFormEmail(user.email)
    setFormPassword('')
    setFormRole(user.role)
    setFormPermissions(user.charityPermissions)
    setFormActive(user.active)
    setFormError('')
    setEditingUserId(user.id)
    setFormMode('edit')
  }

  const closeForm = () => {
    setFormMode('closed')
    resetForm()
  }

  const togglePermission = (perm: string) => {
    setFormPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    )
  }

  const handleSubmit = async () => {
    setFormError('')
    setSaving(true)
    try {
      if (formMode === 'create') {
        if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
          setFormError('Name, email, and password are required')
          setSaving(false)
          return
        }
        const res = await fetch('/api/super-admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName.trim(),
            email: formEmail.trim(),
            password: formPassword,
            role: formRole,
            charityPermissions: formRole === 'CHARITY_EMPLOYEE' ? formPermissions : [],
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          setFormError(data.error ?? 'Failed to create user')
          setSaving(false)
          return
        }
      } else if (formMode === 'edit' && editingUserId) {
        const body: Record<string, unknown> = {
          name: formName.trim(),
          role: formRole,
          charityPermissions: formRole === 'CHARITY_EMPLOYEE' ? formPermissions : [],
          active: formActive,
        }
        if (formPassword.trim()) {
          body.password = formPassword
        }
        const res = await fetch(`/api/super-admin/users/${editingUserId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          setFormError(data.error ?? 'Failed to update user')
          setSaving(false)
          return
        }
      }

      closeForm()
      await fetchUsers()
    } catch {
      setFormError('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  const isSelf = (userId: string) => session?.user?.id === userId

  if (session?.user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Access Denied</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Only Charity Admins can manage charity-level users.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Users className="h-7 w-7 text-primary-500" />
            Charity Users
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage Charity Admin and Charity Employee accounts.</p>
        </div>
        {formMode === 'closed' && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add User
          </button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Create / Edit Form */}
      {formMode !== 'closed' && (
        <div className="card p-6 space-y-4 border-2 border-primary-200 dark:border-primary-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {formMode === 'create' ? 'Add Charity User' : 'Edit Charity User'}
            </h2>
            <button onClick={closeForm} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <X className="h-5 w-5" />
            </button>
          </div>

          {formError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-700 dark:text-red-300">{formError}</p>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
              placeholder="Full name"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
            <input
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              disabled={formMode === 'edit'}
              className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white disabled:opacity-50"
              placeholder="user@example.com"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {formMode === 'create' ? 'Password' : 'New Password (leave empty to keep current)'}
            </label>
            <input
              type="password"
              value={formPassword}
              onChange={(e) => setFormPassword(e.target.value)}
              className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
              placeholder={formMode === 'create' ? 'Min 8 characters' : 'Leave empty to keep current'}
            />
          </div>

          {/* Role toggle */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Role</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormRole('SUPER_ADMIN')}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                  formRole === 'SUPER_ADMIN'
                    ? 'border-primary-400 bg-primary-50 text-primary-700 dark:border-primary-500 dark:bg-primary-900/30 dark:text-primary-400'
                    : 'border-calm-200 bg-calm-50 text-slate-600 hover:border-calm-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300'
                )}
              >
                <Crown className="h-4 w-4" />
                Charity Admin
              </button>
              <button
                type="button"
                onClick={() => setFormRole('CHARITY_EMPLOYEE')}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                  formRole === 'CHARITY_EMPLOYEE'
                    ? 'border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'border-calm-200 bg-calm-50 text-slate-600 hover:border-calm-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300'
                )}
              >
                <Shield className="h-4 w-4" />
                Charity Employee
              </button>
            </div>
          </div>

          {/* Permissions (only shown for Charity Employee) */}
          {formRole === 'CHARITY_EMPLOYEE' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Permissions</label>
              <div className="space-y-2">
                {ALL_CHARITY_PERMISSIONS.map((perm) => (
                  <label key={perm} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.includes(perm)}
                      onChange={() => togglePermission(perm)}
                      className="h-4 w-4 rounded border-calm-300 text-primary-600 focus:ring-primary-500 dark:border-slate-500 dark:bg-slate-700"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{PERMISSION_LABELS[perm]}</span>
                  </label>
                ))}
              </div>
              {formPermissions.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  No permissions selected — this user won&apos;t be able to access any management areas.
                </p>
              )}
            </div>
          )}

          {formRole === 'SUPER_ADMIN' && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Charity Admins have full access to all areas. No individual permissions needed.
            </p>
          )}

          {/* Active toggle (edit only) */}
          {formMode === 'edit' && (
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Active</label>
              <button
                type="button"
                onClick={() => {
                  if (editingUserId && isSelf(editingUserId)) return
                  setFormActive(!formActive)
                }}
                disabled={editingUserId ? isSelf(editingUserId) : false}
                className={clsx(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  formActive ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600',
                  editingUserId && isSelf(editingUserId) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                )}
              >
                <span
                  className={clsx(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    formActive ? 'translate-x-6' : 'translate-x-1',
                  )}
                />
              </button>
              {editingUserId && isSelf(editingUserId) && (
                <span className="text-xs text-slate-400">You cannot deactivate yourself</span>
              )}
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeForm}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {formMode === 'create' ? 'Create User' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Users List */}
      {loading ? (
        <div className="card p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500 mx-auto" />
          <p className="text-sm text-slate-400 mt-2">Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="card p-8 text-center">
          <Users className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No charity-level users found.</p>
        </div>
      ) : (() => {
        const q = search.trim().toLowerCase()
        const filtered = q
          ? users.filter((u) =>
              (u.name ?? '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
            )
          : users
        return (
        <div className="card overflow-hidden p-0">
          {/* Search + count */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-calm-200 dark:border-slate-700 bg-calm-50 dark:bg-slate-800">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email"
                className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {filtered.length} of {users.length}
            </span>
          </div>
          {/* Scrollable table — max ~5 rows visible, scroll the rest. Sticky header. */}
          <div className="overflow-auto max-h-[22rem]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-calm-200 dark:border-slate-700 bg-calm-50 dark:bg-slate-800">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Role</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 hidden md:table-cell">Permissions</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Active</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className={filtered.length > 0 ? 'animate-stagger' : ''}>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">
                      No users match &ldquo;{search}&rdquo;.
                    </td>
                  </tr>
                )}
                {filtered.map((user) => (
                  <tr
                    key={user.id}
                    className={clsx(
                      'border-b border-calm-100 dark:border-slate-700 hover:bg-calm-50 dark:hover:bg-slate-800/50 transition-colors',
                      !user.active && 'opacity-60',
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                      <span className="inline-flex items-center gap-1.5">
                        {user.name || <span className="text-slate-400 italic">Unnamed</span>}
                        {isSelf(user.id) && (
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                            You
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{user.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
                          user.role === 'SUPER_ADMIN'
                            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
                        )}
                      >
                        {user.role === 'SUPER_ADMIN' ? (
                          <><Crown className="h-3 w-3" /> Admin</>
                        ) : (
                          <><Shield className="h-3 w-3" /> Employee</>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {user.role === 'SUPER_ADMIN' ? (
                        <span className="text-xs text-slate-400 dark:text-slate-500">Full access</span>
                      ) : user.charityPermissions.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {user.charityPermissions.map((p) => (
                            <span
                              key={p}
                              className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded"
                            >
                              {PERMISSION_LABELS[p] ?? p}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-amber-500">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                          <Check className="h-3 w-3" /> Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                          <X className="h-3 w-3" /> No
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEdit(user)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-calm-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        title="Edit user"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )
      })()}

      <HowToPanel>
        <UsersHowTo />
      </HowToPanel>
    </div>
  )
}
