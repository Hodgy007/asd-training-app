'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'

interface ProgramCardProps {
  programId: string
  name: string
  description: string | null
  priceAmount: number | null
  currency: string
}

function formatPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  } catch {
    return `£${(amount / 100).toFixed(2)}`
  }
}

export function ProgramCard({ programId, name, description, priceAmount, currency }: ProgramCardProps) {
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
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>{name}</CardTitle>
      </CardHeader>
      <CardBody className="flex-1">
        {description ? <p className="text-slate-600 dark:text-slate-400">{description}</p> : null}
      </CardBody>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {priceAmount ? formatPrice(priceAmount, currency) : 'Contact us'}
        </span>
        <Button onClick={handleBuy} disabled={loading || !priceAmount}>
          {loading ? 'Loading…' : 'Buy'}
        </Button>
      </div>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </Card>
  )
}
