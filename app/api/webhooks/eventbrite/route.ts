import { NextRequest, NextResponse } from 'next/server'
import { logger, errMeta } from '@/lib/logger'
import { getEventbriteConfig, EventbriteWebhookPayload } from '@/lib/eventbrite'
import {
  processOrder,
  processEventUpdate,
  processEventUnpublish,
} from '@/lib/eventbrite-sync'

export const runtime = 'nodejs'

/**
 * Eventbrite webhook receiver.
 *
 * Eventbrite doesn't sign webhook bodies. We trust the request only if:
 *   1. config.webhook_id matches the id we registered (acts as shared secret),
 *   2. api_url is on eventbriteapi.com (enforced inside fetchByApiUrl),
 *   3. our config has a Private Token (we always re-fetch the resource via
 *      api_url, so a forged payload can't inject content — it could only
 *      trigger us to fetch from a different webhook id, which we reject).
 *
 * Always return 200 quickly to acknowledge — Eventbrite retries on 5xx and
 * we don't want a single bad event to wedge the queue.
 */
export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') ?? undefined

  let payload: EventbriteWebhookPayload
  try {
    payload = (await req.json()) as EventbriteWebhookPayload
  } catch {
    logger.warn('eventbrite.webhook.invalid_json', { requestId })
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const action = payload?.config?.action
  const apiUrl = payload?.api_url
  const incomingWebhookId = payload?.config?.webhook_id
  if (!action || !apiUrl || !incomingWebhookId) {
    logger.warn('eventbrite.webhook.missing_fields', { requestId, action, apiUrl })
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const config = await getEventbriteConfig()
  if (!config?.privateToken || !config.webhookId) {
    logger.warn('eventbrite.webhook.not_configured', { requestId })
    // 200 so Eventbrite stops retrying; we'll re-register on next setup.
    return NextResponse.json({ ignored: 'not_configured' })
  }

  if (config.webhookId !== incomingWebhookId) {
    logger.warn('eventbrite.webhook.wrong_id', {
      requestId,
      expected: config.webhookId,
      got: incomingWebhookId,
    })
    return NextResponse.json({ ignored: 'wrong_webhook_id' })
  }

  const startedAt = Date.now()
  logger.info('eventbrite.webhook.received', { requestId, action, apiUrl })

  try {
    await dispatch(action, apiUrl)
    logger.info('eventbrite.webhook.handled', {
      requestId,
      action,
      durationMs: Date.now() - startedAt,
    })
    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error('eventbrite.webhook.handler_failed', {
      requestId,
      action,
      apiUrl,
      durationMs: Date.now() - startedAt,
      ...errMeta(error),
    })
    // Return 200 anyway — see header note. Manual sync from the workshop
    // admin page is the recovery path for any individual event we drop.
    return NextResponse.json({ error: 'handler_failed' })
  }
}

async function dispatch(action: string, apiUrl: string): Promise<void> {
  switch (action) {
    case 'order.placed':
    case 'order.updated':
    case 'order.refunded': {
      const orderId = extractIdFromApiUrl(apiUrl, 'orders')
      if (!orderId) throw new Error(`Cannot extract order id from ${apiUrl}`)
      await processOrder(orderId)
      return
    }
    case 'attendee.updated':
    case 'attendee.checked_in': {
      // Refresh the cohort's attendees end-to-end. Cheaper than parsing the
      // attendee api_url and risk missing the event id segment.
      const eventId = extractIdFromApiUrl(apiUrl, 'events')
      if (!eventId) {
        await processAttendeeFallback(apiUrl)
        return
      }
      const { syncAttendeesAsCohortMembers } = await import('@/lib/eventbrite-sync')
      await syncAttendeesAsCohortMembers(eventId)
      return
    }
    case 'event.updated': {
      const eventId = extractIdFromApiUrl(apiUrl, 'events')
      if (!eventId) throw new Error(`Cannot extract event id from ${apiUrl}`)
      await processEventUpdate(eventId)
      return
    }
    case 'event.unpublished': {
      const eventId = extractIdFromApiUrl(apiUrl, 'events')
      if (!eventId) throw new Error(`Cannot extract event id from ${apiUrl}`)
      await processEventUnpublish(eventId)
      return
    }
    default:
      logger.info('eventbrite.webhook.ignored_action', { action })
  }
}

/**
 * Extract the id following a known segment in an api_url path.
 *   extractIdFromApiUrl('https://.../v3/orders/12345/', 'orders') → '12345'
 */
function extractIdFromApiUrl(apiUrl: string, segment: string): string | null {
  try {
    const url = new URL(apiUrl)
    const parts = url.pathname.split('/').filter(Boolean)
    const idx = parts.indexOf(segment)
    if (idx < 0 || idx >= parts.length - 1) return null
    const candidate = parts[idx + 1]
    return /^\d+$/.test(candidate) ? candidate : null
  } catch {
    return null
  }
}

async function processAttendeeFallback(apiUrl: string): Promise<void> {
  const { fetchByApiUrl, requireEventbriteToken } = await import('@/lib/eventbrite')
  const { syncAttendeesAsCohortMembers } = await import('@/lib/eventbrite-sync')
  const token = await requireEventbriteToken()
  const attendee = await fetchByApiUrl<{ event_id: string }>(apiUrl, token)
  if (attendee?.event_id) {
    await syncAttendeesAsCohortMembers(attendee.event_id)
  }
}
