import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isOrgAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).optional(),
  active: z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const announcement = await prisma.announcement.findUnique({ where: { id: params.id } })
  if (!announcement || announcement.organisationId !== session.user.organisationId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(announcement)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const announcement = await prisma.announcement.findUnique({ where: { id: params.id } })
  if (!announcement || announcement.organisationId !== session.user.organisationId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const data: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.expiresAt !== undefined) {
    data.expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null
  }

  const updated = await prisma.announcement.update({ where: { id: params.id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const announcement = await prisma.announcement.findUnique({ where: { id: params.id } })
  if (!announcement || announcement.organisationId !== session.user.organisationId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.announcement.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
