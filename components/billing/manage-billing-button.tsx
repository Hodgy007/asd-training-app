'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface ManageBillingButtonProps {
  disabled?: boolean
}

export function ManageBillingButton({ disabled = false }: ManageBillingButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Could not open billing portal')
      }
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div>
      <Button onClick={handleClick} disabled={disabled || loading}>
        {loading ? 'Opening…' : 'Manage billing'}
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
