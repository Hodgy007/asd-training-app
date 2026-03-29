'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'

type Role = 'CAREGIVER' | 'CAREER_DEV_OFFICER'

const ROLE_OPTIONS: { value: Role; label: string; description: string }[] = [
  {
    value: 'CAREGIVER',
    label: 'Parent / Practitioner',
    description: 'I care for a child and want to log observations and access ASD awareness training.',
  },
  {
    value: 'CAREER_DEV_OFFICER',
    label: 'Careers Professional',
    description: 'I am a careers leader, SENCO, or SEND professional working with autistic young people.',
  },
]

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'CAREGIVER' as Role,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [privacyConsent, setPrivacyConsent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

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

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try again.')
      } else {
        router.push('/login?registered=true')
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
          <h2 className="text-xl font-bold text-slate-900 mb-6">Create an account</h2>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-5">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role selector */}
            <div>
              <label className="label mb-2">I am a…</label>
              <div className="space-y-2">
                {ROLE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      form.role === option.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-calm-200 hover:border-calm-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={option.value}
                      checked={form.role === option.value}
                      onChange={() => setForm({ ...form, role: option.value })}
                      className="mt-0.5 accent-primary-500"
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-900">{option.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

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

          {/* SSO options */}
          <div className="mt-5 pt-5 border-t border-calm-200">
            <p className="text-xs text-center text-slate-400 mb-3">Or sign up with</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => signIn('google', { callbackUrl: '/' })}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-calm-200 hover:bg-calm-50 transition text-sm font-medium text-slate-700"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </button>
              <button
                type="button"
                onClick={() => signIn('azure-ad', { callbackUrl: '/' })}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-calm-200 hover:bg-calm-50 transition text-sm font-medium text-slate-700"
              >
                <svg className="h-4 w-4" viewBox="0 0 23 23">
                  <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
                  <path fill="#f35325" d="M1 1h10v10H1z"/>
                  <path fill="#81bc06" d="M12 1h10v10H12z"/>
                  <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                  <path fill="#ffba08" d="M12 12h10v10H12z"/>
                </svg>
                Microsoft
              </button>
            </div>
          </div>

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
