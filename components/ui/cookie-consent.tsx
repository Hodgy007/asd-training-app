'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Cookie, X } from 'lucide-react'

const STORAGE_KEY = 'cookie-consent-accepted'

export function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const bannerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== 'true') {
        setVisible(true)
      }
    } catch {
      // localStorage unavailable (e.g. private browsing) — show banner
      setVisible(true)
    }
  }, [])

  useEffect(() => {
    if (!visible || !bannerRef.current) return
    const el = bannerRef.current
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    el.animate(
      [
        { transform: 'translateY(100%)', opacity: 0 },
        { transform: 'translateY(0)', opacity: 1 },
      ],
      { duration: 300, easing: 'ease-out', fill: 'forwards' }
    )
  }, [visible])

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      // silently ignore
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      ref={bannerRef}
      role="banner"
      aria-label="Cookie consent"
      className="fixed bottom-0 inset-x-0 z-50"
    >
      <div className="bg-white dark:bg-slate-800 border-t border-calm-200 dark:border-slate-700 shadow-lg px-4 py-3">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
            <Cookie className="h-5 w-5 shrink-0 text-primary-500" aria-hidden="true" />
            <p className="text-sm">
              This site uses essential cookies for authentication and security. No tracking cookies are used.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/privacy"
              className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 underline underline-offset-2"
            >
              Privacy Policy
            </Link>
            <button onClick={accept} className="btn-primary text-sm px-4 py-1.5">
              Accept
            </button>
            <button
              onClick={accept}
              aria-label="Dismiss cookie consent banner"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
