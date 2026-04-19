import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSuperAdmin } from '@/lib/rbac'
import { ObservationAccessAction, Prisma } from '@prisma/client'

const ALLOWED_ACTIONS: ObservationAccessAction[] = [
  'OBSERVATION_READ',
  'OBSERVATION_CREATE',
  'OBSERVATION_UPDATE',
  'OBSERVATION_DELETE',
  'AI_INSIGHT_GENERATE',
  'AI_INSIGHT_READ',
  'EXPORT',
]

const MAX_PAGE_SIZE = 100
const DEFAULT_PAGE_SIZE = 50

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const actorEmail = searchParams.get('actorEmail')?.trim() || null
  const childId = searchParams.get('childId')?.trim() || null
  const actionParam = searchParams.get('action')?.trim() || null
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const pageSizeRaw = Number(searchParams.get('pageSize') ?? DEFAULT_PAGE_SIZE)
  const pageRaw = Number(searchParams.get('page') ?? 1)

  const pageSize = Math.min(
    Math.max(Number.isFinite(pageSizeRaw) ? pageSizeRaw : DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE,
  )
  const page = Math.max(Number.isFinite(pageRaw) ? pageRaw : 1, 1)

  const where: Prisma.ObservationAccessLogWhereInput = {}

  if (actorEmail) {
    where.actorId = {
      in: (
        await prisma.user.findMany({
          where: { email: { contains: actorEmail, mode: 'insensitive' } },
          select: { id: true },
          take: 100,
        })
      ).map((u) => u.id),
    }
  }
  if (childId) where.childId = childId
  if (actionParam && (ALLOWED_ACTIONS as string[]).includes(actionParam)) {
    where.action = actionParam as ObservationAccessAction
  }
  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = new Date(startDate)
    if (endDate) where.createdAt.lte = new Date(endDate)
  }

  const [rows, total] = await Promise.all([
    prisma.observationAccessLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        child: {
          select: {
            id: true,
            name: true,
            user: {
              select: {
                name: true,
                email: true,
                organisation: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.observationAccessLog.count({ where }),
  ])

  const actorIds = Array.from(new Set(rows.map((r) => r.actorId)))
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, name: true, email: true },
  })
  const actorById = new Map(actors.map((a) => [a.id, a]))

  const shaped = rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    action: r.action,
    ipAddress: r.ipAddress,
    metadata: r.metadata,
    actor: actorById.get(r.actorId) ?? { id: r.actorId, name: null, email: null },
    child: {
      id: r.child.id,
      name: r.child.name,
      caregiverName: r.child.user.name,
      caregiverEmail: r.child.user.email,
      orgId: r.child.user.organisation?.id ?? null,
      orgName: r.child.user.organisation?.name ?? null,
    },
  }))

  return NextResponse.json({
    rows: shaped,
    total,
    page,
    pageSize,
    pageCount: Math.max(Math.ceil(total / pageSize), 1),
  })
}
