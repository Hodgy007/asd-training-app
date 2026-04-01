import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isOrgAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
})

// PATCH — org admin can update title/description of collections assigned to their org
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = session.user.organisationId
  if (!orgId) {
    return NextResponse.json({ error: 'No organisation' }, { status: 403 })
  }

  // Verify the collection is targeted to this org (or has no org filter)
  const collection = await prisma.libraryCollection.findUnique({
    where: { id: params.id },
    select: { id: true, targetOrgIds: true, active: true },
  })

  if (!collection || !collection.active) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const hasAccess =
    collection.targetOrgIds.length === 0 || collection.targetOrgIds.includes(orgId)
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const updated = await prisma.libraryCollection.update({
    where: { id: params.id },
    data: parsed.data,
  })

  return NextResponse.json(updated)
}
