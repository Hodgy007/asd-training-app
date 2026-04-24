'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'

interface SubscriptionCardProps {
  monthlyPrice: string | null
  yearlyPrice: string | null
}

export function SubscriptionCard({ monthlyPrice, yearlyPrice }: SubscriptionCardProps) {
  const [interval, setInterval] = useState<'month' | 'year'>('month')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubscribe() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'subscription', interval }),
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

  const monthConfigured = Boolean(monthlyPrice)
  const yearConfigured = Boolean(yearlyPrice)
  const activeConfigured = interval === 'month' ? monthConfigured : yearConfigured

  return (
    <Card className="flex flex-col h-full border-2 border-primary-500">
      <CardHeader>
        <div className="inline-block rounded-full bg-primary-100 dark:bg-primary-900/40 px-3 py-1 text-xs font-semibold text-primary-700 dark:text-primary-300 mb-2">
          All Access
        </div>
        <CardTitle>Unlimited training</CardTitle>
      </CardHeader>
      <CardBody className="flex-1">
        <p className="text-slate-600 dark:text-slate-400">
          Access every training programme on the platform. Cancel anytime.
        </p>
        <div className="mt-4 inline-flex rounded-full border border-slate-200 dark:border-slate-700 p-1">
          <button
            type="button"
            onClick={() => setInterval('month')}
            className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
              interval === 'month'
                ? 'bg-primary-500 text-white'
                : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setInterval('year')}
            className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
              interval === 'year'
                ? 'bg-primary-500 text-white'
                : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            Yearly
          </button>
        </div>
      </CardBody>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {interval === 'month' ? monthlyPrice ?? 'Contact us' : yearlyPrice ?? 'Contact us'}
        </span>
        <Button onClick={handleSubscribe} disabled={loading || !activeConfigured}>
          {loading ? 'Loading…' : 'Subscribe'}
        </Button>
      </div>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </Card>
  )
}
