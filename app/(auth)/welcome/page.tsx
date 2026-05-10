'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react'

export default function WelcomePage() {
  return (
    <Suspense>
      <WelcomeForm />
    </Suspense>
  )
}

function WelcomeForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [orgName, setOrgName] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Missing sign-up token. Please register again or check the link in your email.')
      setLoading(false)
      return
    }
    fetch(`/api/auth/welcome?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) {
          setError(data?.error || 'This sign-up link is invalid or has expired.')
          return
        }
        setEmail(data.email ?? '')
        setName(data.name ?? '')
        setOrgName(data.organisationName ?? null)
      })
      .catch(() => setError('Network error. Please try again.'))
      .finally(() => setLoading(false))
  }, [token])

  const passwordsMatch = password === confirmPassword

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    if (password.length < 10) {
      setError('Password must be at least 10 characters and include upper, lower, number, and symbol.')
      return
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/auth/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Could not finish sign-up. Please try again.')
        setSubmitting(false)
        return
      }
      router.push(data?.redirect ?? '/')
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
          <p className="text-slate-500 dark:text-slate-400 mt-1">Finish setting up your account</p>
        </div>

        <div className="card border-t-4 border-t-warm-500">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
              <ShieldCheck className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {name ? `Welcome, ${name.split(' ')[0]}` : 'Welcome'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {orgName
                  ? `You're joining ${orgName}. Pick a password and you're in.`
                  : 'Pick a password and you’re in.'}
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-5">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {loading ? (
            <p className="text-sm text-slate-500 py-6 text-center">Loading…</p>
          ) : !email ? (
            <div className="text-center py-6">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to register
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="input w-full bg-calm-50 dark:bg-slate-800 cursor-not-allowed"
                  aria-readonly="true"
                />
              </div>

              <div>
                <label htmlFor="password" className="label">
                  Choose a password <span className="text-red-500">*</span>
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

              <button
                type="submit"
                disabled={submitting || !password || !passwordsMatch}
                className="btn-primary w-full py-2.5 text-base"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Finishing…
                  </span>
                ) : (
                  'Set password & sign in'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
