'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle,
  ChevronDown,
  Eye,
  EyeOff,
  GraduationCap,
  Heart,
  Search,
  ShieldCheck,
} from 'lucide-react'

type Mode = 'existing' | 'new-org' | 'no-org'
type Credential = 'CAREGIVER' | 'CAREER_DEV_OFFICER' | 'EMPLOYEE'
type NoOrgFormRole = 'autistic' | 'parent_carer' | 'supporter' | 'practitioner'

const NO_ORG_FORM_ROLES: { value: NoOrgFormRole; label: string; sub: string }[] = [
  {
    value: 'autistic',
    label: 'I am autistic',
    sub: 'Access training and tools to support your own learning and development.',
  },
  {
    value: 'parent_carer',
    label: 'I am the parent, carer, or relative of an autistic young person',
    sub: 'Access the parent/carer toolkit and resources for families.',
  },
  {
    value: 'supporter',
    label: 'I am a supporter',
    sub: 'Follow the cause and access general resources.',
  },
  {
    value: 'practitioner',
    label: 'I am a professional working with autistic people',
    sub: 'Independent practitioner — not part of a registered organisation.',
  },
]

const ROLE_LABELS: Record<string, string> = {
  CAREGIVER: 'Practitioner',
  CAREER_DEV_OFFICER: 'Careers Professional',
  STUDENT: 'Student',
  INTERN: 'Intern',
  EMPLOYEE: 'Employee',
  PARTICIPANT: 'Workshop Participant',
  FAMILY_CARER: 'Parent / Friend / Relative / Carer',
}

const SCHOOL_TYPE_OPTIONS = [
  { value: 'SCHOOL', label: 'School' },
  { value: 'COLLEGE', label: 'College' },
  { value: 'ACADEMY', label: 'Academy' },
  { value: 'UNIVERSITY', label: 'University' },
] as const

interface OrgResult {
  id: string
  name: string
  organisationType: string
}

interface SsoState {
  sso: boolean
  orgName?: string
  orgSlug?: string
  type?: 'charity'
  displayName?: string
  enforced?: boolean
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}

