import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isOrgAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { getSessionById, canManageSession } from '@/lib/sessions'
import type { SessionStatus } from '@prisma/client'

export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const classSession = await getSessionById(params.sessionId)
  if (!classSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const user = {
    id: session.user.id,
    role: session.user.role as import('@prisma/client').Role,
    organisationId: session.user.organisationId,
  }

  if (!canManageSession(classSession, user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(classSession)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const classSession = await getSessionById(params.sessionId)
  if (!classSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const user = {
    id: session.user.id,
    role: session.user.role as import('@prisma/client').Role,
    organisationId: session.user.organisationId,
  }

  if (!canManageSession(classSession, user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const {
    title,
    description,
    scheduledAt,
    duration,
    meetingUrl,
    recordingUrl,
    platform,
    status,
    hostId,
  } = body

  const STATUS_VALUES: SessionStatus[] = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

  const updated = await prisma.classSession.update({
    where: { id: params.sessionId },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(scheduledAt !== undefined && { scheduledAt: new Date(scheduledAt) }),
      ...(duration !== undefined && { duration: Number(duration) }),
      ...(meetingUrl !== undefined && { meetingUrl }),
      ...(recordingUrl !== undefined && { recordingUrl }),
      ...(platform !== undefined && { platform }),
      ...(status !== undefined && STATUS_VALUES.includes(status) && { status }),
      ...(hostId !== undefined && { hostId }),
    },
    include: {
      host: true,
      createdBy: true,
      attendees: { include: { user: true } },
      _count: { select: { attendees: true } },
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const classSession = await getSessionById(params.sessionId)
  if (!classSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // Ensure the session belongs to the admin's org
  if (classSession.organisationId !== session.user.organisationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Cascade delete — attendees deleted first due to FK constraint
  await prisma.$transaction([
    prisma.sessionAttendee.deleteMany({ where: { sessionId: params.sessionId } }),
    prisma.classSession.delete({ where: { id: params.sessionId } }),
  ])

  return NextResponse.json({ success: true })
}
