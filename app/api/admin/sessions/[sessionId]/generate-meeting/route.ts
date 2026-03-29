import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSessionById, canManageSession } from '@/lib/sessions'
import { generateMeetingLink } from '@/lib/meetings'

export async function POST(
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

  const result = await generateMeetingLink(
    classSession.organisationId,
    classSession.title,
    classSession.scheduledAt,
    classSession.duration
  )

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 502 })
  }

  // Persist the generated URL back to the session
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
