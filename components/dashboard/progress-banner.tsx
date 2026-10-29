import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

// The coloured banner at the top of the learner dashboard: overall progress as
// a ring, what to do next, and one button to get there.
//
// It sits on primary-700 rather than 500 so white body text keeps WCAG AA
// contrast in every colour theme (white on the orange 500 is only 2.6:1).
// Text lives in <div>/<span> with explicit dark: colours because the global
// dark-mode rules recolour every <p> and heading (the h1 overrides that).

interface ProgressBannerProps {
  firstName: string
  progressPct: number
  /** What the button leads to; null when nothing is assigned yet. */
  next: { label: string; href: string; cta: string } | null
}

const RING_RADIUS = 15
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

export function ProgressBanner({ firstName, progressPct, next }: ProgressBannerProps) {
  const pct = Math.min(100, Math.max(0, progressPct))

  return (
    <section
      aria-label="Your progress"
      className="flex flex-col gap-4 rounded-2xl bg-primary-700 p-5 text-white sm:flex-row sm:items-center sm:gap-5 sm:p-6"
    >
      <div className="relative h-20 w-20 shrink-0" role="img" aria-label={`${pct}% of your training complete`}>
        <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90" aria-hidden="true">
          <circle cx="18" cy="18" r={RING_RADIUS} fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
          {/* Skipped at 0%: a zero-length round-capped stroke still paints a dot. */}
          {pct > 0 && (
            <circle
              cx="18"
              cy="18"
              r={RING_RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * RING_LENGTH} ${RING_LENGTH}`}
            />
          )}
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">{pct}%</span>
      </div>

      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-bold text-white dark:text-white sm:text-2xl">Welcome back, {firstName}</h1>
        <div className="mt-1 text-white/90 dark:text-white/90">
          {next ? next.label : 'Your training will appear here once your organisation assigns a programme.'}
        </div>
      </div>

      {next && (
        <Link
          href={next.href}
          className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-white px-5 py-2.5 text-sm font-bold text-primary-700 transition-colors hover:bg-primary-50 focus:outline-hidden focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-700 dark:bg-white dark:text-primary-700 dark:hover:bg-primary-50 sm:self-center"
        >
          {next.cta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </section>
  )
}
