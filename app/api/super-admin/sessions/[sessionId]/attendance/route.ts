import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { getSessionById } from '@/lib/sessions'

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
  const { attendees } = body

  if (!Array.isArray(attendees)) {
    return NextResponse.json({ error: 'attendees array is required' }, { status: 400 })
  }

  const updates = await prisma.$transaction(
    attendees.map((a: { userId: string; attended: boolean; joinedAt?: string }) =>
      prisma.sessionAttendee.updateMany({
        where: { sessionId: params.sessionId, userId: a.userId },
        data: {
          attended: a.attended,
          ...(a.joinedAt ? { joinedAt: new Date(a.joinedAt) } : {}),
        },
      })
    )
  )

  return NextResponse.json({ updated: updates.length })
}
