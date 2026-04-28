'use client'

import { useState } from 'react'

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  return (
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
                {priceAmount === 0 ? 'Included' : 'One-off purchase'}
              </p>
              <p className="mt-1 text-2xl font-bold text-[#001522]">
                {priceAmount === null
                  ? 'Contact us'
                  : priceAmount === 0
                  ? 'Free'
                  : formatPrice(priceAmount, currency)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleBuy}
              disabled={loading || priceAmount === null || priceAmount === 0}
              className="inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: accentHex }}
            >
              {loading ? (
                'Loading…'
              ) : priceAmount === 0 ? (
                'Free'
              ) : (
                <>
                  Buy now
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </>
              )}
            </button>
          </div>
          {error ? (
            <p role="alert" className="mt-3 text-sm font-medium text-red-600">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  )
}
