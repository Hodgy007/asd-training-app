'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

interface ProgramCardProps {
  programId: string
  name: string
  description: string | null
  priceAmount: number | null
  currency: string
  accentHex?: string
}

function formatPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: amount % 100 === 0 ? 0 : 2,
    }).format(amount / 100)
  } catch {
    return `£${(amount / 100).toFixed(2)}`
  }
}

export function ProgramCard({
  programId,
  name,
  description,
  priceAmount,
  currency,
  accentHex = '#f5821f',
}: ProgramCardProps) {
  const { data: session, status: sessionStatus } = useSession()
  const isFree = priceAmount === 0
  const isPaid = priceAmount !== null && priceAmount > 0

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [freeModalOpen, setFreeModalOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function handleBuy() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'purchase', programId }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Could not start checkout')
      }
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  // Signed-in users skip the email modal — we already know who they are.
  async function claimFreeAsSignedInUser() {
    setLoading(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const res = await fetch('/api/courses/free-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programId }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? 'Could not grant access')
      }
      setSuccessMessage(data.message ?? "We've sent you sign-in details by email.")
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function handleFreeClick() {
    setError(null)
    setSuccessMessage(null)
    if (sessionStatus === 'authenticated' && session?.user?.email) {
      void claimFreeAsSignedInUser()
    } else {
      setFreeModalOpen(true)
    }
  }

  return (
    <>
      <article
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[#ffffff] shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
      >
        <div
          className="h-2 w-full"
          style={{ backgroundColor: accentHex }}
          aria-hidden="true"
        />
        <div className="flex flex-1 flex-col p-6">
          <div
            className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: accentHex }}
            aria-hidden="true"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-[#001522]">{name}</h3>
          {description ? (
            <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-[#475569]">
              {description}
            </p>
          ) : null}
          <div className="mt-auto pt-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[#64748b]">
                  {isFree ? 'Included' : 'One-off purchase'}
                </p>
                <p className="mt-1 text-2xl font-bold text-[#001522]">
                  {priceAmount === null
                    ? 'Contact us'
                    : isFree
                    ? 'Free'
                    : formatPrice(priceAmount, currency)}
                </p>
              </div>
              <button
                type="button"
                onClick={isFree ? handleFreeClick : handleBuy}
                disabled={loading || (priceAmount === null) || Boolean(successMessage)}
                className="inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ backgroundColor: accentHex }}
              >
                {loading ? (
                  'Loading…'
                ) : successMessage ? (
                  'Sent'
                ) : isFree ? (
                  'Get free access'
                ) : isPaid ? (
                  <>
                    Buy now
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </>
                ) : (
                  'Contact us'
                )}
              </button>
            </div>
            {successMessage ? (
              <p role="status" className="mt-3 text-sm font-medium text-green-700">
                {successMessage}
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="mt-3 text-sm font-medium text-red-600">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </article>

      {freeModalOpen ? (
        <FreeClaimModal
          programName={name}
          onClose={() => setFreeModalOpen(false)}
          onSuccess={(message) => {
            setSuccessMessage(message)
            setFreeModalOpen(false)
          }}
          programId={programId}
        />
      ) : null}
    </>
  )
}

function FreeClaimModal({
  programId,
  programName,
  onClose,
  onSuccess,
}: {
  programId: string
  programName: string
  onClose: () => void
  onSuccess: (message: string) => void
}) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError('Please enter an email address.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/courses/free-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId,
          email: email.trim(),
          name: name.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? 'Could not grant access')
      }
      onSuccess(data.message ?? "We've sent your sign-in details to your inbox.")
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  // NOTE: every colour below is an arbitrary hex, NOT a Tailwind keyword
  // (`bg-white`, `text-slate-900`, etc). globals.css auto-inverts those
  // keywords when `.dark` is on <html>, which made the previous modal render
  // navy-on-navy when the user's OS was in dark mode. Arbitrary values bypass
  // that rule and keep the modal consistently light to match the rest of the
  // public /courses page.
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#001522]/70 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="free-claim-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[#ffffff] p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="free-claim-title" className="text-xl font-bold leading-tight text-[#001522]">
          Get free access to {programName}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#475569]">
          Enter your email and we&rsquo;ll send your sign-in details so you can start training right away.
        </p>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="free-claim-email"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#334155]"
            >
              Email <span className="text-[#dc2626]">*</span>
            </label>
            <input
              id="free-claim-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full rounded-xl border border-[#cbd5e1] bg-[#ffffff] px-3.5 py-2.5 text-sm text-[#001522] placeholder:text-[#94a3b8] focus:border-[#f5821f] focus:outline-none focus:ring-2 focus:ring-[#f5821f]/30"
            />
          </div>
          <div>
            <label
              htmlFor="free-claim-name"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#334155]"
            >
              Your name <span className="font-normal normal-case text-[#94a3b8]">(optional)</span>
            </label>
            <input
              id="free-claim-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="w-full rounded-xl border border-[#cbd5e1] bg-[#ffffff] px-3.5 py-2.5 text-sm text-[#001522] placeholder:text-[#94a3b8] focus:border-[#f5821f] focus:outline-none focus:ring-2 focus:ring-[#f5821f]/30"
            />
          </div>
          {error ? (
            <p role="alert" className="rounded-lg bg-[#fef2f2] px-3 py-2 text-sm font-medium text-[#b91c1c]">
              {error}
            </p>
          ) : null}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-full border border-[#cbd5e1] bg-[#ffffff] px-5 py-2.5 text-sm font-semibold text-[#001522] transition hover:bg-[#f8fafc] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-full bg-[#f5821f] px-5 py-2.5 text-sm font-semibold text-[#ffffff] shadow-sm transition hover:brightness-110 disabled:opacity-60"
            >
              {submitting ? 'Sending…' : 'Send sign-in details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
