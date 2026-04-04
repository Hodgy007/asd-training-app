'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, AlertCircle, CheckCircle, ChevronDown } from 'lucide-react'

type OrgType = 'EDUCATION' | 'BUSINESS' | 'OTHER'

interface OrgOption {
  id: string
  name: string
  organisationType: OrgType
}

// For non-education orgs the role is fixed; education orgs let the user choose
const ORG_TYPE_FIXED_ROLE: Partial<Record<OrgType, { label: string; description: string }>> = {
  BUSINESS: { label: 'Employee', description: 'You will be registered as an Employee.' },
  OTHER:    { label: 'Practitioner', description: 'You will be registered as a Practitioner.' },
}

const EDUCATION_ROLES = [
  { value: 'STUDENT',             label: 'Student',              description: 'I am a student at this school / college / university.' },
  { value: 'CAREGIVER',           label: 'Practitioner',         description: 'I am a teacher, SENCO, or support professional.' },
  { value: 'CAREER_DEV_OFFICER',  label: 'Careers Professional', description: 'I am a careers leader or careers adviser.' },
]

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organisationId: '',
  })
  const [orgs, setOrgs] = useState<OrgOption[]>([])
  const [orgsLoading, setOrgsLoading] = useState(true)
  const [educationRole, setEducationRole] = useState<'STUDENT' | 'CAREGIVER' | 'CAREER_DEV_OFFICER'>('STUDENT')
  const [showPassword, setShowPassword] = useState(false)
  const [privacyConsent, setPrivacyConsent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/organisations/public')
      .then((r) => r.json())
      .then((data: OrgOption[]) => { setOrgs(data); setOrgsLoading(false) })
      .catch(() => setOrgsLoading(false))
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.organisationId) {
      setError('Please select your organisation.')
      return
    }

    if (!privacyConsent) {
      setError('You must agree to the privacy policy to create an account.')
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    const selectedOrg = orgs.find((o) => o.id === form.organisationId)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          organisationId: form.organisationId,
          educationRole: selectedOrg?.organisationType === 'EDUCATION' ? educationRole : undefined,

        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try again.')
      } else {
        router.push('/login?registered=pending')
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = () => {
    const p = form.password
    if (p.length === 0) return null
    if (p.length < 6) return { label: 'Too short', color: 'text-red-500' }
    if (p.length < 8) return { label: 'Weak', color: 'text-orange-500' }
    if (p.length >= 12 && /[A-Z]/.test(p) && /[0-9]/.test(p))
      return { label: 'Strong', color: 'text-sage-600' }
    return { label: 'Good', color: 'text-primary-600' }
  }

  const strength = passwordStrength()

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="32,4 60,56 4,56" fill="#f5821f" />
              <polygon points="32,18 50,50 14,50" fill="#fcaf17" opacity="0.75" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Ambitious about <span className="text-primary-500">Autism</span>
          </h1>
          <p className="text-slate-500 mt-1">Create your account</p>
        </div>

        <div className="card border-t-4 border-t-primary-500">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Create an account</h2>
          <p className="text-sm text-slate-500 mb-6">
            Your account will be reviewed by your organisation admin before you can sign in.
          </p>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-5">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Organisation selector */}
            <div>
              <label htmlFor="organisationId" className="label">Organisation</label>
              <div className="relative">
                <select
                  id="organisationId"
                  name="organisationId"
                  value={form.organisationId}
                  onChange={handleChange}
                  className="input appearance-none pr-9"
                  required
                  disabled={orgsLoading}
                >
                  <option value="">
                    {orgsLoading ? 'Loading organisations…' : 'Select your organisation'}
                  </option>
                  {orgs.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Role — auto-assigned or picker for education orgs */}
            {form.organisationId && (() => {
              const selectedOrg = orgs.find((o) => o.id === form.organisationId)
              if (!selectedOrg) return null

              if (selectedOrg.organisationType === 'EDUCATION') {
                return (
                  <div>
                    <label className="label mb-2">I am a…</label>
                    <div className="space-y-2">
                      {EDUCATION_ROLES.map((option) => (
                        <label
                          key={option.value}
                          className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            educationRole === option.value
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                              : 'border-calm-200 hover:border-calm-300 dark:border-slate-600'
                          }`}
                        >
                          <input
                            type="radio"
                            name="educationRole"
                            value={option.value}
                            checked={educationRole === option.value}
                            onChange={() => setEducationRole(option.value as 'STUDENT' | 'CAREGIVER' | 'CAREER_DEV_OFFICER')}
                            className="mt-0.5 accent-primary-500"
                          />
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{option.label}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{option.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              }

              const fixedRole = ORG_TYPE_FIXED_ROLE[selectedOrg.organisationType]
              return fixedRole ? (
                <p className="text-xs text-slate-500 bg-calm-50 dark:bg-slate-700/50 border border-calm-200 dark:border-slate-600 rounded-lg px-3 py-2">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{fixedRole.description}</span>
                </p>
              ) : null
            })()}

            {/* Full name */}
            <div>
              <label htmlFor="name" className="label">Full name</label>
              <input
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                className="input"
                placeholder="Sarah Thompson"
                required
                autoComplete="name"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="label">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="input"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="label">Password</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  className="input pr-10"
                  placeholder="Minimum 8 characters"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {strength && (
                <p className={`text-xs mt-1 ${strength.color}`}>
                  Password strength: {strength.label}
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="confirmPassword" className="label">Confirm password</label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="input pr-8"
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
                {form.confirmPassword && form.password === form.confirmPassword && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sage-500" />
                )}
              </div>
            </div>

            {/* Privacy consent */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={privacyConsent}
                onChange={(e) => setPrivacyConsent(e.target.checked)}
                className="mt-0.5 accent-primary-500 flex-shrink-0"
                required
              />
              <span className="text-xs text-slate-600 leading-relaxed">
                I have read and agree to the{' '}
                <a href="/privacy" target="_blank" className="text-primary-600 underline">
                  Privacy Policy
                </a>{' '}
                and{' '}
                <a href="/terms" target="_blank" className="text-primary-600 underline">
                  Terms of Service
                </a>
                . I consent to my personal data being processed for the purpose of ASD observation
                tracking and training. I understand this tool is not a diagnostic instrument and I
                will share concerns with a qualified healthcare professional.
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-base"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-calm-200 text-center">
            <p className="text-sm text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="font-bold text-primary-500 hover:text-primary-600">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Ambitious about Autism &mdash; Registered Charity &middot; Not a diagnostic tool
        </p>
      </div>
    </div>
  )
}
