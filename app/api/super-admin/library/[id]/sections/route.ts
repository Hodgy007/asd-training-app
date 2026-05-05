import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  // Optional explicit order. When omitted we append at the end of the
  // existing list — same pattern as Module / Lesson creation in training.
  order: z.number().int().nonnegative().optional(),
})

// GET — list sections for a collection. Used by the per-doc section dropdown.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_LIBRARY)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const collection = await prisma.libraryCollection.findUnique({
    where: { id: params.id },
    select: { id: true },
  })
  if (!collection) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const sections = await prisma.librarySection.findMany({
    where: { collectionId: params.id },
    orderBy: { order: 'asc' },
    include: { _count: { select: { documents: true } } },
  })

  return NextResponse.json({ sections })
}

// POST — create a section. Auto-orders it at the end if no `order` is given.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_LIBRARY)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const collection = await prisma.libraryCollection.findUnique({
    where: { id: params.id },
    select: { id: true },
  })
  if (!collection) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  // Append-at-end default: pick max(order) + 1. Avoids forcing the client
  // to count rows just to add a new section.
  let order = parsed.data.order
  if (order === undefined) {
    const last = await prisma.librarySection.findFirst({
      where: { collectionId: params.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    })
    order = last ? last.order + 1 : 0
  }

  const section = await prisma.librarySection.create({
    data: {
      collectionId: params.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      order,
    },
  })

  return NextResponse.json(section, { status: 201 })
}
