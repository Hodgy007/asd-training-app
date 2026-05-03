import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { requireStripe, isPaymentsEnabled, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe'
import { handleStripeEvent } from '@/lib/stripe-webhook'
import { logger, errMeta } from '@/lib/logger'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') ?? undefined

  if (!isPaymentsEnabled) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!STRIPE_WEBHOOK_SECRET) {
    logger.error('stripe.webhook.misconfigured', {
      requestId,
      reason: 'STRIPE_WEBHOOK_SECRET missing',
    })
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const sig = req.headers.get('stripe-signature')
  if (!sig) {
    logger.warn('stripe.webhook.missing_signature', { requestId })
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const body = await req.text()
  const stripe = requireStripe()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)
  } catch (error) {
    logger.error('stripe.webhook.signature_invalid', {
      requestId,
      bodyBytes: body.length,
      ...errMeta(error),
    })
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 })
  }

  logger.info('stripe.webhook.received', {
    requestId,
    eventId: event.id,
    eventType: event.type,
    livemode: event.livemode,
  })

  const startedAt = Date.now()
  try {
    await handleStripeEvent(event)
    logger.info('stripe.webhook.handled', {
      requestId,
      eventId: event.id,
      eventType: event.type,
      durationMs: Date.now() - startedAt,
    })
    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error('stripe.webhook.handler_failed', {
      requestId,
      eventId: event.id,
      eventType: event.type,
      durationMs: Date.now() - startedAt,
      ...errMeta(error),
    })
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
