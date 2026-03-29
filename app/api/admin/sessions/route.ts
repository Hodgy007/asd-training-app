import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isOrgAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { getOrgSessions, resolveAttendees } from '@/lib/sessions'
import type { SessionStatus } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = session.user.organisationId
  if (!orgId) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const statusParam = searchParams.get('status')

  const STATUS_VALUES: SessionStatus[] = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
  const status =
    statusParam && STATUS_VALUES.includes(statusParam as SessionStatus)
      ? (statusParam as SessionStatus)
      : undefined

  const sessions = await getOrgSessions(orgId, status)
  return NextResponse.json(sessions)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = session.user.organisationId
  if (!orgId) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  const body = await req.json()
  const { title, description, scheduledAt, duration, platform, meetingUrl, hostId, attendees } =
    body

  // Validate required fields
  if (!title || !scheduledAt || !duration || !hostId) {
    return NextResponse.json(
      { error: 'Missing required fields: title, scheduledAt, duration, hostId' },
      { status: 400 }
    )
  }

  // Resolve attendee user IDs
  const attendeeSelection = attendees ?? {}
  const userIds = await resolveAttendees(orgId, attendeeSelection)

  // Create session + attendees in a transaction
  const classSession = await prisma.$transaction(async (tx) => {
    const created = await tx.classSession.create({
      data: {
        title,
        description: description ?? null,
        scheduledAt: new Date(scheduledAt),
        duration: Number(duration),
        platform: platform ?? 'CUSTOM',
        meetingUrl: meetingUrl ?? null,
        hostId,
        createdById: session.user.id,
        organisationId: orgId,
      },
    })

    if (userIds.length > 0) {
      await tx.sessionAttendee.createMany({
        data: userIds.map((userId: string) => ({
          sessionId: created.id,
          userId,
        })),
        skipDuplicates: true,
      })
    }

    return tx.classSession.findUnique({
      where: { id: created.id },
      include: {
        host: true,
        createdBy: true,
        attendees: { include: { user: true } },
        _count: { select: { attendees: true } },
      },
    })
  })

  return NextResponse.json(classSession, { status: 201 })
}
