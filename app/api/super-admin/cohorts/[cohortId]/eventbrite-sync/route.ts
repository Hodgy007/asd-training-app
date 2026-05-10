import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import {
  upsertCohortFromEvent,
  syncAttendeesAsCohortMembers,
} from '@/lib/eventbrite-sync'
import { EventbriteError } from '@/lib/eventbrite'
import { logger, errMeta } from '@/lib/logger'

export const runtime = 'nodejs'

/**
 * Manual "Refresh from Eventbrite" + sync attendees button on the cohort
 * detail page. Delegates entirely to the sync library.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { cohortId: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_COHORTS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const link = await prisma.cohortEventbriteEvent.findUnique({
    where: { cohortId: params.cohortId },
    select: { externalEventId: true },
  })
  if (!link) {
    return NextResponse.json(
      { error: 'This cohort is not linked to an Eventbrite event.' },
      { status: 404 },
    )
  }

  try {
    await upsertCohortFromEvent(link.externalEventId)
    const sync = await syncAttendeesAsCohortMembers(link.externalEventId)
    return NextResponse.json({ sync })
  } catch (error) {
    if (error instanceof EventbriteError) {
      return NextResponse.json(
        { error: `Eventbrite returned ${error.status}.` },
        { status: 502 },
      )
    }
    logger.error('eventbrite.cohort.manual_sync_failed', errMeta(error))
    return NextResponse.json({ error: 'Sync failed.' }, { status: 500 })
  }
}
