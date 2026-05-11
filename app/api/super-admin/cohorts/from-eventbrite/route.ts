import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { parseEventbriteUrl, EventbriteError } from '@/lib/eventbrite'
import {
  upsertCohortFromEvent,
  syncAttendeesAsCohortMembers,
  ensureWebhookRegistered,
} from '@/lib/eventbrite-sync'
import { logger, errMeta } from '@/lib/logger'

export const runtime = 'nodejs'

interface ImportResult {
  eventId: string
  cohortId?: string
  created?: boolean
  error?: string
}

/**
 * Import one or more Eventbrite events as cohorts. Accepts either form:
 *   POST { urlOrId: string,    purchasable?: boolean }   — single (URL paste)
 *   POST { eventIds: string[], purchasable?: boolean }   — bulk (event picker)
 *
 * Returns `{ cohortId, created }` for single mode (back-compat) or
 * `{ results, summary }` for bulk mode.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_COHORTS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const purchasable = body.purchasable === true
  const baseUrl = process.env.NEXTAUTH_URL

  // Bulk mode — eventIds is an array of strings
  if (Array.isArray(body.eventIds)) {
    const ids = (body.eventIds as unknown[])
      .filter((v): v is string => typeof v === 'string')
      .map((s) => s.trim())
      .filter(Boolean)
    if (ids.length === 0) {
      return NextResponse.json({ error: 'eventIds is empty.' }, { status: 400 })
    }

    const results: ImportResult[] = []
    let createdAny = false
    for (const eventId of ids) {
      const existing = await prisma.cohortEventbriteEvent.findUnique({
        where: { externalEventId: eventId },
        select: { cohortId: true },
      })
      if (existing) {
        results.push({ eventId, cohortId: existing.cohortId, created: false })
        continue
      }
      try {
        const result = await upsertCohortFromEvent(eventId, { purchasable })
        results.push({ eventId, cohortId: result.cohortId, created: result.created })
        if (result.created) {
          createdAny = true
          // Backfill existing bookings so the cohort isn't empty when the
          // admin lands on it. Best-effort — webhook handles the steady state.
          try {
            await syncAttendeesAsCohortMembers(eventId)
          } catch (err) {
            logger.warn('eventbrite.bulk_import.initial_sync_failed', {
              eventId,
              ...errMeta(err),
            })
          }
        }
      } catch (error) {
        const message = describeError(error)
        results.push({ eventId, error: message })
        logger.warn('eventbrite.bulk_import.event_failed', { eventId, error: message })
      }
    }

    // Webhook registration runs once at the end, only if we created something.
    if (createdAny && baseUrl && !baseUrl.includes('localhost')) {
      try {
        await ensureWebhookRegistered(baseUrl)
      } catch (err) {
        logger.warn('eventbrite.bulk_import.webhook_register_failed', errMeta(err))
      }
    }

    return NextResponse.json({
      results,
      summary: {
        created: results.filter((r) => r.created === true).length,
        skipped: results.filter((r) => r.created === false).length,
        failed: results.filter((r) => r.error !== undefined).length,
      },
    })
  }

  // Single mode — back-compat URL paste
  const rawInput = typeof body.urlOrId === 'string' ? body.urlOrId.trim() : ''
  const eventId = parseEventbriteUrl(rawInput)
  if (!eventId) {
    return NextResponse.json(
      { error: 'Could not extract an Eventbrite event id from that URL.' },
      { status: 400 },
    )
  }

  const existing = await prisma.cohortEventbriteEvent.findUnique({
    where: { externalEventId: eventId },
    select: { cohortId: true },
  })
  if (existing) {
    return NextResponse.json(
      {
        error: 'A cohort already exists for this Eventbrite event.',
        cohortId: existing.cohortId,
      },
      { status: 409 },
    )
  }

  try {
    const result = await upsertCohortFromEvent(eventId, { purchasable })

    // Backfill existing bookings on first import. Best-effort.
    if (result.created) {
      try {
        await syncAttendeesAsCohortMembers(eventId)
      } catch (err) {
        logger.warn('eventbrite.cohort.initial_sync_failed', { eventId, ...errMeta(err) })
      }
    }

    if (baseUrl && !baseUrl.includes('localhost')) {
      try {
        await ensureWebhookRegistered(baseUrl)
      } catch (err) {
        logger.warn('eventbrite.cohort.webhook_register_failed', errMeta(err))
      }
    }

    return NextResponse.json({ cohortId: result.cohortId, created: result.created })
  } catch (error) {
    const message = describeError(error)
    if (error instanceof EventbriteError) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    if (error instanceof Error && error.message.includes('not configured')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    logger.error('eventbrite.cohort.create_failed', errMeta(error))
    return NextResponse.json({ error: 'Could not import cohort from Eventbrite.' }, { status: 500 })
  }
}

function describeError(error: unknown): string {
  if (error instanceof EventbriteError) {
    if (error.status === 401) return 'Eventbrite rejected the token. Re-check it in Settings → Eventbrite.'
    if (error.status === 404) return 'Eventbrite returned 404 — that event id does not exist on this account.'
    return `Eventbrite returned ${error.status}.`
  }
  if (error instanceof Error && error.message.includes('not configured')) {
    return 'Eventbrite integration is not set up. Configure it in Settings → Eventbrite first.'
  }
  return error instanceof Error ? error.message : 'Unknown error'
}
