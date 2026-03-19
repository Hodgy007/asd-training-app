import { clsx } from 'clsx'
import { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'sage' | 'warm' | 'slate' | 'amber' | 'red'
  size?: 'sm' | 'md'
}

export function Badge({ variant = 'slate', size = 'sm', className, children, ...props }: BadgeProps) {
  const variants = {
    primary: 'bg-primary-100 text-primary-700',
    sage: 'bg-sage-100 text-sage-700',
    warm: 'bg-warm-100 text-warm-500',
    slate: 'bg-calm-200 text-slate-600',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
  }

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  }

  return (
    <span
      className={clsx('inline-flex items-center rounded-full font-medium', variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </span>
  )
}
