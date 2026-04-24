import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { requireStripe, isPaymentsEnabled, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe'
import { handleStripeEvent } from '@/lib/stripe-webhook'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!isPaymentsEnabled) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!STRIPE_WEBHOOK_SECRET) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const sig = req.headers.get('stripe-signature')
  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const body = await req.text()
  const stripe = requireStripe()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)
  } catch (error) {
    console.error('[stripe-webhook] Signature verification failed:', error)
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 })
  }

  try {
    await handleStripeEvent(event)
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[stripe-webhook] Handler error for event', event.type, error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
