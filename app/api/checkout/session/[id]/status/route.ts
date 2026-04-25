import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isPaymentsEnabled, requireStripe } from '@/lib/stripe'

export const runtime = 'nodejs'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isPaymentsEnabled) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const sessionId = params.id
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session id' }, { status: 400 })
  }

  const stripe = requireStripe()

  let stripeSession
  try {
    stripeSession = await stripe.checkout.sessions.retrieve(sessionId)
  } catch (error) {
    console.error('[checkout-status] Failed to retrieve session', sessionId, error)
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const mode = stripeSession.mode === 'subscription' ? 'subscription' : 'purchase'
  const email = stripeSession.customer_details?.email ?? null
  const paid =
    stripeSession.payment_status === 'paid' || stripeSession.payment_status === 'no_payment_required'

  let fulfilled = false
  if (mode === 'purchase') {
    const purchase = await prisma.purchase.findUnique({
      where: { stripeCheckoutSessionId: sessionId },
      select: { status: true },
    })
    fulfilled = purchase?.status === 'PAID'
  } else {
    const subscriptionId = stripeSession.subscription as string | null
    if (subscriptionId) {
      const [org, user] = await Promise.all([
        prisma.organisation.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
          select: { id: true },
        }),
        prisma.user.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
          select: { id: true },
        }),
      ])
      fulfilled = Boolean(org || user)
    }
  }

  return NextResponse.json({ mode, paid, fulfilled, email })
}
