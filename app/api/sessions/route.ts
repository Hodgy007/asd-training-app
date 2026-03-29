import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canCreateSessions } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { resolveAttendees } from '@/lib/sessions'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !canCreateSessions(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = session.user.organisationId
  if (!orgId) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  const body = await req.json()
  const { title, description, scheduledAt, duration, platform, meetingUrl, hostId, attendees } = body

  if (!title || !scheduledAt || !duration) {
    return NextResponse.json(
      { error: 'Missing required fields: title, scheduledAt, duration' },
      { status: 400 }
    )
  }

  // Default host to the creator if not specified
  const finalHostId = hostId || session.user.id

  const attendeeSelection = attendees ?? {}
  const userIds = await resolveAttendees(orgId, attendeeSelection)

  const classSession = await prisma.$transaction(async (tx) => {
    const created = await tx.classSession.create({
      data: {
        title,
        description: description ?? null,
        scheduledAt: new Date(scheduledAt),
        duration: Number(duration),
        platform: platform ?? 'CUSTOM',
        meetingUrl: meetingUrl ?? null,
        hostId: finalHostId,
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
