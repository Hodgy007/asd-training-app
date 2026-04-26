import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { isPaymentsEnabled } from '@/lib/stripe'
import type { Session } from 'next-auth'

const HIDDEN_ROLES = new Set(['STUDENT', 'INTERN', 'EMPLOYEE'])

export function ExploreMoreCard({ session }: { session: Session }) {
  if (!isPaymentsEnabled) return null
  if (HIDDEN_ROLES.has(session.user.role)) return null

  return (
    <Link
      href="/courses"
      className="card group block transition-colors hover:border-warm-300"
    >
      <div className="flex items-center gap-3">
        <span
          className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-warm-100 text-warm-600"
          aria-hidden="true"
        >
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">
            More training
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Browse our course catalogue
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-600">
        Buy a single course or subscribe for unlimited access.
      </p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-warm-600 transition group-hover:gap-1.5 group-hover:text-warm-700">
        Browse courses
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  )
}
