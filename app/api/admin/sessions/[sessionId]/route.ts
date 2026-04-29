import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isOrgAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { canManageSessionWithChildren, getSessionById, isActiveOrgUser } from '@/lib/sessions'
import { canManageChildOrg } from '@/lib/org-hierarchy'
import type { Role, SessionStatus } from '@prisma/client'

const PLATFORMS = ['ZOOM', 'TEAMS', 'CUSTOM', 'IN_PERSON'] as const

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
    role: session.user.role as Role,
    organisationId: session.user.organisationId,
  }

  if (!(await canManageSessionWithChildren(classSession, user, (orgId) => canManageChildOrg(session, orgId)))) {
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
    role: session.user.role as Role,
    organisationId: session.user.organisationId,
  }

  if (!(await canManageSessionWithChildren(classSession, user, (orgId) => canManageChildOrg(session, orgId)))) {
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

  if (platform !== undefined && !PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
  }

  if (hostId !== undefined) {
    if (!classSession.organisationId || !(await isActiveOrgUser(classSession.organisationId, hostId))) {
      return NextResponse.json({ error: 'Host must be an active user in the session organisation' }, { status: 400 })
    }
  }

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

  const user = {
    id: session.user.id,
    role: session.user.role as Role,
    organisationId: session.user.organisationId,
  }

  if (!(await canManageSessionWithChildren(classSession, user, (orgId) => canManageChildOrg(session, orgId)))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Cascade delete — attendees deleted first due to FK constraint
  await prisma.$transaction([
    prisma.sessionAttendee.deleteMany({ where: { sessionId: params.sessionId } }),
    prisma.classSession.delete({ where: { id: params.sessionId } }),
  ])

  return NextResponse.json({ success: true })
}
