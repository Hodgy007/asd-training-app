'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react'

type FormRole = 'autistic' | 'parent_carer' | 'supporter' | 'practitioner'

const FORM_ROLE_OPTIONS: { value: FormRole; label: string; sub: string }[] = [
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

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google',
  'azure-ad': 'Microsoft',
}

export default function SsoCompletePage() {
  return (
    <Suspense>
      <SsoCompleteForm />
    </Suspense>
  )
}

function SsoCompleteForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [provider, setProvider] = useState('')
  const [formRole, setFormRole] = useState<FormRole | ''>('')

  useEffect(() => {
    if (!token) {
      setError('Missing sign-up token. Try signing in again.')
      setLoading(false)
      return
    }
    fetch(`/api/auth/register/sso-complete?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) {
          if (data?.error === 'ACCOUNT_EXISTS') {
            setError('An account with this email already exists. Please sign in.')
          } else {
            setError(data?.error || 'This sign-up link is invalid or has expired. Try signing in again.')
          }
          return
        }
        setEmail(data.email ?? '')
        setName(data.name ?? '')
        setProvider(data.provider ?? '')
      })
      .catch(() => setError('Network error. Please try again.'))
      .finally(() => setLoading(false))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !formRole) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/auth/register/sso-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, formRole, name: name.trim() || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data?.error === 'EMAIL_EXISTS' || data?.error === 'ACCOUNT_LINK_EXISTS') {
          setError('An account with this email already exists. Please sign in.')
        } else if (data?.error === 'CATCHALL_UNAVAILABLE') {
          setError('Account creation is temporarily unavailable. Please try again later.')
        } else {
          setError(data?.error || 'Could not complete sign-up. Please try again.')
        }
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
                Welcome{name ? `, ${name.split(' ')[0]}` : ''}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {provider
                  ? `Signed in with ${PROVIDER_LABELS[provider] ?? provider}. One question and you're in.`
                  : "One question and you're in."}
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
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
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
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Verified by your sign-in provider.
                </p>
              </div>

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
                  maxLength={120}
                />
              </div>

              <div className="space-y-3">
                <p className="label">
                  Which option describes you best? <span className="text-red-500">*</span>
                </p>
                <div className="space-y-2">
                  {FORM_ROLE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 cursor-pointer rounded-xl border p-3 transition ${
                        formRole === opt.value
                          ? 'border-warm-500 bg-warm-50 dark:bg-warm-900/20 ring-2 ring-warm-200'
                          : 'border-calm-200 dark:border-slate-700 hover:border-warm-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="form-role"
                        value={opt.value}
                        checked={formRole === opt.value}
                        onChange={() => setFormRole(opt.value)}
                        className="sr-only"
                      />
                      <span
                        className={`mt-0.5 h-4 w-4 rounded-full border flex-shrink-0 ${
                          formRole === opt.value
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
              </div>

              <button
                type="submit"
                disabled={submitting || !formRole || !name.trim()}
                className="btn-primary w-full py-2.5 text-base"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Finishing…
                  </span>
                ) : (
                  'Finish sign-up'
                )}
              </button>

              <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                You won&apos;t need a password — you&apos;ll sign in with{' '}
                {PROVIDER_LABELS[provider] ?? 'your provider'} from now on.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
