'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, Building2, Check } from 'lucide-react'
import { clsx } from 'clsx'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SurveyTargetConfig {
  role: string | null
  organisationId: string | null
}

interface Organisation {
  id: string
  name: string
  slug: string
  active: boolean
}

interface SurveyTargetPickerProps {
  value: SurveyTargetConfig[]
  onChange: (targets: SurveyTargetConfig[]) => void
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const LEAF_ROLES: { value: string; label: string }[] = [
  { value: 'CAREGIVER', label: 'Practitioner' },
  { value: 'CAREER_DEV_OFFICER', label: 'Career Dev Officer' },
  { value: 'STUDENT', label: 'Student' },
  { value: 'INTERN', label: 'Intern' },
  { value: 'EMPLOYEE', label: 'Employee' },
]

// ─── Helper: build cartesian product ──────────────────────────────────────────

function buildTargets(
  allRoles: boolean,
  selectedRoles: string[],
  allOrgs: boolean,
  selectedOrgIds: string[]
): SurveyTargetConfig[] {
  const roles: (string | null)[] = allRoles ? [null] : selectedRoles
  const orgs: (string | null)[] = allOrgs ? [null] : selectedOrgIds

  const targets: SurveyTargetConfig[] = []
  for (const role of roles) {
    for (const organisationId of orgs) {
      targets.push({ role, organisationId })
    }
  }
  return targets
}

// ─── Toggle button ─────────────────────────────────────────────────────────────

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

// ─── Main component ────────────────────────────────────────────────────────────

export function SurveyTargetPicker({ value, onChange }: SurveyTargetPickerProps) {
  const [organisations, setOrganisations] = useState<Organisation[]>([])
  const [loadingOrgs, setLoadingOrgs] = useState(true)

  // Derive current selection state from the `value` prop
  const allRolesSelected = value.some((t) => t.role === null)
  const allOrgsSelected = value.some((t) => t.organisationId === null)

  const selectedRoles = allRolesSelected
    ? []
    : Array.from(new Set(value.map((t) => t.role).filter((r): r is string => r !== null)))

  const selectedOrgIds = allOrgsSelected
    ? []
    : Array.from(
        new Set(value.map((t) => t.organisationId).filter((o): o is string => o !== null))
      )

  // ─── Fetch orgs on mount ───────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false
    setLoadingOrgs(true)

    fetch('/api/super-admin/organisations')
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: Organisation[]) => {
        if (!cancelled) setOrganisations(data)
      })
      .catch(() => {
        if (!cancelled) setOrganisations([])
      })
      .finally(() => {
        if (!cancelled) setLoadingOrgs(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // ─── Emit helper ──────────────────────────────────────────────────────────

  const emit = useCallback(
    (
      nextAllRoles: boolean,
      nextSelectedRoles: string[],
      nextAllOrgs: boolean,
      nextSelectedOrgIds: string[]
    ) => {
      onChange(buildTargets(nextAllRoles, nextSelectedRoles, nextAllOrgs, nextSelectedOrgIds))
    },
    [onChange]
  )

  // ─── Role handlers ────────────────────────────────────────────────────────

  const handleToggleAllRoles = () => {
    if (allRolesSelected) {
      // Deselect all — fall back to no roles selected
      emit(false, [], allOrgsSelected, selectedOrgIds)
    } else {
      // When selecting "All roles" and no orgs are chosen yet, default to "All orgs" too
      const needDefaultOrgs = !allOrgsSelected && selectedOrgIds.length === 0
      emit(true, [], needDefaultOrgs ? true : allOrgsSelected, needDefaultOrgs ? [] : selectedOrgIds)
    }
  }

  const handleToggleRole = (role: string) => {
    const next = selectedRoles.includes(role)
      ? selectedRoles.filter((r) => r !== role)
      : [...selectedRoles, role]
    // If selecting a role and no orgs are chosen yet, default to "All orgs"
    const needDefaultOrgs = !allOrgsSelected && selectedOrgIds.length === 0 && next.length > 0
    emit(false, next, needDefaultOrgs ? true : allOrgsSelected, needDefaultOrgs ? [] : selectedOrgIds)
  }

  // ─── Org handlers ─────────────────────────────────────────────────────────

  const handleToggleAllOrgs = () => {
    if (allOrgsSelected) {
      emit(allRolesSelected, selectedRoles, false, [])
    } else {
      // When selecting "All orgs" and no roles are chosen yet, default to "All roles" too
      const needDefaultRoles = !allRolesSelected && selectedRoles.length === 0
      emit(needDefaultRoles ? true : allRolesSelected, needDefaultRoles ? [] : selectedRoles, true, [])
    }
  }

  const handleToggleOrg = (orgId: string) => {
    const next = selectedOrgIds.includes(orgId)
      ? selectedOrgIds.filter((o) => o !== orgId)
      : [...selectedOrgIds, orgId]
    // If selecting an org and no roles are chosen yet, default to "All roles"
    const needDefaultRoles = !allRolesSelected && selectedRoles.length === 0 && next.length > 0
    emit(needDefaultRoles ? true : allRolesSelected, needDefaultRoles ? [] : selectedRoles, false, next)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* ── Target Roles ──────────────────────────────────────────────────── */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Target Roles
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <ToggleButton selected={allRolesSelected} onClick={handleToggleAllRoles}>
            All roles
          </ToggleButton>

          {!allRolesSelected &&
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
      </div>

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
            <ToggleButton selected={allOrgsSelected} onClick={handleToggleAllOrgs}>
              All organisations
            </ToggleButton>

            {!allOrgsSelected &&
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
      </div>

      {/* ── Summary ───────────────────────────────────────────────────────── */}
      {value.length > 0 && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {value.length === 1 && value[0].role === null && value[0].organisationId === null
            ? 'Targeting all roles across all organisations.'
            : `${value.length} target combination${value.length === 1 ? '' : 's'} selected.`}
        </p>
      )}
    </div>
  )
}
