'use client'

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'sidebar-collapsed'

/**
 * Persist a collapse preference shared across every dashboard / admin layout.
 * Returns [collapsed, toggle]. The first paint always uses `false` to keep
 * SSR markup deterministic; the persisted value (if any) is applied on mount.
 */
export function useSidebarCollapse() {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === 'true') {
        setCollapsed(true)
      }
    } catch {
      // private mode / disabled storage — fall back to expanded
    }
  }, [])

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  return [collapsed, toggle] as const
}
