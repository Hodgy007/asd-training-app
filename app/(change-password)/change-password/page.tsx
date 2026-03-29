'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'

export default function ChangePasswordPage() {
  const router = useRouter()
  const { data: session, update } = useSession()
  const [form, setForm] = useState({
    newPassword: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const passwordStrength = () => {
    const p = form.newPassword
    if (p.length === 0) return null
    if (p.length < 6) return { label: 'Too short', color: 'text-red-500' }
    if (p.length < 8) return { label: 'Weak', color: 'text-orange-500' }
    if (p.length >= 12 && /[A-Z]/.test(p) && /[0-9]/.test(p))
      return { label: 'Strong', color: 'text-sage-600' }
    return { label: 'Good', color: 'text-primary-600' }
  }

  const strength = passwordStrength()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (form.newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: form.newPassword }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to change password. Please try again.')
      } else {
        await update()
        const role = session?.user?.role
        if (role === 'SUPER_ADMIN') router.push('/super-admin')
        else if (role === 'ORG_ADMIN') router.push('/admin')
        else router.push('/dashboard')
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
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
          <p className="text-slate-500 mt-1">Set your new password</p>
        </div>

        <div className="card border-t-4 border-t-primary-500">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-50">
              <Lock className="h-5 w-5 text-primary-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Create a new password</h2>
              <p className="text-sm text-slate-500">You must set a password before continuing.</p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-5">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="newPassword" className="label">New password</label>
              <div className="relative">
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={form.newPassword}
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
              <label htmlFor="confirmPassword" className="label">Confirm new password</label>
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
                {form.confirmPassword && form.newPassword === form.confirmPassword && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sage-500" />
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-base"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving password...
                </span>
              ) : (
                'Set new password'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Ambitious about Autism &mdash; Registered Charity &middot; Not a diagnostic tool
        </p>
      </div>
    </div>
  )
}
