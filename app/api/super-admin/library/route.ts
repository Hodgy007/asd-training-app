import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  thumbnailUrl: z.string().url().nullable().optional(),
  targetOrgIds: z.array(z.string()).default([]),
  targetRoles: z.array(z.string()).default([]),
  active: z.boolean().default(true),
  publishedToToolkit: z.boolean().default(false),
})

// GET — list all collections
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_LIBRARY)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const collections = await prisma.libraryCollection.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { documents: true } },
    },
  })

  return NextResponse.json(collections)
}

// POST — create a new collection
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_LIBRARY)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const collection = await prisma.libraryCollection.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      thumbnailUrl: parsed.data.thumbnailUrl ?? null,
      targetOrgIds: parsed.data.targetOrgIds,
      targetRoles: parsed.data.targetRoles,
      active: parsed.data.active,
      publishedToToolkit: parsed.data.publishedToToolkit,
      createdById: session.user.id,
    },
  })

  return NextResponse.json(collection, { status: 201 })
}
