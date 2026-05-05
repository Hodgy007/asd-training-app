import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

const updateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  order: z.number().int().nonnegative().optional(),
})

async function requireSection(collectionId: string, sectionId: string) {
  const section = await prisma.librarySection.findUnique({ where: { id: sectionId } })
  if (!section || section.collectionId !== collectionId) return null
  return section
}

// PATCH — rename / re-describe / reorder.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; sectionId: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_LIBRARY)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await requireSection(params.id, params.sectionId)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const updated = await prisma.librarySection.update({
    where: { id: params.sectionId },
    data: parsed.data,
  })
  return NextResponse.json(updated)
}

// DELETE — remove the section. Documents fall back to sectionId=null via
// the schema-level `onDelete: SetNull` — never deleted.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; sectionId: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_LIBRARY)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await requireSection(params.id, params.sectionId)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.librarySection.delete({ where: { id: params.sectionId } })
  return NextResponse.json({ success: true })
}
