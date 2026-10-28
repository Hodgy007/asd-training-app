'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { Dialog, DialogContent } from './dialog'

interface Props {
  src: string | null
  onClose: () => void
  alt?: string
}

/**
 * Centred image preview modal. Built on the shared Dialog, which portals to
 * document.body (so `fixed` positioning is anchored to the viewport rather than
 * a transformed ancestor), locks body scroll, and returns focus on close.
 *
 * Closes on backdrop click, X button, or Escape.
 */
export function ImageLightbox({ src, onClose, alt = 'Zoomed image' }: Props) {
  return (
    <Dialog open={!!src} onOpenChange={(open) => { if (!open) onClose() }}>
      {src && (
        <DialogContent
          unstyled
          size="3xl"
          showClose={false}
          overlayClassName="bg-black/70 cursor-pointer"
          className="w-auto max-h-[90vh]"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">{alt}</DialogPrimitive.Title>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
          />
          <DialogPrimitive.Close
            aria-label="Close"
            className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-white dark:bg-slate-700 shadow-lg flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </DialogContent>
      )}
    </Dialog>
  )
}
