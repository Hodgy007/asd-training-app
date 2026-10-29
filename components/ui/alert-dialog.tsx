'use client'

// AlertDialog primitives in the shadcn/ui style, built on Radix. Use these for
// confirmations: unlike Dialog they cannot be dismissed by clicking outside,
// and focus starts on Cancel so a stray Enter never confirms a destructive action.
// Most call sites want the promise-based `useConfirm()` in ./confirm-dialog.

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type HTMLAttributes } from 'react'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import { cn } from '@/lib/cn'

export const AlertDialog = AlertDialogPrimitive.Root
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger
export const AlertDialogPortal = AlertDialogPrimitive.Portal

export const AlertDialogContent = forwardRef<
  ElementRef<typeof AlertDialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(function AlertDialogContent({ className, ...props }, ref) {
  return (
    <AlertDialogPortal>
      <div className="fixed inset-0 z-70 flex items-center justify-center p-4 pointer-events-none">
        <AlertDialogPrimitive.Overlay className="dialog-overlay fixed inset-0 bg-black/50" />
        <AlertDialogPrimitive.Content
          ref={ref}
          className={cn(
            'dialog-content pointer-events-auto relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 focus:outline-hidden',
            className,
          )}
          {...props}
        />
      </div>
    </AlertDialogPortal>
  )
})

export function AlertDialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5', className)} {...props} />
}

export function AlertDialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2', className)}
      {...props}
    />
  )
}

export const AlertDialogTitle = forwardRef<
  ElementRef<typeof AlertDialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(function AlertDialogTitle({ className, ...props }, ref) {
  return (
    <AlertDialogPrimitive.Title
      ref={ref}
      className={cn('text-lg font-semibold text-slate-900 dark:text-slate-100', className)}
      {...props}
    />
  )
})

export const AlertDialogDescription = forwardRef<
  ElementRef<typeof AlertDialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(function AlertDialogDescription({ className, ...props }, ref) {
  return (
    <AlertDialogPrimitive.Description
      ref={ref}
      className={cn('text-sm text-slate-600 dark:text-slate-300', className)}
      {...props}
    />
  )
})

export type AlertDialogTone = 'default' | 'danger'

const ACTION_TONE: Record<AlertDialogTone, string> = {
  default:
    'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-400',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-400',
}

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 px-5 py-2 text-sm rounded-full font-semibold focus:outline-hidden focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'

export const AlertDialogAction = forwardRef<
  ElementRef<typeof AlertDialogPrimitive.Action>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action> & { tone?: AlertDialogTone }
>(function AlertDialogAction({ className, tone = 'default', ...props }, ref) {
  return (
    <AlertDialogPrimitive.Action
      ref={ref}
      className={cn(BUTTON_BASE, ACTION_TONE[tone], className)}
      {...props}
    />
  )
})

export const AlertDialogCancel = forwardRef<
  ElementRef<typeof AlertDialogPrimitive.Cancel>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(function AlertDialogCancel({ className, ...props }, ref) {
  return (
    <AlertDialogPrimitive.Cancel
      ref={ref}
      className={cn(
        BUTTON_BASE,
        'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 focus:ring-primary-400',
        className,
      )}
      {...props}
    />
  )
})
