import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const MAX_PAGE_SIZE = 100
const DEFAULT_PAGE_SIZE = 50

/**
 * Caregiver-facing activity log.
 *
 * Shows the signed-in user *their own* actions on *their own* children —
 * i.e. every observation-access-log row whose actorId matches the session.
 * This is the consumer-grade counterpart to the super-admin / org-admin
 * audit viewer: it answers "what has been recorded about me and my actions?"
 * in a way the caregiver can read without asking anyone.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'CAREGIVER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const pageSize = Math.min(
    Math.max(Number(searchParams.get('pageSize') ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE,
  )
  const page = Math.max(Number(searchParams.get('page') ?? 1) || 1, 1)

  const where = { actorId: session.user.id }

  const [rows, total] = await Promise.all([
    prisma.observationAccessLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { child: { select: { id: true, name: true } } },
    }),
    prisma.observationAccessLog.count({ where }),
  ])

  return NextResponse.json({
    rows: rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      action: r.action,
      ipAddress: r.ipAddress,
      metadata: r.metadata,
      child: r.child,
    })),
    total,
    page,
    pageSize,
    pageCount: Math.max(Math.ceil(total / pageSize), 1),
  })
}
