import Link from 'next/link'
import type { ComponentType, SVGProps } from 'react'
import { cn } from '@/lib/cn'
import { IconTile, type IconTileTone } from '@/components/ui/icon-tile'

// The "nothing here yet" panel: a large icon tile, a short heading, one line of
// explanation and, when there's somewhere useful to go, a single button. Use it
// instead of a bare line of grey text so an empty page still tells the learner
// what this space is for and what to do next.

interface EmptyStateProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  title: string
  description?: string
  action?: { href: string; label: string }
  tone?: IconTileTone
  /** Wrapper classes, e.g. `card` to sit the panel on a card. */
  className?: string
}

export function EmptyState({ icon, title, description, action, tone = 'info', className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-4 py-12 text-center', className)}>
      <IconTile icon={icon} tone={tone} size="xl" />
      <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
      )}
      {action && (
        <Link href={action.href} className="btn-secondary mt-5 text-sm">
          {action.label}
        </Link>
      )}
    </div>
  )
}
