import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Checkout cancelled
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            No charge was made. You can return to the courses page whenever you&rsquo;re ready.
          </p>
          <div className="mt-6">
            <Link href="/courses">
              <Button>Back to courses</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
