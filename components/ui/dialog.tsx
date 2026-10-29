'use client'

// Dialog primitives in the shadcn/ui style, built on Radix. Radix provides the
// focus trap, scroll lock, Escape handling, focus return and aria wiring that
// the old hand-rolled `fixed inset-0` overlays lacked.
//
// Motion is a short fade only (see `.dialog-*` in globals.css) and is switched
// off by the global prefers-reduced-motion rule.

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type HTMLAttributes } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogPortal = DialogPrimitive.Portal
export const DialogClose = DialogPrimitive.Close

export const DialogOverlay = forwardRef<
  ElementRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(function DialogOverlay({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn('dialog-overlay fixed inset-0 bg-black/50', className)}
      {...props}
    />
  )
})

const SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
} as const

export type DialogSize = keyof typeof SIZE_CLASSES

interface DialogContentProps extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  size?: DialogSize
  /**
   * Render the dimmed backdrop. The super-admin action modals (SCORM import,
   * AI generation, survey insights, banner generation) pass `false` so the page
   * behind stays visible while they work.
   */
  overlay?: boolean
  /** Extra classes for the backdrop, e.g. a brand-tinted colour. */
  overlayClassName?: string
  /** Close when the user clicks outside the panel. Defaults to true. */
  dismissOnOutsideClick?: boolean
  /** Show the built-in top-right close button. Turn off when the dialog has its own. */
  showClose?: boolean
  /** Skip the default panel chrome (background, border, radius, shadow, scroll). */
  unstyled?: boolean
  /** Classes for the full-screen positioning wrapper, e.g. to bottom-align on mobile. */
  containerClassName?: string
}

export const DialogContent = forwardRef<ElementRef<typeof DialogPrimitive.Content>, DialogContentProps>(
  function DialogContent(
    {
      className,
      children,
      size = 'md',
      overlay = true,
      overlayClassName,
      dismissOnOutsideClick = true,
      showClose = true,
      unstyled = false,
      containerClassName,
      onInteractOutside,
      ...props
    },
    ref,
  ) {
    return (
      <DialogPortal>
        {/* The wrapper centres the panel and lets clicks fall through to the
            overlay. The overlay lives inside it because DialogPortal maps over
            its children and would wrap a `false` child in its own Presence. */}
        <div
          className={cn(
            'fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none',
            containerClassName,
          )}
        >
          {overlay && <DialogOverlay className={overlayClassName} />}
          <DialogPrimitive.Content
            ref={ref}
            onInteractOutside={(e) => {
              if (!dismissOnOutsideClick) e.preventDefault()
              onInteractOutside?.(e)
            }}
            className={cn(
              'dialog-content pointer-events-auto relative w-full focus:outline-hidden',
              SIZE_CLASSES[size],
              !unstyled &&
                'bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto',
              className,
            )}
            {...props}
          >
            {children}
            {showClose && (
              <DialogPrimitive.Close
                className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-primary-400 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </DialogPrimitive.Close>
            )}
          </DialogPrimitive.Content>
        </div>
      </DialogPortal>
    )
  },
)

export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 pr-8', className)} {...props} />
}

export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  )
}

export const DialogTitle = forwardRef<
  ElementRef<typeof DialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(function DialogTitle({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn('text-lg font-semibold text-slate-900 dark:text-slate-100', className)}
      {...props}
    />
  )
})

export const DialogDescription = forwardRef<
  ElementRef<typeof DialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(function DialogDescription({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn('text-sm text-slate-500 dark:text-slate-400', className)}
      {...props}
    />
  )
})
