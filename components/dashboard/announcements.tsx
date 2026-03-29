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
              'rounded-xl p-4 border-l-4 relative',
              isGlobal
                ? 'bg-blue-50 border-l-blue-500 dark:bg-blue-900/20 dark:border-l-blue-400'
                : 'bg-amber-50 border-l-amber-500 dark:bg-amber-900/20 dark:border-l-amber-400'
            )}
          >
            <button
              onClick={() => dismiss(a.id)}
              className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/50"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-start gap-3 pr-8">
              <Megaphone className={clsx(
                'h-5 w-5 mt-0.5 flex-shrink-0',
                isGlobal ? 'text-blue-500' : 'text-amber-500'
              )} />
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">{a.title}</h3>
                <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">{a.body}</p>
                <p className="text-xs text-slate-400 mt-2">
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
