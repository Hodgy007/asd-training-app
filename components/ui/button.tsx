import { clsx } from 'clsx'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'sage' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center font-medium rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

    const variants = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
      secondary: 'bg-white text-slate-700 border border-calm-300 hover:bg-calm-50 focus:ring-primary-500',
      sage: 'bg-sage-600 text-white hover:bg-sage-700 focus:ring-sage-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      ghost: 'text-slate-600 hover:bg-calm-100 hover:text-slate-900 focus:ring-primary-500',
    }

    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2 gap-2',
      lg: 'text-base px-6 py-3 gap-2',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading && (
          <span
            className={clsx(
              'rounded-full border-2 border-t-transparent animate-spin',
              size === 'sm' ? 'w-3 h-3' : 'w-4 h-4',
              variant === 'primary' || variant === 'sage' || variant === 'danger'
                ? 'border-white/30 border-t-white'
                : 'border-slate-300 border-t-slate-600'
            )}
          />
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
