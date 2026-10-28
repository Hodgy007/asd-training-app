'use client'

// App-wide toast notifications via sonner. <Toaster /> is mounted once in
// app/layout.tsx; anywhere else just `import { toast } from '@/components/ui/toaster'`
// and call `toast.success('Saved')` / `toast.error(message)`.
//
// Toasts stay up a little longer than sonner's default and always show a close
// button, so nobody has to race a disappearing message.

import { Toaster as SonnerToaster, toast } from 'sonner'
import { useTheme } from 'next-themes'

export { toast }

/**
 * The `(message, type)` shape the admin pages used for their hand-rolled
 * toasts, now routed through sonner so every page shows the same, accessible
 * (aria-live) notification.
 */
export function showToast(message: string, type: 'success' | 'error' = 'success') {
  if (type === 'error') toast.error(message)
  else toast.success(message)
}

export function Toaster() {
  const { resolvedTheme } = useTheme()
  return (
    <SonnerToaster
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      position="bottom-right"
      duration={6000}
      closeButton
      richColors
      toastOptions={{ className: 'font-sans' }}
    />
  )
}
