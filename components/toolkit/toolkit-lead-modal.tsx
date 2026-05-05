'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'
import { TOOLKIT_FORM_ROLES, TOOLKIT_FORM_ROLE_LABELS, type ToolkitFormRole } from '@/lib/toolkit-registration'

type Props = {
  open: boolean
  documentTitle: string
  documentId: string
  onClose: () => void
  onSuccess: (fileUrl: string) => void
}

type FormState = {
  name: string
  email: string
  formRole: ToolkitFormRole
  organisation: string
  postcode: string
  marketingConsent: boolean
  register: boolean
  password: string
}

const INITIAL: FormState = {
  name: '',
  email: '',
  formRole: 'parent_carer',
  organisation: '',
  postcode: '',
  marketingConsent: false,
  register: false,
  password: '',
}

export function ToolkitLeadModal({ open, documentTitle, documentId, onClose, onSuccess }: Props) {
  const headingId = useId()
  const [form, setForm] = useState<FormState>(INITIAL)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorIsCollision, setErrorIsCollision] = useState(false)
  const [success, setSuccess] = useState<{ registered: boolean } | null>(null)
  const firstFieldRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setErrorIsCollision(false)
    setSuccess(null)
    firstFieldRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, submitting, onClose])

  if (!open) return null

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((s) => ({ ...s, [key]: value }))
  }

  function validateLocal(): string | null {
    if (form.name.trim().length === 0) return 'Please tell us your name.'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) return 'Please enter a valid email address.'
    if (form.register) {
      if (form.password.length < 10) return 'Choose a password of at least 10 characters.'
      if (!/\d/.test(form.password)) return 'Your password must include at least one number.'
    }
    return null
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setErrorIsCollision(false)
    const localError = validateLocal()
    if (localError) {
      setError(localError)
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/toolkit/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          name: form.name.trim(),
          email: form.email.trim(),
          formRole: form.formRole,
          organisation: form.organisation.trim() || undefined,
          postcode: form.postcode.trim() || undefined,
          marketingConsent: form.marketingConsent,
          register: form.register,
          password: form.register ? form.password : undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 409 && json?.code === 'email_in_use') {
          setError(json.error || 'This email is already registered. Please sign in instead.')
          setErrorIsCollision(true)
          return
        }
        if (res.status === 429) {
          setError('Too many requests. Please try again in a few minutes.')
          return
        }
        setError(json?.error || 'Something went wrong. Please try again.')
        return
      }
      setSuccess({ registered: !!json.registered })
      // Trigger the actual download a moment later so the user can see the
      // confirmation panel briefly. The browser navigation here is fine
      // because the file response uses Content-Disposition: attachment, so
      // the page itself doesn't unload — the file just downloads.
      setTimeout(() => {
        onSuccess(json.fileUrl)
      }, 600)
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[#001522]/55 p-4 sm:items-center"
    >
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label="Close"
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="px-6 pt-7 pb-2 sm:px-8 sm:pt-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-aaa-orange">Free download</p>
          <h2 id={headingId} className="mt-2 text-2xl font-extrabold text-[#001522] sm:text-3xl">
            Tell us a little about you
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#475569]">
            Before you download <span className="font-semibold text-[#001522]">{documentTitle}</span>, please share a few details so we can keep our toolkits useful.
          </p>
        </div>

        {success ? (
          <div className="px-6 pb-7 pt-4 sm:px-8 sm:pb-8">
            <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" aria-hidden="true" />
              <div>
                <p className="font-semibold">Thanks — your download is starting now.</p>
                {success.registered ? (
                  <p className="mt-1 text-sm">
                    Your toolkit account is ready. You can{' '}
                    <Link href="/login" className="font-semibold underline">
                      sign in at /login
                    </Link>{' '}
                    on any device with the email and password you just supplied.
                  </p>
                ) : (
                  <p className="mt-1 text-sm">If your download doesn&apos;t start automatically, look for a save dialog in your browser.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 px-6 pb-7 pt-4 sm:px-8 sm:pb-8">
            {error ? (
              <div className="flex items-start gap-3 rounded-2xl bg-rose-50 p-4 text-rose-900">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-600" aria-hidden="true" />
                <div className="text-sm">
                  <p>{error}</p>
                  {errorIsCollision ? (
                    <Link href="/login" className="mt-1 inline-flex font-semibold underline">
                      Go to sign in
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div>
              <label className="block text-sm font-semibold text-[#001522]" htmlFor="lead-name">
                Your name
              </label>
              <input
                id="lead-name"
                ref={firstFieldRef}
                type="text"
                required
                autoComplete="name"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-[#001522] shadow-sm focus:border-aaa-orange focus:outline-none focus:ring-2 focus:ring-aaa-orange/40"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#001522]" htmlFor="lead-email">
                Email address
              </label>
              <input
                id="lead-email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-[#001522] shadow-sm focus:border-aaa-orange focus:outline-none focus:ring-2 focus:ring-aaa-orange/40"
              />
            </div>

            <fieldset>
              <legend className="block text-sm font-semibold text-[#001522]">Which best describes you?</legend>
              <div className="mt-2 grid gap-2">
                {TOOLKIT_FORM_ROLES.map((role) => (
                  <label
                    key={role}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 px-3 py-2.5 transition ${
                      form.formRole === role ? 'border-aaa-orange bg-aaa-orange/10' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="formRole"
                      value={role}
                      checked={form.formRole === role}
                      onChange={() => update('formRole', role)}
                      className="mt-0.5 h-4 w-4 flex-shrink-0 text-aaa-orange focus:ring-aaa-orange"
                    />
                    <span className="text-sm font-medium leading-snug text-[#001522]">{TOOLKIT_FORM_ROLE_LABELS[role]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-[#001522]" htmlFor="lead-org">
                  Organisation <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <input
                  id="lead-org"
                  type="text"
                  autoComplete="organization"
                  value={form.organisation}
                  onChange={(e) => update('organisation', e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-[#001522] shadow-sm focus:border-aaa-orange focus:outline-none focus:ring-2 focus:ring-aaa-orange/40"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#001522]" htmlFor="lead-postcode">
                  Postcode <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <input
                  id="lead-postcode"
                  type="text"
                  autoComplete="postal-code"
                  value={form.postcode}
                  onChange={(e) => update('postcode', e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-[#001522] shadow-sm focus:border-aaa-orange focus:outline-none focus:ring-2 focus:ring-aaa-orange/40"
                />
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-3">
              <input
                type="checkbox"
                checked={form.marketingConsent}
                onChange={(e) => update('marketingConsent', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-aaa-orange focus:ring-aaa-orange"
              />
              <span className="text-sm leading-relaxed text-[#334155]">
                Email me occasional updates from Ambitious about Autism. You can unsubscribe at any time.
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-xl border-2 border-dashed border-slate-300 px-3 py-3">
              <input
                type="checkbox"
                checked={form.register}
                onChange={(e) => update('register', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-aaa-orange focus:ring-aaa-orange"
              />
              <span className="text-sm leading-relaxed text-[#334155]">
                <span className="font-semibold text-[#001522]">Create an account so I can sign in on any device.</span>
                <br />
                You&apos;ll be able to sign in at <span className="font-mono text-xs">/login</span> with this email and the password you choose.
              </span>
            </label>

            {form.register ? (
              <div>
                <label className="block text-sm font-semibold text-[#001522]" htmlFor="lead-password">
                  Choose a password
                </label>
                <input
                  id="lead-password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  minLength={10}
                  className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-[#001522] shadow-sm focus:border-aaa-orange focus:outline-none focus:ring-2 focus:ring-aaa-orange/40"
                />
                <p className="mt-1 text-xs text-[#64748b]">At least 10 characters and one number.</p>
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-[#475569] transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-full bg-aaa-orange px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#d96f18] disabled:opacity-50"
              >
                {submitting ? 'Just a moment…' : 'Get my download'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
