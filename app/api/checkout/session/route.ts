import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  requireStripe,
  isPaymentsEnabled,
  STRIPE_SUBSCRIPTION_PRICE_YEARLY,
} from '@/lib/stripe'
import { createRateLimiter, getClientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const checkoutLimiter = createRateLimiter('stripe-checkout', 5 * 60 * 1000, 10)

const schema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('purchase'), programId: z.string().min(1) }),
  z.object({ mode: z.literal('subscription'), interval: z.literal('year') }),
])

export async function POST(req: NextRequest) {
  if (!isPaymentsEnabled) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const ip = getClientIp(req)
  const rl = await checkoutLimiter.check(ip)
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const stripe = requireStripe()
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const successUrl = `${baseUrl}/courses/success?session_id={CHECKOUT_SESSION_ID}`
  const cancelUrl = `${baseUrl}/courses/cancel`

  const session = await getServerSession(authOptions)

  let customerId: string | undefined
  let customerEmail: string | undefined
  let clientReferenceId: string | undefined

  if (session?.user?.organisationId) {
    const org = await prisma.organisation.findUnique({
      where: { id: session.user.organisationId },
      select: { id: true, stripeCustomerId: true, name: true },
    })
    if (!org) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
    }

    if (org.stripeCustomerId) {
      customerId = org.stripeCustomerId
    } else {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: org.name,
        metadata: { organisationId: org.id },
      })
      customerId = customer.id
      await prisma.organisation.update({
        where: { id: org.id },
        data: { stripeCustomerId: customer.id },
      })
    }
    clientReferenceId = org.id
  } else if (session?.user?.id) {
    // Individual subscriber — reuse the user's Stripe customer if we already have one,
    // otherwise let Stripe match by email.
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true, email: true, name: true },
    })
    if (user?.stripeCustomerId) {
      customerId = user.stripeCustomerId
    } else {
      const customer = await stripe.customers.create({
        email: user?.email ?? session.user.email ?? undefined,
        name: user?.name ?? undefined,
        metadata: { userId: session.user.id },
      })
      customerId = customer.id
      await prisma.user.update({
        where: { id: session.user.id },
        data: { stripeCustomerId: customer.id },
      })
    }
  } else if (session?.user?.email) {
    customerEmail = session.user.email
  }

  let lineItems: Array<{ price: string; quantity: number }>
  let metadata: Record<string, string>
  let mode: 'payment' | 'subscription'

  if (parsed.data.mode === 'purchase') {
    const program = await prisma.trainingProgram.findUnique({
      where: { id: parsed.data.programId },
      select: {
        id: true,
        name: true,
        purchasable: true,
        stripePriceId: true,
        active: true,
      },
    })
    if (!program || !program.active || !program.purchasable || !program.stripePriceId) {
      return NextResponse.json({ error: 'Program not available for purchase' }, { status: 400 })
    }
    lineItems = [{ price: program.stripePriceId, quantity: 1 }]
    metadata = { programId: program.id, mode: 'purchase' }
    mode = 'payment'
  } else {
    const priceId = STRIPE_SUBSCRIPTION_PRICE_YEARLY
    if (!priceId) {
      return NextResponse.json({ error: 'Subscription not configured' }, { status: 500 })
    }
    lineItems = [{ price: priceId, quantity: 1 }]
    metadata = { interval: 'year', mode: 'subscription' }
    mode = 'subscription'
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode,
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail,
      client_reference_id: clientReferenceId,
      metadata,
      billing_address_collection: 'required',
      automatic_tax: { enabled: true },
      ...(customerId ? { customer_update: { address: 'auto' } } : {}),
      ...(mode === 'subscription' ? { subscription_data: { metadata } } : {}),
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('[checkout] Stripe session create failed:', error)
    return NextResponse.json({ error: 'Checkout unavailable. Try again shortly.' }, { status: 502 })
  }
}
