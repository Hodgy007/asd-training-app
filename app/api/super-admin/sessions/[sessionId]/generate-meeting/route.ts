import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { getSessionById } from '@/lib/sessions'
import { generateCharityMeetingLink } from '@/lib/meetings'

export async function POST(
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

  const result = await generateCharityMeetingLink(
    classSession.title,
    classSession.scheduledAt,
    classSession.duration
  )

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const updated = await prisma.classSession.update({
    where: { id: params.sessionId },
    data: { meetingUrl: result.meetingUrl },
    include: {
      host: true,
      createdBy: true,
      attendees: { include: { user: true } },
      _count: { select: { attendees: true } },
    },
  })

  return NextResponse.json({ meetingUrl: result.meetingUrl, session: updated })
}
