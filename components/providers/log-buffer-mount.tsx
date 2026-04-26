'use client'

import { useEffect } from 'react'

export function LogBufferMount() {
  useEffect(() => {
    void import('@/lib/client-log-buffer')
  }, [])
  return null
}
