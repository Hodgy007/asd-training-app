import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { getSessionById, resolveCharitySessionAttendees } from '@/lib/sessions'

export async function PUT(
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
  const userIds = await resolveCharitySessionAttendees(body)

  const result = await prisma.$transaction(async (tx) => {
    await tx.sessionAttendee.deleteMany({ where: { sessionId: params.sessionId } })

    if (userIds.length > 0) {
      await tx.sessionAttendee.createMany({
        data: userIds.map((userId) => ({
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

  return NextResponse.json(result)
}
