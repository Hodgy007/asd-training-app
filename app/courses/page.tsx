import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import {
  isPaymentsEnabled,
  stripe,
  STRIPE_SUBSCRIPTION_PRICE_MONTHLY,
  STRIPE_SUBSCRIPTION_PRICE_YEARLY,
} from '@/lib/stripe'
import { ProgramCard } from '@/components/courses/program-card'
import { SubscriptionCard } from '@/components/courses/subscription-card'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function formatStripePrice(priceId: string | undefined): Promise<string | null> {
  if (!priceId || !stripe) return null
  try {
    const price = await stripe.prices.retrieve(priceId)
    if (!price.unit_amount || !price.currency) return null
    const amount = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: price.currency.toUpperCase(),
    }).format(price.unit_amount / 100)
    const interval = price.recurring?.interval
    return interval ? `${amount} / ${interval}` : amount
  } catch (error) {
    console.error('[courses] Failed to load price', priceId, error)
    return null
  }
}

export default async function CoursesPage() {
  if (!isPaymentsEnabled) {
    notFound()
  }

  const programs = await prisma.trainingProgram.findMany({
    where: {
      status: 'APPROVED',
      active: true,
      purchasable: true,
    },
    select: {
      id: true,
      name: true,
      description: true,
      priceAmount: true,
      currency: true,
      stripePriceId: true,
    },
    orderBy: { name: 'asc' },
  })

  const [monthlyPrice, yearlyPrice] = await Promise.all([
    formatStripePrice(STRIPE_SUBSCRIPTION_PRICE_MONTHLY),
    formatStripePrice(STRIPE_SUBSCRIPTION_PRICE_YEARLY),
  ])

  const subscriptionConfigured = Boolean(monthlyPrice || yearlyPrice)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-5xl px-4 py-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Training courses
          </h1>
          <Link
            href="/login"
            className="text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Buy a single course or subscribe for unlimited access
          </h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            After checkout we&rsquo;ll email your sign-in details. All prices include VAT where
            applicable.
          </p>
        </section>

        {subscriptionConfigured ? (
          <section className="mb-10">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Subscription
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <SubscriptionCard monthlyPrice={monthlyPrice} yearlyPrice={yearlyPrice} />
            </div>
          </section>
        ) : null}

        <section>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Individual courses
          </h3>
          {programs.length === 0 ? (
            <p className="text-slate-600 dark:text-slate-400">
              No courses are currently available to purchase. Please check back soon.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {programs.map((program) => (
                <ProgramCard
                  key={program.id}
                  programId={program.id}
                  name={program.name}
                  description={program.description}
                  priceAmount={program.priceAmount}
                  currency={program.currency}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
