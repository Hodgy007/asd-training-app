import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { getCharitySessions, isActiveUser, resolveCharitySessionAttendees } from '@/lib/sessions'
import type { SessionStatus } from '@prisma/client'

const PLATFORMS = ['ZOOM', 'TEAMS', 'CUSTOM', 'IN_PERSON'] as const

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_SESSIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const statusParam = searchParams.get('status')

  const STATUS_VALUES: SessionStatus[] = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
  const status =
    statusParam && STATUS_VALUES.includes(statusParam as SessionStatus)
      ? (statusParam as SessionStatus)
      : undefined

  const sessions = await getCharitySessions(status)
  return NextResponse.json(sessions)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_SESSIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { title, description, scheduledAt, duration, platform, meetingUrl, hostId, attendees } = body

  if (!title || !scheduledAt || !duration) {
    return NextResponse.json(
      { error: 'Missing required fields: title, scheduledAt, duration' },
      { status: 400 }
    )
  }

  const effectiveHostId = hostId || session.user.id
  if (!(await isActiveUser(effectiveHostId))) {
    return NextResponse.json({ error: 'Host must be an active user' }, { status: 400 })
  }

  if (platform && !PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
  }

  const attendeeSelection = attendees ?? {}
  const userIds = await resolveCharitySessionAttendees(attendeeSelection)

  const classSession = await prisma.$transaction(async (tx) => {
    const created = await tx.classSession.create({
      data: {
        title,
        description: description ?? null,
        scheduledAt: new Date(scheduledAt),
        duration: Number(duration),
        platform: platform ?? 'CUSTOM',
        meetingUrl: meetingUrl ?? null,
        hostId: effectiveHostId,
        createdById: session.user.id,
        organisationId: null,
        isCharitySession: true,
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
