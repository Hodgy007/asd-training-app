import type { ComponentType, SVGProps } from 'react'
import { cn } from '@/lib/cn'

// A single icon on a tinted, rounded-square tile — the "feature" icon used on
// auth confirmations, empty states, cards and dashboard stats. One shape (the
// corner radius scales with the tile), four sizes and six tones, so the same
// meaning always looks the same across the app.

export type IconTileTone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
export type IconTileSize = 'sm' | 'md' | 'lg' | 'xl'

const TONES: Record<IconTileTone, string> = {
  primary: 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
  success: 'bg-sage-100 text-sage-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  warning: 'bg-warm-100 text-warm-600 dark:bg-orange-900/30 dark:text-orange-400',
  danger: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  neutral: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300',
}

const SIZES: Record<IconTileSize, { tile: string; icon: string }> = {
  sm: { tile: 'h-8 w-8 rounded-lg', icon: 'h-4 w-4' },
  md: { tile: 'h-10 w-10 rounded-xl', icon: 'h-5 w-5' },
  lg: { tile: 'h-12 w-12 rounded-xl', icon: 'h-6 w-6' },
  xl: { tile: 'h-14 w-14 rounded-2xl', icon: 'h-7 w-7' },
}

interface IconTileProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  tone?: IconTileTone
  size?: IconTileSize
  /** Layout classes for the tile (margins, `shrink-0`, `inline-flex`…). */
  className?: string
}

export function IconTile({ icon: Icon, tone = 'primary', size = 'md', className }: IconTileProps) {
  return (
    <div
      className={cn('flex shrink-0 items-center justify-center', SIZES[size].tile, TONES[tone], className)}
      aria-hidden="true"
    >
      <Icon className={SIZES[size].icon} />
    </div>
  )
}
