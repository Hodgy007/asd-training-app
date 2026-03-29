import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isLeafRole } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !isLeafRole(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()
  const orgId = session.user.organisationId

  const announcements = await prisma.announcement.findMany({
    where: {
      active: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
      AND: [
        {
          OR: [
            { organisationId: null },
            ...(orgId ? [{ organisationId: orgId }] : []),
          ],
        },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: {
      id: true,
      title: true,
      body: true,
      organisationId: true,
      createdAt: true,
    },
  })

  return NextResponse.json(announcements)
}
