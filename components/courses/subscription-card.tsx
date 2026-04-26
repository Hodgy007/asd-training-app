'use client'

import { useState } from 'react'

interface SubscriptionCardProps {
  yearlyPrice: string | null
}

const FEATURES = [
  'Every training programme on the platform',
  'A full year of unlimited access',
  'New courses added at no extra cost',
  'Certificates of completion included',
] as const

export function SubscriptionCard({ yearlyPrice }: SubscriptionCardProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubscribe() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'subscription', interval: 'year' }),
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

  const configured = Boolean(yearlyPrice)

  return (
    <article className="relative overflow-hidden rounded-3xl bg-[#001522] text-white shadow-2xl ring-1 ring-white/10">
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-aaa-orange/40 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-aaa-blue-light/20 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative grid gap-10 p-8 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:gap-12">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-aaa-orange px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-aaa-orange/30">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            Most popular
          </span>
          <h3 className="mt-5 text-3xl font-bold leading-tight text-white sm:text-4xl">
            All-Access annual subscription
          </h3>
          <p className="mt-4 text-base leading-relaxed text-slate-300">
            One simple plan for individuals, teams and schools. Unlock every course on the
            platform — and everything we add over the next twelve months.
          </p>
          <ul className="mt-6 space-y-3">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-sm text-slate-200">
                <span
                  className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-aaa-green text-white"
                  aria-hidden="true"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-aaa-orange-light">
            Yearly subscription
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-bold sm:text-5xl">
              {yearlyPrice ?? 'Coming soon'}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-300">
            Billed annually. Cancel anytime from your account.
          </p>
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={loading || !configured}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-aaa-orange px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-aaa-orange/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              'Loading…'
            ) : (
              <>
                Subscribe now
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </>
            )}
          </button>
          {error ? (
            <p role="alert" className="mt-3 text-sm font-medium text-red-300">
              {error}
            </p>
          ) : null}
          <p className="mt-4 text-xs text-slate-400">
            Prices include VAT where applicable. Secure checkout by Stripe.
          </p>
        </div>
      </div>
    </article>
  )
}