function RegisterForm() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode | null>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState('')

  const [ssoState, setSsoState] = useState<SsoState | null>(null)
  const ssoDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Existing-org branch state
  const [orgQuery, setOrgQuery] = useState('')
  const [orgResults, setOrgResults] = useState<OrgResult[]>([])
  const [selectedOrg, setSelectedOrg] = useState<OrgResult | null>(null)
  const [allowedRoles, setAllowedRoles] = useState<string[]>([])
  const [role, setRole] = useState<string>('')
  const orgDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // New-org branch state
  const [credential, setCredential] = useState<Credential | ''>('')
  const [orgName, setOrgName] = useState('')
  const [orgType, setOrgType] = useState<string>('SCHOOL')

  // No-org (catchall) branch state
  const [noOrgFormRole, setNoOrgFormRole] = useState<NoOrgFormRole | ''>('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // SSO check on email change.
  useEffect(() => {
    if (ssoDebounce.current) clearTimeout(ssoDebounce.current)
    if (!email.includes('@') || !email.split('@')[1]) {
      setSsoState(null)
      return
    }
    const domain = email.split('@').pop()!
    ssoDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/sso-check?domain=${encodeURIComponent(domain)}`)
        const data = await res.json()
        setSsoState(data)
      } catch {
        setSsoState(null)
      }
    }, 300)
    return () => {
      if (ssoDebounce.current) clearTimeout(ssoDebounce.current)
    }
  }, [email])

  // Org typeahead.
  useEffect(() => {
    if (mode !== 'existing') return
    if (orgDebounce.current) clearTimeout(orgDebounce.current)
    if (orgQuery.trim().length < 2) {
      setOrgResults([])
      return
    }
    orgDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/organisations/public?search=${encodeURIComponent(orgQuery.trim())}&limit=20`,
        )
        const data: OrgResult[] = await res.json()
        setOrgResults(Array.isArray(data) ? data : [])
      } catch {
        setOrgResults([])
      }
    }, 250)
    return () => {
      if (orgDebounce.current) clearTimeout(orgDebounce.current)
    }
  }, [orgQuery, mode])

  // Fetch allowed roles after picking an org.
  useEffect(() => {
    if (!selectedOrg) {
      setAllowedRoles([])
      setRole('')
      return
    }
    let cancelled = false
    fetch(`/api/organisations/public/${selectedOrg.id}/roles`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const roles: string[] = Array.isArray(data?.roles) ? data.roles : []
        setAllowedRoles(roles)
        setRole(roles[0] ?? '')
      })
      .catch(() => {
        if (!cancelled) {
          setAllowedRoles([])
          setRole('')
        }
      })
    return () => {
      cancelled = true
    }
  }, [selectedOrg])

  // Reset orgType when credential switches.
  useEffect(() => {
    if (credential === 'EMPLOYEE') setOrgType('EMPLOYER')
    else if (credential === 'CAREGIVER' || credential === 'CAREER_DEV_OFFICER') setOrgType('SCHOOL')
  }, [credential])

  const ssoActive = ssoState?.sso === true
  const passwordsMatch = password === confirmPassword

  function selectMode(next: Mode) {
    setMode(next)
    setError('')
  }

  async function handleSsoRedirect() {
    setSubmitting(true)
    setError('')
    try {
      const isCharity = ssoState?.type === 'charity'
      const res = await fetch('/api/auth/saml/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, charity: isCharity }),
      })
      const data = await res.json()
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
      } else {
        setError(data.error || 'SSO redirect failed.')
        setSubmitting(false)
      }
    } catch {
      setError('Network error. Please try again.')
      setSubmitting(false)
    }
  }

  function validateBeforeSubmit(): string | null {
    if (!name.trim()) return 'Please enter your name.'
    if (!email.trim()) return 'Please enter your email.'
    if (password.length < 10)
      return 'Password must be at least 10 characters and include upper, lower, number, and symbol.'
    if (!passwordsMatch) return 'Passwords do not match.'
    if (mode === 'existing') {
      if (!selectedOrg) return 'Please choose an organisation from the list.'
      if (!role) return 'Please choose a role.'
    }
    if (mode === 'new-org') {
      if (!credential) return 'Please tell us how you would like to register.'
      if (!orgName.trim()) return 'Please enter your organisation name.'
      if (!orgType) return 'Please choose an organisation type.'
    }
    if (mode === 'no-org') {
      if (!noOrgFormRole) return 'Please tell us which option describes you best.'
    }
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!mode) {
      setError('Please choose how you would like to register.')
      return
    }
    const v = validateBeforeSubmit()
    if (v) {
      setError(v)
      return
    }

    setSubmitting(true)
    try {
      let payload: Record<string, unknown> = {
        mode,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      }
      if (mode === 'existing') {
        payload = { ...payload, organisationId: selectedOrg!.id, role }
      } else if (mode === 'new-org') {
        payload = {
          ...payload,
          orgName: orgName.trim(),
          organisationType: orgType,
          professionalCredential: credential,
        }
      } else if (mode === 'no-org') {
        payload = { ...payload, formRole: noOrgFormRole }
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data?.error === 'EMAIL_EXISTS') {
          setError('An account with that email already exists. Try signing in instead.')
        } else if (data?.error === 'SSO_REQUIRED') {
          setError('Your organisation uses Single Sign-On. Please use the SSO button on the login page.')
        } else if (data?.error === 'CATCHALL_UNAVAILABLE') {
          setError('Account creation is temporarily unavailable. Please try again later.')
        } else {
          setError(data?.error || 'Registration failed. Please try again.')
        }
        setSubmitting(false)
        return
      }
      const redirect: string = data?.redirect || '/login?registered=1'
      router.push(redirect)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-orange-50 dark:bg-slate-900 flex items-center justify-center p-4 animate-page-enter">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-aaa.svg" alt="Ambitious about Autism" className="h-14 w-auto mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400 mt-1">Create your account</p>
        </div>

        <div className="card border-t-4 border-t-warm-500">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Register</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
            Choose how you would like to register, then fill in the details below.
          </p>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-5">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Mode picker */}
          <fieldset className="grid grid-cols-1 gap-3 mb-6">
            <legend className="sr-only">How would you like to register?</legend>
            <ModeOption
              icon={<Building2 className="h-5 w-5" />}
              title="I work for or study at an existing organisation"
              description="Find your school, college, university, or workplace in our directory."
              active={mode === 'existing'}
              onClick={() => selectMode('existing')}
            />
            <ModeOption
              icon={<GraduationCap className="h-5 w-5" />}
              title="I want to register a new school or business"
              description="For practitioners, careers officers, and employers. You'll be the first administrator."
              active={mode === 'new-org'}
              onClick={() => selectMode('new-org')}
            />
            <ModeOption
              icon={<Heart className="h-5 w-5" />}
              title="I don't have an organisation"
              description="For parents, carers, autistic individuals, supporters, and independent professionals."
              active={mode === 'no-org'}
              onClick={() => selectMode('no-org')}
            />
          </fieldset>

          {mode && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="label">
                  Full name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input w-full"
                  placeholder="e.g. Jane Smith"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="label">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input w-full"
                  placeholder="e.g. jane@example.com"
                  required
                />
              </div>

              {ssoActive ? (
                <div className="rounded-xl border border-primary-200 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-800 p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary-600 dark:text-primary-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        Use Single Sign-On
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        {ssoState?.orgName
                          ? `${ssoState.orgName} uses Single Sign-On. Sign in with your existing account.`
                          : `Your organisation uses Single Sign-On. Sign in with your existing account.`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSsoRedirect}
                    disabled={submitting || !email}
                    className="btn-primary w-full py-2 text-sm"
                  >
                    {ssoState?.type === 'charity'
                      ? `Sign in with ${ssoState?.displayName || 'SSO'}`
                      : `Sign in with ${ssoState?.orgName || 'SSO'}`}
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="password" className="label">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input w-full pr-10"
                        placeholder="At least 10 characters"
                        required
                        minLength={10}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Must include upper, lower, number, and symbol (10+ characters).
                    </p>
                  </div>

                  <div>
                    <label htmlFor="confirm-password" className="label">
                      Confirm password <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input w-full"
                      required
                      autoComplete="new-password"
                    />
                    {confirmPassword && !passwordsMatch && (
                      <p className="flex items-center gap-1 text-xs text-red-600 mt-1">
                        <AlertCircle className="h-3 w-3" /> Passwords do not match.
                      </p>
                    )}
                  </div>
                </>
              )}

              {mode === 'existing' && !ssoActive && (
                <div className="space-y-3">
                  <div>
                    <label htmlFor="org-search" className="label">
                      Find your organisation <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      <input
                        id="org-search"
                        type="text"
                        value={orgQuery}
                        onChange={(e) => {
                          setOrgQuery(e.target.value)
                          setSelectedOrg(null)
                        }}
                        className="input w-full pl-9"
                        placeholder="Start typing your school or workplace…"
                        autoComplete="off"
                      />
                    </div>
                    {!selectedOrg && orgResults.length > 0 && (
                      <ul className="mt-2 max-h-56 overflow-y-auto border border-calm-200 dark:border-slate-700 rounded-xl divide-y divide-calm-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                        {orgResults.map((o) => (
                          <li key={o.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOrg(o)
                                setOrgQuery(o.name)
                                setOrgResults([])
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-orange-50 dark:hover:bg-slate-700"
                            >
                              <span className="text-sm font-medium text-slate-900 dark:text-white">
                                {o.name}
                              </span>
                              <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                                {o.organisationType}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {!selectedOrg && orgQuery.trim().length >= 2 && orgResults.length === 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        No matches. If your organisation isn&apos;t listed, choose
                        &ldquo;register a new school or business&rdquo; above.
                      </p>
                    )}
                    {selectedOrg && (
                      <p className="text-xs text-sage-700 dark:text-sage-300 mt-1 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Selected: {selectedOrg.name}
                      </p>
                    )}
                  </div>

                  {selectedOrg && (
                    <div>
                      <label htmlFor="role" className="label">
                        I am joining as a <span className="text-red-500">*</span>
                      </label>
                      {allowedRoles.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          This organisation isn&apos;t accepting self-registrations right now. Contact
                          their admin for an invitation.
                        </p>
                      ) : (
                        <div className="relative">
                          <select
                            id="role"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="input w-full appearance-none pr-8"
                            required
                          >
                            {allowedRoles.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r] ?? r}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {mode === 'new-org' && !ssoActive && (
                <div className="space-y-4">
                  <div>
                    <p className="label">
                      I am a <span className="text-red-500">*</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {(
                        [
                          { value: 'CAREGIVER', label: 'Practitioner' },
                          { value: 'CAREER_DEV_OFFICER', label: 'Careers Officer' },
                          { value: 'EMPLOYEE', label: 'Employee' },
                        ] as const
                      ).map((opt) => (
                        <label
                          key={opt.value}
                          className={`cursor-pointer rounded-xl border p-3 text-sm text-center font-medium ${
                            credential === opt.value
                              ? 'border-warm-500 bg-warm-50 dark:bg-warm-900/20 text-warm-700 dark:text-warm-300'
                              : 'border-calm-200 dark:border-slate-700 hover:border-warm-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="credential"
                            value={opt.value}
                            checked={credential === opt.value}
                            onChange={() => setCredential(opt.value)}
                            className="sr-only"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      Only practitioners, careers officers, and employees can register a new
                      organisation. If you&apos;re a student, parent, or other staff member, ask your
                      organisation&apos;s admin to register it first.
                    </p>
                  </div>

                  {credential && (
                    <>
                      <div>
                        <label htmlFor="org-name" className="label">
                          {credential === 'EMPLOYEE' ? 'Business name' : 'School name'}{' '}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="org-name"
                          type="text"
                          value={orgName}
                          onChange={(e) => setOrgName(e.target.value)}
                          className="input w-full"
                          placeholder={
                            credential === 'EMPLOYEE'
                              ? 'e.g. Sunrise Manufacturing Ltd'
                              : 'e.g. Sunrise Academy'
                          }
                          required
                        />
                      </div>

                      {credential === 'EMPLOYEE' ? (
                        <div>
                          <p className="label">Organisation type</p>
                          <div className="rounded-xl border border-calm-200 dark:border-slate-700 bg-calm-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200">
                            Employer
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label htmlFor="org-type" className="label">
                            Organisation type <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <select
                              id="org-type"
                              value={orgType}
                              onChange={(e) => setOrgType(e.target.value)}
                              className="input w-full appearance-none pr-8"
                              required
                            >
                              {SCHOOL_TYPE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        You&apos;ll be the first administrator for your organisation once a charity
                        admin approves it.
                      </p>
                    </>
                  )}
                </div>
              )}

              {mode === 'no-org' && !ssoActive && (
                <div className="space-y-3">
                  <p className="label">
                    Which option describes you best? <span className="text-red-500">*</span>
                  </p>
                  <div className="space-y-2">
                    {NO_ORG_FORM_ROLES.map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex items-start gap-3 cursor-pointer rounded-xl border p-3 transition ${
                          noOrgFormRole === opt.value
                            ? 'border-warm-500 bg-warm-50 dark:bg-warm-900/20 ring-2 ring-warm-200'
                            : 'border-calm-200 dark:border-slate-700 hover:border-warm-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="no-org-form-role"
                          value={opt.value}
                          checked={noOrgFormRole === opt.value}
                          onChange={() => setNoOrgFormRole(opt.value)}
                          className="sr-only"
                        />
                        <span
                          className={`mt-0.5 h-4 w-4 rounded-full border flex-shrink-0 ${
                            noOrgFormRole === opt.value
                              ? 'border-warm-500 bg-warm-500 ring-2 ring-warm-200'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                          aria-hidden="true"
                        />
                        <span className="flex-1">
                          <span className="block text-sm font-medium text-slate-900 dark:text-white">
                            {opt.label}
                          </span>
                          <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {opt.sub}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    You&apos;ll be added to our public area with access tailored to your role.
                  </p>
                </div>
              )}

              {!ssoActive && (
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full py-2.5 text-base"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting…
                    </span>
                  ) : (
                    'Create account'
                  )}
                </button>
              )}
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-calm-200 dark:border-slate-700 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Already have an account? Sign in
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
          Registered Charity &middot; Not a diagnostic tool
        </p>
      </div>
    </div>
  )
}

function ModeOption({
  icon,
  title,
  description,
  active,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  description: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 text-left rounded-xl border p-3 transition ${
        active
          ? 'border-warm-500 bg-warm-50 dark:bg-warm-900/20 ring-2 ring-warm-200'
          : 'border-calm-200 dark:border-slate-700 hover:border-warm-300'
      }`}
    >
      <span
        className={`mt-0.5 h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
          active
            ? 'bg-warm-500 text-white'
            : 'bg-calm-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
        }`}
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
        <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</span>
      </span>
    </button>
  )
}
