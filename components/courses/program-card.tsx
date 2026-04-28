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
          accentHex={accentHex}
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
  accentHex,
  onClose,
  onSuccess,
}: {
  programId: string
  programName: string
  accentHex: string
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="free-claim-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 id="free-claim-title" className="text-lg font-bold text-[#001522]">
          Get free access to {programName}
        </h2>
        <p className="mt-1 text-sm text-[#475569]">
          Enter your email and we&rsquo;ll send your sign-in details so you can start training.
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label htmlFor="free-claim-email" className="block text-xs font-semibold text-[#001522] mb-1">
              Email <span className="text-red-600">*</span>
            </label>
            <input
              id="free-claim-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-[#001522] focus:outline-none focus:ring-2 focus:ring-offset-1"
              style={{ borderColor: '#cbd5e1' }}
            />
          </div>
          <div>
            <label htmlFor="free-claim-name" className="block text-xs font-semibold text-[#001522] mb-1">
              Your name (optional)
            </label>
            <input
              id="free-claim-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-[#001522] focus:outline-none focus:ring-2 focus:ring-offset-1"
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm font-medium text-red-600">
              {error}
            </p>
          ) : null}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-[#001522] hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
              style={{ backgroundColor: accentHex }}
            >
              {submitting ? 'Sending…' : 'Send sign-in details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
