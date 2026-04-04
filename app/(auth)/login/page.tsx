'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, AlertCircle, Building2 } from 'lucide-react'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

const SSO_ERROR_MESSAGES: Record<string, string> = {
  Configuration: 'Single Sign-On is not configured. Please sign in with email and password, or contact your administrator.',
  OAuthSignin: 'Could not start the sign-in process. Please try again.',
  OAuthCallback: 'Sign-in was interrupted. Please try again.',
  OAuthCreateAccount: 'Could not link your account. Please contact your administrator.',
  OAuthAccountNotLinked: 'This email is already linked to another sign-in method.',
  AccessDenied: 'Access denied. Your account may be deactivated.',
  Callback: 'Sign-in failed. Please try again.',
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawSsoError = searchParams.get('error')
  const ssoError = rawSsoError
    ? SSO_ERROR_MESSAGES[rawSsoError] || rawSsoError
    : null
  const registeredPending = searchParams.get('registered') === 'pending'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loginMethod, setLoginMethod] = useState<'password' | 'sso'>('password')
  const [ssoOrg, setSsoOrg] = useState<{
    sso: boolean
    orgName?: string
    type?: 'charity'
    displayName?: string
    enforced?: boolean
  } | null>(null)
  const [ssoProviders, setSsoProviders] = useState<{ google: boolean; microsoft: boolean }>({ google: true, microsoft: true })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/auth/sso-providers')
      .then((r) => r.json())
      .then(setSsoProviders)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!email.includes('@') || !email.split('@')[1]) {
      setSsoOrg(null)
      return
    }

    const domain = email.split('@').pop()!
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/sso-check?domain=${encodeURIComponent(domain)}`)
        const data = await res.json()
        setSsoOrg(data)
      } catch {
        setSsoOrg(null)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [email])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
      } else {
        router.push('/')
        router.refresh()
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleEnterpriseSso() {
    setLoading(true)
    setError('')
    try {
      const isCharity = ssoOrg?.type === 'charity'
      const res = await fetch('/api/auth/saml/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, charity: isCharity }),
      })
      const data = await res.json()
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
      } else {
        setError(data.error || 'SSO login failed')
        setLoading(false)
      }
    } catch {
      setError('Network error')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-orange-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Branding */}
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
          <p className="text-slate-500 mt-1">Training &amp; Observation Platform</p>
        </div>

        {/* Login Card */}
        <div className="card border-t-4 border-t-primary-500">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Sign in to your account</h2>

          {registeredPending && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                Your account has been created and is awaiting approval by your organisation admin. You will be able to sign in once approved.
              </p>
            </div>
          )}

          {(error || ssoError) && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-5">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error || ssoError}</p>
            </div>
          )}

          {/* Email input — always visible (triggers SSO domain detection) */}
          <div className="mb-5">
            <label htmlFor="email" className="label">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          {ssoOrg?.sso === true && (ssoOrg.type !== 'charity' || ssoOrg.enforced) ? (
            /* Full-screen SSO button (org SSO or enforced charity SSO) */
            <div className="space-y-4 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl mx-auto">
                <Building2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-4">
                  {ssoOrg.type === 'charity'
                    ? 'Your organisation uses Charity SSO'
                    : 'Your organisation uses Enterprise SSO'}
                </p>
                <button
                  type="button"
                  onClick={handleEnterpriseSso}
                  disabled={loading}
                  className="btn-primary w-full py-2.5 text-base"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Redirecting...
                    </span>
                  ) : (
                    `Sign in with ${ssoOrg.type === 'charity' ? ssoOrg.displayName : ssoOrg.orgName}`
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Normal login — password / SSO tabs */
            <>
              {/* Optional charity SSO button (non-enforced) */}
              {ssoOrg?.sso === true && ssoOrg.type === 'charity' && !ssoOrg.enforced && (
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={handleEnterpriseSso}
                    disabled={loading}
                    className="flex items-center justify-center gap-3 w-full py-2.5 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 text-sm font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                  >
                    <Building2 className="h-4 w-4" />
                    Sign in with {ssoOrg.displayName}
                  </button>
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-calm-200 dark:bg-slate-700" />
                    <span className="text-xs text-slate-400">or</span>
                    <div className="flex-1 h-px bg-calm-200 dark:bg-slate-700" />
                  </div>
                </div>
              )}

              {/* Login method toggle */}
              <div className="flex rounded-xl bg-calm-100 dark:bg-slate-700 p-1 mb-6">
                <button
                  type="button"
                  onClick={() => setLoginMethod('password')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
                    loginMethod === 'password'
                      ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                  }`}
                >
                  Email &amp; Password
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod('sso')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
                    loginMethod === 'sso'
                      ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                  }`}
                >
                  Single Sign-On
                </button>
              </div>

              {loginMethod === 'password' ? (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="password" className="label">Password</label>
                      <Link href="/forgot-password" className="text-xs text-primary-600 hover:text-primary-700">
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input pr-10"
                        placeholder="••••••••"
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
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
                        Signing in...
                      </span>
                    ) : (
                      'Sign in'
                    )}
                  </button>
                </form>
              ) : (
                <div className="space-y-3">
                  {!ssoProviders.google && !ssoProviders.microsoft ? (
                    <p className="text-sm text-slate-500 text-center py-4">
                      Single Sign-On is not yet configured. Please sign in with email and password.
                    </p>
                  ) : (
                    <>
                      <p className="text-sm text-slate-500 mb-4">
                        Sign in using your {ssoProviders.google && ssoProviders.microsoft ? 'Google or Microsoft' : ssoProviders.google ? 'Google' : 'Microsoft'} account.
                      </p>
                      {ssoProviders.google && (
                        <button
                          type="button"
                          onClick={() => signIn('google', { callbackUrl: '/' })}
                          className="flex items-center justify-center gap-3 w-full py-2.5 rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-calm-50 dark:hover:bg-slate-600 transition-colors"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                          Sign in with Google
                        </button>
                      )}
                      {ssoProviders.microsoft && (
                        <button
                          type="button"
                          onClick={() => signIn('azure-ad', { callbackUrl: '/' })}
                          className="flex items-center justify-center gap-3 w-full py-2.5 rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-calm-50 dark:hover:bg-slate-600 transition-colors"
                        >
                          <svg width="18" height="18" viewBox="0 0 23 23">
                            <rect x="1" y="1" width="10" height="10" fill="#f25022"/>
                            <rect x="12" y="1" width="10" height="10" fill="#7fba00"/>
                            <rect x="1" y="12" width="10" height="10" fill="#00a4ef"/>
                            <rect x="12" y="12" width="10" height="10" fill="#ffb900"/>
                          </svg>
                          Sign in with Microsoft
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}

          <div className="mt-6 pt-5 border-t border-calm-200 text-center">
            <p className="text-sm text-slate-500">
              Need an account? Contact your organisation administrator.
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
