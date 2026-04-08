import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isOrgAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { canManageChildOrg } from '@/lib/org-hierarchy'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  active: z.boolean().default(true),
  expiresAt: z.string().datetime().nullable().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const sessionOrgId = session.user.organisationId
  if (!sessionOrgId) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const targetOrgId = searchParams.get('orgId')
  let orgId = sessionOrgId
  if (targetOrgId && session.user.isParentOrg) {
    const canManage = await canManageChildOrg(session, targetOrgId)
    if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    orgId = targetOrgId
  }

  const announcements = await prisma.announcement.findMany({
    where: { organisationId: orgId },
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { name: true } } },
  })

  return NextResponse.json(announcements)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
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
      organisationId: session.user.organisationId!,
      createdById: session.user.id,
    },
  })

  return NextResponse.json(announcement, { status: 201 })
}
