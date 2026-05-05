'use client'

import { useEffect, useState } from 'react'

type Me =
  | { authenticated: true; session: { name: string | null; email: string | null }; registrant: null }
  | { authenticated: false; registrant: { name: string; email: string; hasAccount: boolean } | null }

// Tiny status pill in the toolkit footer. Shows the current toolkit-session
// identity (if any) and a "Forget me on this browser" button. Doesn't
// render anything when there's no toolkit cookie and no NextAuth session.
export function ToolkitSessionStatus() {
  const [me, setMe] = useState<Me | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    fetch('/api/toolkit/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setMe(j ?? null))
      .catch(() => setMe(null))
  }, [])

  if (!me) return null
  if (me.authenticated) return null
  const reg = me.registrant
  if (!reg) return null

  async function handleForget() {
    setSigningOut(true)
    try {
      await fetch('/api/toolkit/sign-out', { method: 'POST' })
      window.location.reload()
    } catch {
      setSigningOut(false)
    }
  }

  return (
    <div className="inline-flex items-center gap-2 text-xs text-slate-300">
      <span>
        Signed in as <span className="font-semibold text-white">{reg.name}</span>
      </span>
      <span aria-hidden="true">·</span>
      <button
        type="button"
        onClick={handleForget}
        disabled={signingOut}
        className="font-semibold underline transition hover:text-white disabled:opacity-50"
      >
        Forget me on this browser
      </button>
    </div>
  )
}
