import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getNotifications } from '@/lib/notifications'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await getNotifications(session)
    return NextResponse.json(payload)
  } catch (error) {
    console.error('GET /api/notifications error:', error)
    return NextResponse.json(
      { count: 0, sections: { forYou: [], whatsNew: [] } },
      { status: 200 },
    )
  }
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { notificationsLastOpenedAt: new Date() },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('POST /api/notifications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
