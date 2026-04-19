import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logObservationAccess, ipFromHeaders } from '@/lib/observation-audit'

/**
 * Subject Access Request (SAR) export for a single child record.
 *
 * Returns a JSON document containing the child's profile, every observation,
 * every AI insight report, and every audit-log row pertaining to that child.
 * Satisfies UK GDPR Art. 15 (right of access) without requiring a manual
 * DSAR process.
 *
 * Only the owning caregiver may call this. Every export is logged as an
 * EXPORT action against the child, which itself appears in any subsequent
 * export — useful for proving chain-of-custody if a parent later queries
 * "who has had a copy of my child's record?".
 */
export async function GET(req: NextRequest, { params }: { params: { childId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'CAREGIVER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const child = await prisma.child.findFirst({
    where: { id: params.childId, userId: session.user.id },
    include: {
      user: { select: { id: true, name: true, email: true, organisation: { select: { id: true, name: true } } } },
    },
  })
  if (!child) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [observations, insights, accessLogs] = await Promise.all([
    prisma.observation.findMany({
      where: { childId: child.id },
      orderBy: { date: 'desc' },
    }),
    prisma.aiInsight.findMany({
      where: { childId: child.id },
      orderBy: { generatedAt: 'desc' },
    }),
    prisma.observationAccessLog.findMany({
      where: { childId: child.id },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    }),
  ])

  await logObservationAccess({
    childId: child.id,
    actorId: session.user.id,
    action: 'EXPORT',
    metadata: {
      observationCount: observations.length,
      insightCount: insights.length,
      format: 'json',
    },
    ipAddress: ipFromHeaders(req.headers),
  })

  const payload = {
    exportedAt: new Date().toISOString(),
    exportedBy: {
      id: session.user.id,
      name: child.user.name,
      email: child.user.email,
    },
    organisation: child.user.organisation,
    child: {
      id: child.id,
      name: child.name,
      dateOfBirth: child.dateOfBirth,
      createdAt: child.createdAt,
      consentObtainedAt: child.consentObtainedAt,
      consentObtainedBy: child.consentObtainedBy,
      consentDocumentedNote: child.consentDocumentedNote,
    },
    observations,
    aiInsights: insights,
    accessLog: accessLogs,
  }

  const filename = `child-record-${child.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
