'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { Bell } from 'lucide-react'
import { clsx } from 'clsx'
import { NotificationsDropdown } from './notifications-dropdown'
import type { NotificationsPayload } from '@/lib/notifications'

interface NotificationsBellProps {
  iconClassName: string
}

export function NotificationsBell({ iconClassName }: NotificationsBellProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<NotificationsPayload | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) throw new Error('fetch failed')
      const payload = (await res.json()) as NotificationsPayload
      setData(payload)
    } catch {
      setData({ count: 0, sections: { forYou: [], whatsNew: [] } })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, pathname])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function markOpened() {
    try {
      await fetch('/api/notifications', { method: 'POST' })
      setData((prev) => {
        if (!prev) return prev
        const whatsNew = prev.sections.whatsNew.map((item) => ({ ...item, isNew: false }))
        return {
          count: prev.sections.forYou.length,
          sections: { forYou: prev.sections.forYou, whatsNew },
        }
      })
    } catch {
      // Next page load will sync.
    }
  }

  function handleToggle() {
    const willOpen = !open
    setOpen(willOpen)
    if (willOpen) void markOpened()
  }

  const count = data?.count ?? 0
  const badgeLabel = count > 99 ? '99+' : String(count)

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleToggle}
        className={clsx('p-2 rounded-xl transition-colors relative', iconClassName)}
        aria-label={`Notifications, ${count} new`}
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {badgeLabel}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-1rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg z-50">
          <NotificationsDropdown
            data={data}
            loading={loading}
            onItemClick={() => setOpen(false)}
            onMarkAllSeen={() => void markOpened()}
          />
        </div>
      )}
    </div>
  )
}
