'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

type Status = {
  mode: 'purchase' | 'subscription'
  paid: boolean
  fulfilled: boolean
  email: string | null
}

const POLL_INTERVAL_MS = 1500
const POLL_TIMEOUT_MS = 10_000

export default function CheckoutSuccessPage() {
  const params = useSearchParams()
  const sessionId = params.get('session_id')
  const [status, setStatus] = useState<Status | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    const start = Date.now()

    async function poll() {
      try {
        const res = await fetch(`/api/checkout/session/${sessionId}/status`)
        if (!res.ok) {
          throw new Error('Could not confirm payment')
        }
        const data = (await res.json()) as Status
        if (cancelled) return
        setStatus(data)
        if (data.fulfilled) return
        if (Date.now() - start > POLL_TIMEOUT_MS) {
          setTimedOut(true)
          return
        }
        setTimeout(poll, POLL_INTERVAL_MS)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    }

    poll()
    return () => {
      cancelled = true
    }
  }, [sessionId])

  if (!sessionId) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Missing checkout session
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          We couldn&rsquo;t find your checkout session. If you completed payment, please check your
          email.
        </p>
        <div className="mt-6">
          <Link href="/login">
            <Button>Go to sign in</Button>
          </Link>
        </div>
      </Shell>
    )
  }

  if (error) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          We hit a problem confirming your payment
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">{error}</p>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          If your card was charged, your account will still be created and we&rsquo;ll email your
          sign-in details shortly.
        </p>
      </Shell>
    )
  }

  if (status?.fulfilled) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Payment confirmed — you&rsquo;re all set
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          {status.email
            ? `We've emailed sign-in details to ${status.email}.`
            : 'We\u2019ve emailed your sign-in details.'}{' '}
          Check your inbox (and spam folder) for a message from us.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href={status.email ? `/login?email=${encodeURIComponent(status.email)}` : '/login'}>
            <Button>Go to sign in</Button>
          </Link>
        </div>
      </Shell>
    )
  }

  if (timedOut) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Thanks — your payment is being processed
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          This can take a minute or two. We&rsquo;ll email your sign-in details as soon as your
          account is ready. You can close this page.
        </p>
        <div className="mt-6">
          <Link href="/login">
            <Button variant="secondary">Go to sign in</Button>
          </Link>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        Confirming your payment…
      </h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        This usually takes just a few seconds. Please don&rsquo;t close this page.
      </p>
      <div className="mt-6">
        <div className="h-2 w-48 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full w-1/3 animate-pulse bg-primary-500" />
        </div>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
