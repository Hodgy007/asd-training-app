import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import {
  listOwnEvents,
  requireEventbriteToken,
  EventbriteError,
  mapEventStatus,
  formatPriceText,
  isSoldOut,
  pickImageUrl,
  pickVenue,
} from '@/lib/eventbrite'
import { logger, errMeta } from '@/lib/logger'

export const runtime = 'nodejs'

/**
 * List the charity's upcoming Eventbrite events for the import picker. Each
 * event is enriched with `alreadyLinked` + `existingCohortId` by joining
 * against `CohortEventbriteEvent` rows so the UI can disable + deep-link.
 */
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_COHORTS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let token: string
  try {
    token = await requireEventbriteToken()
  } catch {
    return NextResponse.json({ error: 'eventbrite_not_configured' }, { status: 503 })
  }

  let events
  try {
    events = await listOwnEvents(token)
  } catch (error) {
    if (error instanceof EventbriteError) {
      const reason =
        error.status === 401
          ? 'Eventbrite rejected the token. Re-check it in Settings → Eventbrite.'
          : `Eventbrite returned ${error.status}.`
      return NextResponse.json({ error: reason }, { status: 502 })
    }
    logger.error('eventbrite.events.list_failed', errMeta(error))
    return NextResponse.json({ error: 'Could not load Eventbrite events.' }, { status: 500 })
  }

  // Single round-trip to find which of these events we've already imported.
  const ids = events.map((e) => e.id)
  const links = ids.length
    ? await prisma.cohortEventbriteEvent.findMany({
        where: { externalEventId: { in: ids } },
        select: { externalEventId: true, cohortId: true },
      })
    : []
  const linkMap = new Map(links.map((l) => [l.externalEventId, l.cohortId]))

  const enriched = events.map((event) => ({
    id: event.id,
    name: event.name.text,
    startsAt: event.start.utc,
    endsAt: event.end?.utc ?? null,
    venue: pickVenue(event),
    ticketUrl: event.url,
    imageUrl: pickImageUrl(event),
    priceText: formatPriceText(event),
    capacity: event.capacity ?? null,
    soldOut: isSoldOut(event),
    status: mapEventStatus(event.status),
    alreadyLinked: linkMap.has(event.id),
    existingCohortId: linkMap.get(event.id) ?? null,
  }))

  return NextResponse.json({ events: enriched })
}
