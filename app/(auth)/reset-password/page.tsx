'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
      } else {
        setSuccess(true)
        setTimeout(() => router.push('/login'), 3000)
      }
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Invalid link</h2>
        <p className="text-slate-500 text-sm">This reset link is missing or invalid.</p>
        <Link href="/forgot-password" className="btn-primary inline-block">Request a new link</Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <CheckCircle className="h-12 w-12 text-sage-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Password updated!</h2>
        <p className="text-slate-500 text-sm">Redirecting you to sign in…</p>
      </div>
    )
  }

  return (
    <>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Set a new password</h2>
      <p className="text-sm text-slate-500 mb-6">Choose a password with at least 8 characters.</p>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-5">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">New password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pr-10"
              placeholder="Minimum 8 characters"
              required
              minLength={8}
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
        </div>
        <div>
          <label className="label">Confirm password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input"
            placeholder="••••••••"
            required
            autoComplete="new-password"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Updating…
            </span>
          ) : (
            'Set new password'
          )}
        </button>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
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
        </div>
        <div className="card border-t-4 border-t-primary-500">
          <Suspense fallback={<p className="text-slate-500 text-sm">Loading…</p>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
