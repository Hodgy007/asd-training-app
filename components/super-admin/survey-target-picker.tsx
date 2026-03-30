'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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

  // If either dimension is empty, no valid targets can be produced
  if (roles.length === 0 || orgs.length === 0) return []

  const targets: SurveyTargetConfig[] = []
  for (const role of roles) {
    for (const organisationId of orgs) {
      targets.push({ role, organisationId })
    }
  }
  return targets
}

// ─── Derive internal state from value prop ────────────────────────────────────

function deriveState(value: SurveyTargetConfig[]) {
  const allRoles = value.some((t) => t.role === null)
  const allOrgs = value.some((t) => t.organisationId === null)
  const selectedRoles = allRoles
    ? []
    : Array.from(new Set(value.map((t) => t.role).filter((r): r is string => r !== null)))
  const selectedOrgIds = allOrgs
    ? []
    : Array.from(new Set(value.map((t) => t.organisationId).filter((o): o is string => o !== null)))
  return { allRoles, selectedRoles, allOrgs, selectedOrgIds }
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

  // ─── Internal state (independent of cartesian product) ────────────────────
  // This prevents one empty dimension from wiping out the other.
  const [allRoles, setAllRoles] = useState(false)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [allOrgs, setAllOrgs] = useState(false)
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([])

  // Seed internal state from value prop on mount
  const initialised = useRef(false)
  useEffect(() => {
    if (!initialised.current && value.length > 0) {
      const derived = deriveState(value)
      setAllRoles(derived.allRoles)
      setSelectedRoles(derived.selectedRoles)
      setAllOrgs(derived.allOrgs)
      setSelectedOrgIds(derived.selectedOrgIds)
      initialised.current = true
    }
  }, [value])

  // ─── Emit changes to parent whenever internal state changes ───────────────
  const emit = useCallback(
    (ar: boolean, sr: string[], ao: boolean, so: string[]) => {
      const targets = buildTargets(ar, sr, ao, so)
      onChange(targets)
    },
    [onChange]
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

  // ─── Role handlers ────────────────────────────────────────────────────────

  const handleToggleAllRoles = () => {
    const nextAllRoles = !allRoles
    const nextSelectedRoles: string[] = []

    setAllRoles(nextAllRoles)
    if (nextAllRoles) setSelectedRoles([])

    emit(
      nextAllRoles,
      nextAllRoles ? [] : selectedRoles,
      allOrgs,
      selectedOrgIds
    )
  }

  const handleToggleRole = (role: string) => {
    const nextSelected = selectedRoles.includes(role)
      ? selectedRoles.filter((r) => r !== role)
      : [...selectedRoles, role]

    setAllRoles(false)
    setSelectedRoles(nextSelected)

    emit(false, nextSelected, allOrgs, selectedOrgIds)
  }

  // ─── Org handlers ─────────────────────────────────────────────────────────

  const handleToggleAllOrgs = () => {
    const nextAllOrgs = !allOrgs

    setAllOrgs(nextAllOrgs)
    if (nextAllOrgs) setSelectedOrgIds([])

    emit(
      allRoles,
      selectedRoles,
      nextAllOrgs,
      nextAllOrgs ? [] : selectedOrgIds
    )
  }

  const handleToggleOrg = (orgId: string) => {
    const nextSelected = selectedOrgIds.includes(orgId)
      ? selectedOrgIds.filter((o) => o !== orgId)
      : [...selectedOrgIds, orgId]

    setAllOrgs(false)
    setSelectedOrgIds(nextSelected)

    emit(allRoles, selectedRoles, false, nextSelected)
  }

  // ─── Derived display state ────────────────────────────────────────────────
  const hasRoleSelection = allRoles || selectedRoles.length > 0
  const hasOrgSelection = allOrgs || selectedOrgIds.length > 0
  const targetCount = value.length

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

        {!hasRoleSelection && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
            Select at least one role.
          </p>
        )}
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
            Select at least one organisation.
          </p>
        )}
      </div>

      {/* ── Summary ───────────────────────────────────────────────────────── */}
      {targetCount > 0 && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {targetCount === 1 && value[0].role === null && value[0].organisationId === null
            ? 'Targeting all roles across all organisations.'
            : `${targetCount} target combination${targetCount === 1 ? '' : 's'} selected.`}
        </p>
      )}
      {hasRoleSelection && hasOrgSelection && targetCount === 0 && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Computing targets…
        </p>
      )}
    </div>
  )
}
