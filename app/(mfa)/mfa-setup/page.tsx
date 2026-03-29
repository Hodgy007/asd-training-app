'use client'

import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, AlertCircle, CheckCircle, LogOut, Copy, Check } from 'lucide-react'

type SetupStep = 'intro' | 'scan' | 'verify'

export default function MfaSetupPage() {
  const router = useRouter()
  const { data: session, update } = useSession()
  const [step, setStep] = useState<SetupStep>('intro')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleGetStarted() {
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/mfa/setup')
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to initialise MFA setup.')
        return
      }

      setQrCode(data.qrCode)
      setSecret(data.secret)
      setStep('scan')
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopySecret() {
    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API not available
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!code || code.length !== 6) {
      setError('Please enter a 6-digit code.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Verification failed. Please try again.')
        setCode('')
        setLoading(false)
        return
      }

      // MFA now enabled — refresh session to update totpEnabled
      await update()

      // Redirect to role home
      const role = session?.user?.role
      if (role === 'SUPER_ADMIN') router.push('/super-admin')
      else if (role === 'ORG_ADMIN') router.push('/admin')
      else router.push('/dashboard')

      router.refresh()
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
          <p className="text-slate-500 dark:text-slate-400 mt-1">Caregiver Training &amp; Observation Tool</p>
        </div>

        {/* Setup Card */}
        <div className="card border-t-4 border-t-primary-500">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-900/20">
              <ShieldCheck className="h-5 w-5 text-primary-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Set Up Two-Factor Authentication</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Your role requires two-factor authentication
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-5">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Step 1: Intro */}
          {step === 'intro' && (
            <div className="space-y-4">
              <div className="bg-calm-50 dark:bg-slate-800 rounded-xl p-4">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  To protect your admin account, you need to set up an authenticator app.
                  This adds an extra layer of security by requiring a code from your phone
                  each time you sign in.
                </p>
              </div>
              <div className="bg-calm-50 dark:bg-slate-800 rounded-xl p-4">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">You will need:</p>
                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-sage-500 mt-0.5 flex-shrink-0" />
                    An authenticator app (Google Authenticator, Microsoft Authenticator, Authy, etc.)
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-sage-500 mt-0.5 flex-shrink-0" />
                    Your phone or tablet to scan a QR code
                  </li>
                </ul>
              </div>

              <button
                onClick={handleGetStarted}
                disabled={loading}
                className="btn-primary w-full py-2.5 text-base"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Setting up...
                  </span>
                ) : (
                  'Get Started'
                )}
              </button>
            </div>
          )}

          {/* Step 2: Scan QR */}
          {step === 'scan' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Scan this QR code with your authenticator app:
              </p>

              {qrCode && (
                <div className="flex justify-center">
                  <div className="bg-white p-3 rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrCode} alt="MFA QR Code" width={200} height={200} />
                  </div>
                </div>
              )}

              <div className="bg-calm-50 dark:bg-slate-800 rounded-xl p-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Or enter this code manually:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono text-slate-700 dark:text-slate-300 break-all">
                    {secret}
                  </code>
                  <button
                    onClick={handleCopySecret}
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-calm-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    aria-label="Copy secret"
                  >
                    {copied ? <Check className="h-4 w-4 text-sage-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setStep('verify')}
                className="btn-primary w-full py-2.5 text-base"
              >
                I&apos;ve scanned the code
              </button>
            </div>
          )}

          {/* Step 3: Verify */}
          {step === 'verify' && (
            <form onSubmit={handleVerify} className="space-y-5">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Enter the 6-digit code from your authenticator app to verify setup:
              </p>

              <div>
                <label htmlFor="verify-code" className="label">
                  Verification code
                </label>
                <input
                  id="verify-code"
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
                  'Verify & Enable'
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('scan')
                  setCode('')
                  setError('')
                }}
                className="w-full text-center text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              >
                Back to QR code
              </button>
            </form>
          )}

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
