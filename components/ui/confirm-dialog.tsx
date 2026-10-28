'use client'

// Promise-based replacement for the browser confirm dialog:
//
//   const confirmAction = useConfirm()
//   if (!(await confirmAction({ title: 'Delete "Intro"?', tone: 'danger', confirmLabel: 'Delete' }))) return
//
// <ConfirmProvider> is mounted once in app/layout.tsx and renders a single
// accessible AlertDialog. Unlike the browser dialog it is styled, themed,
// focus-trapped, and starts focus on Cancel.

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  type AlertDialogTone,
} from './alert-dialog'

export interface ConfirmOptions {
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** `danger` renders a red confirm button — use it for anything irreversible. */
  tone?: AlertDialogTone
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [open, setOpen] = useState(false)
  const resolver = useRef<((value: boolean) => void) | null>(null)

  const settle = useCallback((value: boolean) => {
    resolver.current?.(value)
    resolver.current = null
    setOpen(false)
  }, [])

  const confirm = useCallback<ConfirmFn>((next) => {
    // A second request while one is open cancels the first rather than
    // leaving its promise pending forever.
    resolver.current?.(false)
    setOptions(next)
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={open} onOpenChange={(isOpen) => { if (!isOpen) settle(false) }}>
        {options && (
          <AlertDialogContent {...(options.description ? {} : { 'aria-describedby': undefined })}>
            <AlertDialogHeader>
              <AlertDialogTitle>{options.title}</AlertDialogTitle>
              {options.description && (
                <AlertDialogDescription>{options.description}</AlertDialogDescription>
              )}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{options.cancelLabel ?? 'Cancel'}</AlertDialogCancel>
              <AlertDialogAction tone={options.tone} onClick={() => settle(true)}>
                {options.confirmLabel ?? 'Confirm'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext)
  if (!confirm) throw new Error('useConfirm must be used inside <ConfirmProvider>')
  return confirm
}
