import { clsx } from 'clsx'
import { HTMLAttributes, forwardRef } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  variant?: 'default' | 'flat' | 'outlined'
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hover, variant = 'default', className, children, ...props }, ref) => {
    const base = 'rounded-2xl p-6'
    const variants = {
      default: 'bg-white shadow-sm border border-calm-200',
      flat: 'bg-calm-50 border border-calm-200',
      outlined: 'bg-transparent border-2 border-calm-200',
    }
    const hoverStyles = hover
      ? 'transition-all hover:shadow-md hover:border-primary-200 cursor-pointer'
      : ''

    return (
      <div ref={ref} className={clsx(base, variants[variant], hoverStyles, className)} {...props}>
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('mb-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={clsx('text-lg font-semibold text-slate-900', className)} {...props}>
      {children}
    </h3>
  )
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('', className)} {...props}>
      {children}
    </div>
  )
}
