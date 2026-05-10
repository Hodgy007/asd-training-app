import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  upsertCohortFromEvent,
  syncAttendeesAsCohortMembers,
} from '@/lib/eventbrite-sync'
import { logger, errMeta } from '@/lib/logger'

export const runtime = 'nodejs'
export const maxDuration = 120

/**
 * Daily resync: walks every Eventbrite-linked cohort and refreshes both
 * the cached event metadata and the attendee → CohortMembership mirror.
 *
 * Intended trigger: Vercel cron (configured in vercel.json). Bearer-token
 * protected via CRON_SECRET when set; otherwise requires the
 * `x-vercel-cron` header that Vercel injects on cron invocations.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  const isVercelCron = req.headers.get('x-vercel-cron') === '1'

  if (cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}` && !isVercelCron) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } else if (!isVercelCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const config = await prisma.charityEventbriteConfig.findFirst()
  if (!config?.privateToken) {
    return NextResponse.json({ skipped: 'not_configured' })
  }

  const links = await prisma.cohortEventbriteEvent.findMany({
    where: { status: { in: ['LIVE', 'DRAFT'] } },
    select: { id: true, externalEventId: true, cohortId: true },
  })

  const results = {
    total: links.length,
    refreshed: 0,
    failed: 0,
    attendeeStats: { matched: 0, invited: 0, skipped: 0 },
  }

  for (const link of links) {
    try {
      await upsertCohortFromEvent(link.externalEventId)
      const sync = await syncAttendeesAsCohortMembers(link.externalEventId)
      results.refreshed++
      results.attendeeStats.matched += sync.matched
      results.attendeeStats.invited += sync.invited
      results.attendeeStats.skipped += sync.skipped
    } catch (err) {
      results.failed++
      logger.error('eventbrite.cron.cohort_failed', {
        cohortId: link.cohortId,
        externalEventId: link.externalEventId,
        ...errMeta(err),
      })
    }
  }

  await prisma.charityEventbriteConfig.update({
    where: { id: config.id },
    data: { lastSyncAt: new Date() },
  })

  logger.info('eventbrite.cron.completed', results)
  return NextResponse.json(results)
}
