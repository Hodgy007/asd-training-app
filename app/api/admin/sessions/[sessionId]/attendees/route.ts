import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSessionById, resolveAttendees, canManageSession } from '@/lib/sessions'

export async function PUT(
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
  const { allRoles, roles, userIds } = body

  const orgId = classSession.organisationId
  const resolvedIds = await resolveAttendees(orgId, { allRoles, roles, userIds })

  // Replace all attendees in a transaction
  const attendees = await prisma.$transaction(async (tx) => {
    await tx.sessionAttendee.deleteMany({ where: { sessionId: params.sessionId } })

    if (resolvedIds.length > 0) {
      await tx.sessionAttendee.createMany({
        data: resolvedIds.map((userId: string) => ({
          sessionId: params.sessionId,
          userId,
        })),
        skipDuplicates: true,
      })
    }

    return tx.sessionAttendee.findMany({
      where: { sessionId: params.sessionId },
      include: { user: true },
    })
  })

  return NextResponse.json(attendees)
}
