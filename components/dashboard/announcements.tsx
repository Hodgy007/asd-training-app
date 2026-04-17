'use client'

import { useState, useEffect } from 'react'
import { Megaphone, X } from 'lucide-react'
import { clsx } from 'clsx'

interface AnnouncementData {
  id: string
  title: string
  body: string
  organisationId: string | null
  createdAt: string
}

export function DashboardAnnouncements() {
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const stored = localStorage.getItem('dismissed-announcements')
      if (stored) setDismissed(new Set(JSON.parse(stored)))
    } catch {}

    fetch('/api/announcements/active')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAnnouncements(data)
      })
      .catch(() => {})
  }, [])

  function dismiss(id: string) {
    const next = new Set(dismissed)
    next.add(id)
    setDismissed(next)
    try {
      localStorage.setItem('dismissed-announcements', JSON.stringify([...next]))
    } catch {}
  }

  const visible = announcements.filter((a) => !dismissed.has(a.id))

  if (visible.length === 0) return null

  return (
    <div className="space-y-3">
      {visible.map((a) => {
        const isGlobal = a.organisationId === null
        return (
          <div
            key={a.id}
            className={clsx(
              'rounded-xl p-5 border-l-[6px] relative shadow-sm',
              isGlobal
                ? 'bg-primary-100 border-l-primary-600 dark:bg-primary-900/30 dark:border-l-primary-400'
                : 'bg-amber-100 border-l-amber-600 dark:bg-amber-900/30 dark:border-l-amber-400'
            )}
          >
            <button
              onClick={() => dismiss(a.id)}
              className="absolute top-3 right-3 p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white/60 dark:hover:bg-slate-800/60"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-start gap-4 pr-8">
              <div
                className={clsx(
                  'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center',
                  isGlobal
                    ? 'bg-primary-600 dark:bg-primary-500'
                    : 'bg-amber-600 dark:bg-amber-500'
                )}
              >
                <Megaphone className="h-7 w-7 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  className={clsx(
                    'font-bold text-base leading-snug',
                    isGlobal
                      ? 'text-primary-900 dark:text-primary-100'
                      : 'text-amber-900 dark:text-amber-100'
                  )}
                >
                  {a.title}
                </h3>
                <p
                  className={clsx(
                    'text-sm mt-1.5 whitespace-pre-line leading-relaxed',
                    isGlobal
                      ? 'text-primary-800 dark:text-primary-200'
                      : 'text-amber-800 dark:text-amber-200'
                  )}
                >
                  {a.body}
                </p>
                <p
                  className={clsx(
                    'text-xs font-medium mt-2',
                    isGlobal
                      ? 'text-primary-700 dark:text-primary-300'
                      : 'text-amber-700 dark:text-amber-300'
                  )}
                >
                  {new Date(a.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
