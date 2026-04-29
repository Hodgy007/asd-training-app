import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canManageSessionWithChildren, getSessionById } from '@/lib/sessions'
import { canManageChildOrg } from '@/lib/org-hierarchy'
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

  if (!(await canManageSessionWithChildren(classSession, user, (orgId) => canManageChildOrg(session, orgId)))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const attendees: { userId: string; attended: boolean; joinedAt?: string }[] =
    body.attendees ?? []

  if (!Array.isArray(attendees)) {
    return NextResponse.json({ error: 'attendees must be an array' }, { status: 400 })
  }

  // Bulk update each attendee row
  const updates = await prisma.$transaction(
    attendees.map(({ userId, attended, joinedAt }) =>
      prisma.sessionAttendee.updateMany({
        where: { sessionId: params.sessionId, userId },
        data: {
          attended,
          ...(joinedAt !== undefined && { joinedAt: new Date(joinedAt) }),
        },
      })
    )
  )

  return NextResponse.json({ updated: updates.length })
}
