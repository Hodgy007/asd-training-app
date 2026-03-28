import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  active: z.boolean().default(true),
  expiresAt: z.string().datetime().nullable().optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const announcements = await prisma.announcement.findMany({
    where: { organisationId: null },
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { name: true } } },
  })

  return NextResponse.json(announcements)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const announcement = await prisma.announcement.create({
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      active: parsed.data.active,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      organisationId: null,
      createdById: session.user.id,
    },
  })

  return NextResponse.json(announcement, { status: 201 })
}
