'use client'

import { useState } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, AlertCircle, LogOut } from 'lucide-react'

export default function MfaVerifyPage() {
  const router = useRouter()
  const { data: session, update } = useSession()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!code || code.length !== 6) {
      setError('Please enter a 6-digit code.')
      return
    }

    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email: session?.user?.email,
        totpCode: code,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error === 'CredentialsSignin' ? 'Invalid MFA code. Please try again.' : result.error)
        setCode('')
      } else {
        // Refresh session to clear mfaPending
        await update()
        router.push('/')
        router.refresh()
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="32,4 60,56 4,56" fill="#f5821f" />
              <polygon points="32,18 50,50 14,50" fill="#fcaf17" opacity="0.75" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Ambitious about <span className="text-primary-500">Autism</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Practitioner Training &amp; Observation Tool</p>
        </div>

        {/* MFA Card */}
        <div className="card border-t-4 border-t-primary-500">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-900/20">
              <ShieldCheck className="h-5 w-5 text-primary-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Two-Factor Authentication</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-5">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="totp-code" className="label">
                Verification code
              </label>
              <input
                id="totp-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '')
                  setCode(val)
                }}
                className="input text-center text-2xl tracking-[0.5em] font-mono"
                placeholder="000000"
                autoFocus
                autoComplete="one-time-code"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="btn-primary w-full py-2.5 text-base"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </span>
              ) : (
                'Verify'
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-calm-200 dark:border-slate-700 text-center">
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Ambitious about Autism &mdash; Registered Charity &middot; Not a diagnostic tool
        </p>
      </div>
    </div>
  )
}
