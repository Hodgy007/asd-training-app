'use client'

import { useState } from 'react'
import { Send, Check, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

interface SendInviteButtonProps {
  userId: string
  userEmail: string
  compact?: boolean
  onSent?: () => void
}

/**
 * Reusable button that sends (or re-sends) an activation / invite email to a user.
 * Posts to /api/admin/users/[userId]/invite — which handles both first-time
 * invites and re-sends (it deletes any existing password-reset token and creates
 * a fresh 7-day activation link).
 *
 * Button auto-resets to idle after 3 seconds so the same button row can be used
 * again for a different user in-session.
 */
export function SendInviteButton({ userId, userEmail, compact, onSent }: SendInviteButtonProps) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    if (state === 'sending' || state === 'sent') return
    if (!confirm(`Send a fresh sign-in link to ${userEmail}?`)) return

    setState('sending')
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}/invite`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to send invite')
      }
      setState('sent')
      onSent?.()
      setTimeout(() => setState('idle'), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send invite')
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  const label =
    state === 'sending' ? 'Sending…' :
    state === 'sent' ? 'Sent' :
    state === 'error' ? 'Retry' :
    'Send invite'

  const Icon = state === 'sending' ? Loader2 : state === 'sent' ? Check : Send

  if (compact) {
    return (
      <button
        onClick={handleClick}
        disabled={state === 'sending'}
        title={error ?? `Email ${userEmail} a sign-in link`}
        aria-label={`Send invite to ${userEmail}`}
        className={clsx(
          'p-1.5 rounded-lg transition-colors',
          state === 'sent'
            ? 'text-sage-600 bg-sage-50 dark:bg-sage-900/40'
            : state === 'error'
            ? 'text-red-600 bg-red-50 dark:bg-red-900/40'
            : 'text-slate-500 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800',
        )}
      >
        <Icon className={clsx('h-4 w-4', state === 'sending' && 'animate-spin')} />
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === 'sending'}
      title={error ?? undefined}
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
        state === 'sent'
          ? 'text-sage-700 bg-sage-100 dark:bg-sage-900/40 dark:text-sage-300'
          : state === 'error'
          ? 'text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-300'
          : 'text-slate-600 hover:text-primary-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
      )}
    >
      <Icon className={clsx('h-3.5 w-3.5', state === 'sending' && 'animate-spin')} />
      {label}
    </button>
  )
}
