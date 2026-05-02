'use client'

import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, AlertCircle, UsersRound, CheckCircle } from 'lucide-react'

type Status = 'loading' | 'ready' | 'invalid' | 'archived' | 'expired' | 'submitting' | 'success'

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CODE: 'This invite link is no longer valid. Ask the workshop organiser for a new one.',
  ARCHIVED: 'This cohort has ended and is no longer accepting new joins.',
  EXPIRED: 'This invite link has expired. Ask the workshop organiser for a new one.',
  EMAIL_IN_USE_DIFFERENT_PASSWORD:
    'You already have an account with this email. Sign in first, then revisit this link to join.',
}

export default function JoinPage() {
  const router = useRouter()
  const params = useParams()
  const code = params.code as string

  const [status, setStatus] = useState<Status>('loading')
  const [cohortName, setCohortName] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/join/${code}`)
      .then(async (res) => {
        if (cancelled) return
        if (res.ok) {
          const data = await res.json()
          setCohortName(data.name)
          setStatus('ready')
        } else {
          const data = await res.json().catch(() => ({}))
          if (data.error === 'ARCHIVED') setStatus('archived')
          else if (data.error === 'EXPIRED') setStatus('expired')
          else setStatus('invalid')
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('invalid')
      })
    return () => {
      cancelled = true
    }
  }, [code])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setStatus('submitting')

    const res = await fetch(`/api/join/${code}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      const code = data.error as string | undefined
      setError(ERROR_MESSAGES[code ?? ''] || data.message || 'We could not complete your sign-up. Please try again.')
      setStatus('ready')
      return
    }

    // Auto-sign-in so the user lands on their cohort hub immediately.
    const signInRes = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (signInRes?.ok) {
      setStatus('success')
      router.push('/dashboard')
    } else {
      setStatus('success')
      // Account exists but sign-in failed — fall back to login page.
      router.push(`/login?email=${encodeURIComponent(email)}`)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-calm-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-calm-200 dark:border-slate-700 p-8">
          {status === 'loading' && (
            <p className="text-center text-slate-500 dark:text-slate-400">Loading…</p>
          )}

          {(status === 'invalid' || status === 'archived' || status === 'expired') && (
            <div className="text-center space-y-3">
              <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {status === 'archived' ? 'This cohort has ended' : 'Invite link not valid'}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {status === 'archived' && ERROR_MESSAGES.ARCHIVED}
                {status === 'expired' && ERROR_MESSAGES.EXPIRED}
                {status === 'invalid' && ERROR_MESSAGES.INVALID_CODE}
              </p>
              <Link href="/login" className="inline-block text-sm text-emerald-600 dark:text-emerald-400 hover:underline pt-2">
                Already have an account? Sign in
              </Link>
            </div>
          )}

          {(status === 'ready' || status === 'submitting') && cohortName && (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 items-center justify-center mb-3">
                  <UsersRound className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Join {cohortName}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Create an account to access your workshop materials and upcoming sessions.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="name" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Your name
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Choose a password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 pr-10 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">At least 8 characters.</p>
                </div>

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {status === 'submitting' ? 'Creating your account…' : 'Join cohort'}
                </button>
              </form>

              <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6">
                Already have an account?{' '}
                <Link href={`/login?email=${encodeURIComponent(email)}`} className="text-emerald-600 dark:text-emerald-400 hover:underline">
                  Sign in instead
                </Link>
              </p>
            </>
          )}

          {status === 'success' && (
            <div className="text-center space-y-3">
              <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">You're in!</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">Taking you to your dashboard…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
