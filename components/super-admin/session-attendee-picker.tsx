'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Users, Building2, Check, X, Search, UserPlus } from 'lucide-react'
import { clsx } from 'clsx'

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface AttendeePickerConfig {
  allOrgs: boolean
  selectedOrgIds: string[]
  allRoles: boolean
  selectedRoles: string[]
  userIds: string[]
  includeCharityStaff: boolean
}

interface Organisation {
  id: string
  name: string
  slug: string
  active: boolean
}

interface UserResult {
  id: string
  name: string | null
  email: string
  role: string
}

interface SessionAttendeePickerProps {
  value: AttendeePickerConfig
  onChange: (config: AttendeePickerConfig) => void
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const LEAF_ROLES: { value: string; label: string }[] = [
  { value: 'CAREGIVER', label: 'Practitioner' },
  { value: 'FAMILY_CARER', label: 'Parent/Friend/Relative/Carer' },
  { value: 'CAREER_DEV_OFFICER', label: 'Career Dev Officer' },
  { value: 'STUDENT', label: 'Student' },
  { value: 'INTERN', label: 'Intern' },
  { value: 'EMPLOYEE', label: 'Employee' },
]

// ─── Toggle button ───────────────────────────────────────────────────────────

function ToggleButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
        selected
          ? 'border-primary-400 bg-primary-50 text-primary-700 dark:border-primary-500 dark:bg-primary-900/30 dark:text-primary-400'
          : 'border-calm-200 bg-calm-50 text-slate-600 hover:border-calm-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:border-slate-500'
      )}
    >
      {selected && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
      {children}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SessionAttendeePicker({ value, onChange }: SessionAttendeePickerProps) {
  const [organisations, setOrganisations] = useState<Organisation[]>([])
  const [loadingOrgs, setLoadingOrgs] = useState(true)

  // ─── Internal state (independent per dimension) ───────────────────────────
  const [allOrgs, setAllOrgs] = useState(value.allOrgs)
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>(value.selectedOrgIds)
  const [allRoles, setAllRoles] = useState(value.allRoles)
  const [selectedRoles, setSelectedRoles] = useState<string[]>(value.selectedRoles)
  const [includeCharityStaff, setIncludeCharityStaff] = useState(value.includeCharityStaff)
  const [userIds, setUserIds] = useState<string[]>(value.userIds)

  // Seed internal state from value prop on mount only
  const initialised = useRef(false)
  useEffect(() => {
    if (!initialised.current) {
      setAllOrgs(value.allOrgs)
      setSelectedOrgIds(value.selectedOrgIds)
      setAllRoles(value.allRoles)
      setSelectedRoles(value.selectedRoles)
      setIncludeCharityStaff(value.includeCharityStaff)
      setUserIds(value.userIds)
      initialised.current = true
    }
  }, [value])

  // ─── User search state ────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserResult[]>([])
  const [selectedUsers, setSelectedUsers] = useState<UserResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // ─── Emit to parent ───────────────────────────────────────────────────────
  const emit = useCallback(
    (
      ao: boolean,
      so: string[],
      ar: boolean,
      sr: string[],
      ids: string[],
      ics: boolean
    ) => {
      onChange({ allOrgs: ao, selectedOrgIds: so, allRoles: ar, selectedRoles: sr, userIds: ids, includeCharityStaff: ics })
    },
    [onChange]
  )

  // ─── Fetch orgs on mount ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setLoadingOrgs(true)

    fetch('/api/super-admin/organisations')
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: Organisation[]) => {
        if (!cancelled) setOrganisations(data.filter((o) => o.active))
      })
      .catch(() => {
        if (!cancelled) setOrganisations([])
      })
      .finally(() => {
        if (!cancelled) setLoadingOrgs(false)
      })

    return () => { cancelled = true }
  }, [])

  // ─── Close dropdown on outside click ─────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ─── Debounced user search ────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    debounceRef.current = setTimeout(() => {
      let cancelled = false
      setSearchLoading(true)

      fetch(`/api/super-admin/users/search?search=${encodeURIComponent(searchQuery.trim())}`)
        .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
        .then((data: UserResult[]) => {
          if (!cancelled) {
            // Filter out already-selected users
            setSearchResults(data.filter((u) => !userIds.includes(u.id)))
            setShowDropdown(true)
          }
        })
        .catch(() => {
          if (!cancelled) setSearchResults([])
        })
        .finally(() => {
          if (!cancelled) setSearchLoading(false)
        })

      return () => { cancelled = true }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchQuery, userIds])

  // ─── Org handlers ─────────────────────────────────────────────────────────
  const handleToggleAllOrgs = () => {
    const nextAllOrgs = !allOrgs
    const nextSelectedOrgIds = nextAllOrgs ? [] : selectedOrgIds
    setAllOrgs(nextAllOrgs)
    if (nextAllOrgs) setSelectedOrgIds([])
    emit(nextAllOrgs, nextSelectedOrgIds, allRoles, selectedRoles, userIds, includeCharityStaff)
  }

  const handleToggleOrg = (orgId: string) => {
    const nextSelected = selectedOrgIds.includes(orgId)
      ? selectedOrgIds.filter((o) => o !== orgId)
      : [...selectedOrgIds, orgId]
    setAllOrgs(false)
    setSelectedOrgIds(nextSelected)
    emit(false, nextSelected, allRoles, selectedRoles, userIds, includeCharityStaff)
  }

  // ─── Role handlers ────────────────────────────────────────────────────────
  const handleToggleAllRoles = () => {
    const nextAllRoles = !allRoles
    const nextSelectedRoles = nextAllRoles ? [] : selectedRoles
    setAllRoles(nextAllRoles)
    if (nextAllRoles) setSelectedRoles([])
    emit(allOrgs, selectedOrgIds, nextAllRoles, nextSelectedRoles, userIds, includeCharityStaff)
  }

  const handleToggleRole = (role: string) => {
    const nextSelected = selectedRoles.includes(role)
      ? selectedRoles.filter((r) => r !== role)
      : [...selectedRoles, role]
    setAllRoles(false)
    setSelectedRoles(nextSelected)
    emit(allOrgs, selectedOrgIds, false, nextSelected, userIds, includeCharityStaff)
  }

  // ─── Charity staff handler ────────────────────────────────────────────────
  const handleToggleCharityStaff = () => {
    const next = !includeCharityStaff
    setIncludeCharityStaff(next)
    emit(allOrgs, selectedOrgIds, allRoles, selectedRoles, userIds, next)
  }

  // ─── User selection handlers ──────────────────────────────────────────────
  const handleSelectUser = (user: UserResult) => {
    if (userIds.includes(user.id)) return
    const nextUserIds = [...userIds, user.id]
    const nextSelectedUsers = [...selectedUsers, user]
    setUserIds(nextUserIds)
    setSelectedUsers(nextSelectedUsers)
    setSearchQuery('')
    setSearchResults([])
    setShowDropdown(false)
    emit(allOrgs, selectedOrgIds, allRoles, selectedRoles, nextUserIds, includeCharityStaff)
  }

  const handleRemoveUser = (userId: string) => {
    const nextUserIds = userIds.filter((id) => id !== userId)
    const nextSelectedUsers = selectedUsers.filter((u) => u.id !== userId)
    setUserIds(nextUserIds)
    setSelectedUsers(nextSelectedUsers)
    emit(allOrgs, selectedOrgIds, allRoles, selectedRoles, nextUserIds, includeCharityStaff)
  }

  // ─── Derived summary ──────────────────────────────────────────────────────
  const hasOrgSelection = allOrgs || selectedOrgIds.length > 0
  const hasRoleSelection = allRoles || selectedRoles.length > 0
  const hasAnySelection = hasOrgSelection || hasRoleSelection || userIds.length > 0 || includeCharityStaff

  function buildSummary(): string {
    const parts: string[] = []
    if (allOrgs) parts.push('all organisations')
    else if (selectedOrgIds.length > 0) parts.push(`${selectedOrgIds.length} org${selectedOrgIds.length > 1 ? 's' : ''}`)

    if (allRoles) parts.push('all roles')
    else if (selectedRoles.length > 0) parts.push(`${selectedRoles.length} role${selectedRoles.length > 1 ? 's' : ''}`)

    if (includeCharityStaff) parts.push('charity staff')
    if (userIds.length > 0) parts.push(`${userIds.length} individual user${userIds.length > 1 ? 's' : ''}`)

    if (parts.length === 0) return 'No attendees selected.'
    return `Inviting: ${parts.join(', ')}.`
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* ── Target Organisations ──────────────────────────────────────────── */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Target Organisations
          </span>
        </div>

        {loadingOrgs ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">Loading organisations…</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <ToggleButton selected={allOrgs} onClick={handleToggleAllOrgs}>
              All organisations
            </ToggleButton>

            {!allOrgs &&
              organisations.map((org) => (
                <ToggleButton
                  key={org.id}
                  selected={selectedOrgIds.includes(org.id)}
                  onClick={() => handleToggleOrg(org.id)}
                >
                  {org.name}
                </ToggleButton>
              ))}
          </div>
        )}

        {!hasOrgSelection && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
            Select at least one organisation (or add individual users below).
          </p>
        )}
      </div>

      {/* ── Target Roles ──────────────────────────────────────────────────── */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Target Roles
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <ToggleButton selected={allRoles} onClick={handleToggleAllRoles}>
            All roles
          </ToggleButton>

          {!allRoles &&
            LEAF_ROLES.map((r) => (
              <ToggleButton
                key={r.value}
                selected={selectedRoles.includes(r.value)}
                onClick={() => handleToggleRole(r.value)}
              >
                {r.label}
              </ToggleButton>
            ))}
        </div>

        {hasOrgSelection && !hasRoleSelection && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
            Select at least one role.
          </p>
        )}
      </div>

      {/* ── Include charity staff ─────────────────────────────────────────── */}
      <div>
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeCharityStaff}
            onChange={handleToggleCharityStaff}
            className="h-4 w-4 rounded border-calm-300 text-primary-600 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-700"
          />
          <span className="text-sm text-slate-700 dark:text-slate-200">
            Include charity staff (admins &amp; employees)
          </span>
        </label>
      </div>

      {/* ── Individual user search ────────────────────────────────────────── */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Add Individual Users
          </span>
        </div>

        {/* Selected user chips */}
        {selectedUsers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {selectedUsers.map((user) => (
              <span
                key={user.id}
                className="inline-flex items-center gap-1 rounded-full bg-primary-50 border border-primary-200 px-2.5 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:border-primary-700 dark:text-primary-300"
              >
                {user.name ?? user.email}
                <button
                  type="button"
                  onClick={() => handleRemoveUser(user.id)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-primary-100 dark:hover:bg-primary-800 transition-colors"
                  aria-label={`Remove ${user.name ?? user.email}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Search input + dropdown */}
        <div className="relative">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setShowDropdown(true)
              }}
              placeholder="Search by name or email…"
              className="w-full rounded-lg border border-calm-200 bg-white py-2 pl-8 pr-3 text-sm text-slate-700 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-primary-500"
            />
            {searchLoading && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-primary-500" />
            )}
          </div>

          {showDropdown && searchResults.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute z-10 mt-1 w-full rounded-lg border border-calm-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800"
            >
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleSelectUser(user)
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-calm-50 dark:hover:bg-slate-700 first:rounded-t-lg last:rounded-b-lg transition-colors"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-700 dark:text-slate-200">
                      {user.name ?? '(no name)'}
                    </p>
                    <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                      {user.email} &middot; {user.role}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {showDropdown && !searchLoading && searchResults.length === 0 && searchQuery.trim().length >= 2 && (
            <div
              ref={dropdownRef}
              className="absolute z-10 mt-1 w-full rounded-lg border border-calm-200 bg-white px-3 py-2 text-sm text-slate-400 shadow-lg dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500"
            >
              No users found.
            </div>
          )}
        </div>
      </div>

      {/* ── Summary ───────────────────────────────────────────────────────── */}
      {hasAnySelection && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {buildSummary()}
        </p>
      )}
    </div>
  )
}
