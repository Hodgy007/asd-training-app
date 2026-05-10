import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { parseEventbriteUrl, EventbriteError } from '@/lib/eventbrite'
import {
  upsertCohortFromEvent,
  ensureWebhookRegistered,
} from '@/lib/eventbrite-sync'
import { logger, errMeta } from '@/lib/logger'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_COHORTS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const rawInput = typeof body?.urlOrId === 'string' ? body.urlOrId.trim() : ''
  const eventId = parseEventbriteUrl(rawInput)
  if (!eventId) {
    return NextResponse.json(
      { error: 'Could not extract an Eventbrite event id from that URL.' },
      { status: 400 },
    )
  }

  // Reject duplicates with a useful redirect target.
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
    const result = await upsertCohortFromEvent(eventId)

    // Best-effort webhook registration. If NEXTAUTH_URL is localhost (dev),
    // skip it — Eventbrite can't reach our box. Manual sync + cron still work.
    const baseUrl = process.env.NEXTAUTH_URL
    if (baseUrl && !baseUrl.includes('localhost')) {
      try {
        await ensureWebhookRegistered(baseUrl)
      } catch (err) {
        logger.warn('eventbrite.cohort.webhook_register_failed', errMeta(err))
      }
    }

    return NextResponse.json({ cohortId: result.cohortId, created: result.created })
  } catch (error) {
    if (error instanceof EventbriteError) {
      const reason =
        error.status === 401
          ? 'Eventbrite rejected the token. Re-check it in Settings → Eventbrite.'
          : error.status === 404
            ? 'Eventbrite returned 404 — that event id does not exist on this account.'
            : `Eventbrite returned ${error.status}.`
      return NextResponse.json({ error: reason }, { status: 400 })
    }
    if (error instanceof Error && error.message.includes('not configured')) {
      return NextResponse.json(
        { error: 'Eventbrite integration is not set up. Configure it in Settings → Eventbrite first.' },
        { status: 400 },
      )
    }
    logger.error('eventbrite.cohort.create_failed', errMeta(error))
    return NextResponse.json({ error: 'Could not import cohort from Eventbrite.' }, { status: 500 })
  }
}
