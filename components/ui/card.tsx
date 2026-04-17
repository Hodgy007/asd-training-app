import { HTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

type DivProps = HTMLAttributes<HTMLDivElement>

export const Card = forwardRef<HTMLDivElement, DivProps>(function Card(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={clsx(
        'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5',
        className,
      )}
      {...props}
    />
  )
})

export function CardHeader({ className, ...props }: DivProps) {
  return <div className={clsx('mb-3', className)} {...props} />
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={clsx(
        'text-base font-semibold text-slate-900 dark:text-slate-100',
        className,
      )}
      {...props}
    />
  )
}

export function CardBody({ className, ...props }: DivProps) {
  return (
    <div
      className={clsx('text-sm text-slate-700 dark:text-slate-300', className)}
      {...props}
    />
  )
}

export function CardFooter({ className, ...props }: DivProps) {
  return (
    <div
      className={clsx(
        'mt-4 pt-3 border-t border-slate-200 dark:border-slate-800',
        className,
      )}
      {...props}
    />
  )
}
