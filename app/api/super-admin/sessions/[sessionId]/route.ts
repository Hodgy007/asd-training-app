import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { getSessionById } from '@/lib/sessions'

export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_SESSIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const classSession = await getSessionById(params.sessionId)
  if (!classSession || !classSession.isCharitySession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  return NextResponse.json(classSession)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_SESSIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await getSessionById(params.sessionId)
  if (!existing || !existing.isCharitySession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const body = await req.json()
  const allowedFields = ['title', 'description', 'scheduledAt', 'duration', 'meetingUrl', 'recordingUrl', 'platform', 'status', 'hostId']
  const data: Record<string, unknown> = {}

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      if (field === 'scheduledAt') {
        data[field] = new Date(body[field])
      } else if (field === 'duration') {
        data[field] = Number(body[field])
      } else if (field === 'status') {
        const validStatuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
        if (!validStatuses.includes(body[field])) {
          return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }
        data[field] = body[field]
      } else {
        data[field] = body[field] ?? null
      }
    }
  }

  const updated = await prisma.classSession.update({
    where: { id: params.sessionId },
    data,
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
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_SESSIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await getSessionById(params.sessionId)
  if (!existing || !existing.isCharitySession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  await prisma.$transaction([
    prisma.sessionAttendee.deleteMany({ where: { sessionId: params.sessionId } }),
    prisma.classSession.delete({ where: { id: params.sessionId } }),
  ])

  return NextResponse.json({ success: true })
}
