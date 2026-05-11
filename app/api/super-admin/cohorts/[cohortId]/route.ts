import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  allowedProgramIds: z.array(z.string()).optional(),
  allowedRoles: z.array(z.string()).optional(),
  active: z.boolean().optional(),
})

async function getCohort(cohortId: string) {
  return prisma.organisation.findFirst({
    where: { id: cohortId, orgType: 'COHORT' },
  })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { cohortId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_COHORTS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const cohort = await prisma.organisation.findFirst({
    where: { id: params.cohortId, orgType: 'COHORT' },
    include: {
      _count: { select: { users: true, cohortMemberships: true } },
      eventbriteEvent: true,
    },
  })

  if (!cohort) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Members = union of legacy manual-flow users (organisationId = cohort.id)
  // + Eventbrite-synced users joined via CohortMembership. We dedupe by userId
  // and tag each row with a `source` so the UI can render a badge.
  const [legacyUsers, memberships] = await Promise.all([
    prisma.user.findMany({
      where: { organisationId: params.cohortId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        mustChangePassword: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.cohortMembership.findMany({
      where: { cohortId: params.cohortId, status: 'ACTIVE' },
      select: {
        source: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            active: true,
            mustChangePassword: true,
            createdAt: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    }),
  ])

  const userMap = new Map<string, {
    id: string
    name: string | null
    email: string
    role: string
    active: boolean
    mustChangePassword: boolean
    createdAt: Date
    source: 'MANUAL' | 'EVENTBRITE'
    joinedAt: Date | null
  }>()

  for (const u of legacyUsers) {
    userMap.set(u.id, { ...u, source: 'MANUAL', joinedAt: null })
  }
  for (const m of memberships) {
    const existing = userMap.get(m.user.id)
    const source = (m.source === 'EVENTBRITE' ? 'EVENTBRITE' : 'MANUAL') as 'MANUAL' | 'EVENTBRITE'
    if (existing) {
      // If the legacy row exists, prefer the CohortMembership source so
      // Eventbrite-sourced primary-org users still get tagged correctly.
      existing.source = source
      existing.joinedAt = m.joinedAt
    } else {
      userMap.set(m.user.id, { ...m.user, source, joinedAt: m.joinedAt })
    }
  }

  const users = Array.from(userMap.values()).sort((a, b) => {
    const aTime = (a.joinedAt ?? a.createdAt).getTime()
    const bTime = (b.joinedAt ?? b.createdAt).getTime()
    return bTime - aTime
  })

  return NextResponse.json({ ...cohort, users })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { cohortId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_COHORTS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const cohort = await getCohort(params.cohortId)
  if (!cohort) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const updated = await prisma.organisation.update({
    where: { id: params.cohortId },
    data: parsed.data,
    include: { _count: { select: { users: true } } },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { cohortId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_COHORTS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const cohort = await getCohort(params.cohortId)
  if (!cohort) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.organisation.update({
    where: { id: params.cohortId },
    data: { active: false },
  })

  return NextResponse.json({ success: true })
}
