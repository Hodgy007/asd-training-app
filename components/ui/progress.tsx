import { clsx } from 'clsx'

interface ProgressProps {
  value: number
  max?: number
  variant?: 'primary' | 'sage' | 'warm'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showLabel?: boolean
}

export function Progress({
  value,
  max = 100,
  variant = 'primary',
  size = 'md',
  className,
  showLabel = false,
}: ProgressProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100)

  const trackColour = 'bg-calm-200'
  const fillColour = {
    primary: 'bg-primary-500',
    sage: 'bg-sage-500',
    warm: 'bg-warm-400',
  }[variant]

  const height = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }[size]

  return (
    <div className={clsx('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>{value}/{max}</span>
          <span>{Math.round(pct)}%</span>
        </div>
      )}
      <div className={clsx('w-full rounded-full overflow-hidden', trackColour, height)}>
        <div
          className={clsx('h-full rounded-full transition-all duration-500', fillColour)}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  )
}
