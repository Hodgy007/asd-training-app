import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSessionById, canManageSession } from '@/lib/sessions'
import type { Role } from '@prisma/client'

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

  if (!canManageSession(classSession, user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { attendance } = body as { attendance: { attendeeId: string; attended: boolean }[] }

  if (!Array.isArray(attendance)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  await Promise.all(
    attendance.map((a) =>
      prisma.sessionAttendee.update({
        where: { id: a.attendeeId },
        data: { attended: a.attended },
      })
    )
  )

  const updated = await getSessionById(params.sessionId)
  return NextResponse.json(updated)
}
