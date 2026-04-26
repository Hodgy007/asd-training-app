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
      className="group block overflow-hidden rounded-2xl bg-[#001522] p-5 text-white shadow-sm ring-1 ring-white/10 transition hover:shadow-lg"
    >
      <div className="flex items-center gap-3">
        <span
          className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-aaa-orange text-white"
          aria-hidden="true"
        >
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-aaa-orange-light">
            More training
          </p>
          <p className="mt-0.5 text-sm font-semibold text-white">
            Browse our course catalogue
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-300">
        Buy a single course or subscribe for unlimited access to every programme.
      </p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-aaa-orange-light transition group-hover:gap-2">
        Browse courses
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  )
}
