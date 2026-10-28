'use client'

// Slide-over container for the sidebar on small screens. Built on the Radix
// dialog so the menu traps focus, closes on Escape, locks page scroll and hands
// focus back to the menu button when it closes.

import type { ReactNode } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { DialogOverlay } from '@/components/ui/dialog'

export function MobileNavDrawer({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <div className="fixed inset-0 z-50 md:hidden">
          <DialogOverlay className="bg-black/40 backdrop-blur-sm" />
          <DialogPrimitive.Content
            className="absolute left-0 top-0 h-full w-72 focus:outline-none"
            aria-describedby={undefined}
          >
            <DialogPrimitive.Title className="sr-only">Navigation menu</DialogPrimitive.Title>
            {children}
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
