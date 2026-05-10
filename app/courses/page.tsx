import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import {
  isPaymentsEnabled,
  stripe,
  STRIPE_SUBSCRIPTION_PRICE_YEARLY,
} from '@/lib/stripe'
import { ProgramCard } from '@/components/courses/program-card'
import { SubscriptionCard } from '@/components/courses/subscription-card'
import { WorkshopCard } from '@/components/courses/workshop-card'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ACCENT_CYCLE = [
  '#f5821f', // orange
  '#34b44a', // green
  '#056bb0', // blue
  '#e13caf', // pink
  '#fcaf17', // amber
  '#44c7ee', // sky
] as const

async function formatStripePrice(priceId: string | undefined): Promise<string | null> {
  if (!priceId || !stripe) return null
  try {
    const price = await stripe.prices.retrieve(priceId)
    if (!price.unit_amount || !price.currency) return null
    const amount = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: price.currency.toUpperCase(),
      maximumFractionDigits: price.unit_amount % 100 === 0 ? 0 : 2,
    }).format(price.unit_amount / 100)
    const interval = price.recurring?.interval
    return interval ? `${amount} / ${interval}` : amount
  } catch (error) {
    console.error('[courses] Failed to load price', priceId, error)
    return null
  }
}

function TrustItem({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="mt-0.5 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-aaa-orange/10 text-aaa-orange"
        aria-hidden="true"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
      <div>
        <p className="text-sm font-semibold text-[#001522]">{title}</p>
        <p className="mt-0.5 text-xs text-[#475569]">{description}</p>
      </div>
    </div>
  )
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description?: string
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-aaa-orange">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-bold leading-tight text-[#001522] sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-base leading-relaxed text-[#475569]">{description}</p>
      ) : null}
    </div>
  )
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams?: { audience?: string | string[] }
}) {
  if (!isPaymentsEnabled) {
    notFound()
  }

  const rawAudience = Array.isArray(searchParams?.audience)
    ? searchParams?.audience[0]
    : searchParams?.audience
  const audienceFilter =
    rawAudience?.toUpperCase() === 'EDUCATION'
      ? 'EDUCATION'
      : rawAudience?.toUpperCase() === 'EMPLOYER'
        ? 'EMPLOYER'
        : null

  const programs = await prisma.trainingProgram.findMany({
    where: {
      status: 'APPROVED',
      active: true,
      purchasable: true,
      ...(audienceFilter ? { audience: audienceFilter } : {}),
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

  // Eventbrite-sourced workshops live on Cohort organisations via the
  // CohortEventbriteEvent metadata table. We surface ones the admin has
  // toggled `purchasable` on, that are still LIVE on Eventbrite, and whose
  // start time hasn't passed.
  const workshops = await prisma.cohortEventbriteEvent.findMany({
    where: {
      purchasable: true,
      status: 'LIVE',
      startsAt: { gte: new Date() },
      ...(audienceFilter ? { audience: audienceFilter } : {}),
    },
    orderBy: { startsAt: 'asc' },
  })

  const yearlyPrice = await formatStripePrice(STRIPE_SUBSCRIPTION_PRICE_YEARLY)
  const subscriptionConfigured = Boolean(yearlyPrice)

  return (
    <div className="courses-public min-h-screen bg-[#ffffff] text-[#001522]">
      <style
        dangerouslySetInnerHTML={{
          __html: `
.courses-public .text-\\[\\#001522\\] { color: #001522; }
.courses-public .text-\\[\\#334155\\] { color: #334155; }
.courses-public .text-\\[\\#475569\\] { color: #475569; }
.courses-public .text-\\[\\#64748b\\] { color: #64748b; }
.courses-public .text-white { color: #ffffff; }
.courses-public .text-slate-100 { color: #f1f5f9; }
.courses-public .text-slate-200 { color: #e2e8f0; }
.courses-public .text-slate-300 { color: #cbd5e1; }
.courses-public .text-slate-400 { color: #94a3b8; }
.courses-public .text-aaa-orange { color: #f5821f; }
.courses-public .text-aaa-orange-light { color: #fcaf17; }
.courses-public .text-aaa-blue-light { color: #44c7ee; }
.courses-public .text-red-300 { color: #fca5a5; }
.courses-public .hover\\:text-white:hover { color: #ffffff; }
.courses-public .hover\\:text-\\[\\#001522\\]:hover { color: #001522; }
        `,
        }}
      />
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-[#ffffff]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link
            href="/courses"
            className="flex items-center gap-3"
            aria-label="Ambitious about Autism — Training"
          >
            <img src="/logo-aaa.svg" alt="" className="h-12 w-auto" />
            <span className="hidden text-sm font-semibold text-[#334155] sm:inline">
              Training Platform
            </span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-3">
            <a
              href="https://www.ambitiousaboutautism.org.uk"
              target="_blank"
              rel="noreferrer"
              className="hidden px-3 py-2 text-sm font-medium text-[#475569] hover:text-[#001522] md:inline-block"
            >
              About the charity
            </a>
            <a
              href="#courses"
              className="hidden px-3 py-2 text-sm font-medium text-[#475569] hover:text-[#001522] md:inline-block"
            >
              Courses
            </a>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-[#001522] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a2a3d]"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#001522] text-white">
        <div
          className="pointer-events-none absolute -top-32 -right-32 h-[30rem] w-[30rem] rounded-full bg-aaa-orange/30 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-40 -left-32 h-80 w-80 rounded-full bg-aaa-blue-light/20 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-6 py-20 lg:py-28">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-aaa-orange/40 bg-aaa-orange/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-aaa-orange-light">
              <span className="h-1.5 w-1.5 rounded-full bg-aaa-orange" />
              Ambitious about Autism · Training
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Practical training for a more{' '}
              <span className="text-aaa-orange">autism-confident</span> world.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
              Built with autistic young people, families and practitioners. Buy a single
              course or subscribe for unlimited access — and start learning today.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href="#courses"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-aaa-orange px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-aaa-orange/30 transition hover:brightness-110"
              >
                Browse courses
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
              {subscriptionConfigured ? (
                <a
                  href="#subscription"
                  className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/5 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-white/10"
                >
                  See subscription
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-[#f8fafc]">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <TrustItem
            title="Charity-led"
            description="Profits reinvested in autistic young people."
          />
          <TrustItem
            title="Co-designed"
            description="Built with autistic learners and families."
          />
          <TrustItem
            title="CPD-aligned"
            description="Practical content for caregivers and educators."
          />
          <TrustItem
            title="Instant access"
            description="Sign-in details emailed after checkout."
          />
        </div>
      </section>

      {subscriptionConfigured ? (
        <section id="subscription" className="bg-[#ffffff]">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <SectionHeader
              eyebrow="Best value"
              title="One subscription. Every course."
              description="Designed for individuals, teams and schools who want to stay current as we publish new training."
            />
            <div className="mt-10">
              <SubscriptionCard yearlyPrice={yearlyPrice} />
            </div>
          </div>
        </section>
      ) : null}

      {workshops.length > 0 ? (
        <section
          id="workshops"
          className={`bg-[#ffffff] ${subscriptionConfigured ? '' : 'border-t border-slate-200'}`}
        >
          <div className="mx-auto max-w-6xl px-6 py-20">
            <SectionHeader
              eyebrow="Live workshops"
              title="Upcoming live sessions"
              description="In-person and online workshops booked directly through Eventbrite. Limited places — book early."
            />
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {workshops.map((w, index) => (
                <WorkshopCard
                  key={w.id}
                  name={w.name}
                  description={w.description}
                  imageUrl={w.imageUrl}
                  startsAt={w.startsAt}
                  venue={w.venue}
                  ticketUrl={w.ticketUrl}
                  priceText={w.priceText}
                  soldOut={w.soldOut}
                  accentHex={ACCENT_CYCLE[index % ACCENT_CYCLE.length]}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section
        id="courses"
        className={`bg-[#f8fafc] ${
          subscriptionConfigured || workshops.length > 0 ? '' : 'border-t border-slate-200'
        }`}
      >
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionHeader
            eyebrow="Self-paced courses"
            title="Buy a single course"
            description="Lifetime access to the modules you need — paid once, no subscription required."
          />
          {programs.length === 0 ? (
            <div className="mt-10 rounded-3xl border-2 border-dashed border-slate-300 bg-[#ffffff] p-12 text-center">
              <p className="text-base text-[#475569]">
                No courses are currently available to purchase. Please check back soon.
              </p>
            </div>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {programs.map((program, index) => (
                <ProgramCard
                  key={program.id}
                  programId={program.id}
                  name={program.name}
                  description={program.description}
                  priceAmount={program.priceAmount}
                  currency={program.currency}
                  accentHex={ACCENT_CYCLE[index % ACCENT_CYCLE.length]}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="bg-[#001522] text-slate-300">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-3">
          <div>
            <div className="inline-flex items-center rounded-xl bg-[#ffffff] p-3">
              <img
                src="/logo-aaa.svg"
                alt="Ambitious about Autism"
                className="h-12 w-auto"
              />
            </div>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-slate-400">
              Ambitious about Autism is the national charity for autistic children and young
              people. We stand with autistic young people and champion their rights.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white">
              Charity
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a
                  href="https://www.ambitiousaboutautism.org.uk"
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-300 transition hover:text-white"
                >
                  About us
                </a>
              </li>
              <li>
                <a
                  href="https://www.ambitiousaboutautism.org.uk/about-us/contact-us"
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-300 transition hover:text-white"
                >
                  Contact
                </a>
              </li>
              <li>
                <a
                  href="https://www.ambitiousaboutautism.org.uk/donate"
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-300 transition hover:text-white"
                >
                  Donate
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white">
              Platform
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/login" className="text-slate-300 transition hover:text-white">
                  Sign in
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-slate-300 transition hover:text-white"
                >
                  Privacy policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-6 py-6 text-xs text-slate-400 sm:flex-row sm:items-center">
            <p>© Ambitious about Autism. Registered charity 1063184.</p>
            <p>All prices include VAT where applicable. Secure checkout by Stripe.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
