'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface Props {
  src: string | null
  onClose: () => void
  alt?: string
}

/**
 * Centred image preview modal. Portalled to document.body so the `fixed`
 * positioning is anchored to the viewport rather than to a transformed /
 * filtered / backdrop-blurred ancestor — which was causing the modal to
 * appear in the middle of the document and forcing users to scroll.
 *
 * Closes on backdrop click, X button, or Escape.
 */
export function ImageLightbox({ src, onClose, alt = 'Zoomed image' }: Props) {
  // Lock body scroll while the modal is open so the page underneath doesn't
  // bounce around when the user dismisses it.
  useEffect(() => {
    if (!src) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
    }
  }, [src, onClose])

  if (!src) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 cursor-pointer p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative max-w-3xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
        />
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-white dark:bg-slate-700 shadow-lg flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>,
    document.body
  )
}
