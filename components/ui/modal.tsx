'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

/**
 * Simple prop-driven wrapper around the Radix-based Dialog in ./dialog, kept
 * for call sites that just want `isOpen` / `onClose`. Reach for Dialog directly
 * when you need more control over the layout.
 */
export function Modal({ isOpen, onClose, title, description, children, size = 'md' }: ModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent size={size} {...(title && description ? {} : { 'aria-describedby': undefined })}>
        {title ? (
          <DialogHeader className="p-6 border-b border-calm-200 dark:border-slate-700">
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        ) : (
          <DialogTitle className="sr-only">Dialog</DialogTitle>
        )}
        <div className="p-6">{children}</div>
      </DialogContent>
    </Dialog>
  )
}
