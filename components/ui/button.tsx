import { ButtonHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

type Variant = 'primary' | 'secondary' | 'tertiary'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-primary-500 text-white rounded-full font-semibold hover:bg-primary-600 focus:ring-primary-400 disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-full font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 focus:ring-primary-400 disabled:opacity-50 disabled:cursor-not-allowed',
  tertiary:
    'text-primary-600 hover:text-primary-700 font-semibold focus:ring-primary-400',
}

const SIZE_CLASSES: Record<Variant, Record<Size, string>> = {
  primary: { sm: 'px-4 py-1.5 text-sm', md: 'px-5 py-2 text-sm' },
  secondary: { sm: 'px-4 py-1.5 text-sm', md: 'px-5 py-2 text-sm' },
  tertiary: { sm: 'px-2 py-1 text-sm', md: 'px-3 py-1.5 text-sm' },
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={clsx(
        'inline-flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-colors',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[variant][size],
        className,
      )}
      {...props}
    />
  )
})
