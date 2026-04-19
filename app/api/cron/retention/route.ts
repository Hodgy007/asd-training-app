import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Daily retention sweep for Child Observations.
 *
 * For each Organisation, deletes Observation rows whose `date` is older than
 * `observationRetentionDays` (default 1095 = 3 years) counted back from today.
 *
 * Scheduled by `vercel.json` at 03:00 UTC daily. Authenticated via Vercel's
 * standard cron header (`authorization: Bearer <CRON_SECRET>`).
 *
 * Deletions cascade to any ObservationAccessLog rows for those observations
 * via the FK on Child → Observation (ObservationAccessLog is keyed on childId,
 * not observationId, so audit trail for surviving children is preserved).
 *
 * The sweep never touches Child rows — children live until the caregiver or
 * an admin deletes them. Only per-observation records expire.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgs = await prisma.organisation.findMany({
    select: { id: true, name: true, observationRetentionDays: true },
  })

  const results: Array<{
    orgId: string
    orgName: string
    retentionDays: number
    cutoff: string
    deleted: number
  }> = []

  for (const org of orgs) {
    const cutoff = new Date()
    cutoff.setUTCDate(cutoff.getUTCDate() - org.observationRetentionDays)

    const res = await prisma.observation.deleteMany({
      where: {
        date: { lt: cutoff },
        child: { user: { organisationId: org.id } },
      },
    })

    results.push({
      orgId: org.id,
      orgName: org.name,
      retentionDays: org.observationRetentionDays,
      cutoff: cutoff.toISOString(),
      deleted: res.count,
    })
  }

  const totalDeleted = results.reduce((s, r) => s + r.deleted, 0)
  console.log(`[retention-cron] swept ${orgs.length} orgs, deleted ${totalDeleted} observations`)

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    orgCount: orgs.length,
    totalDeleted,
    results,
  })
}
