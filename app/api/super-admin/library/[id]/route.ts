import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  targetOrgIds: z.array(z.string()).optional(),
  targetRoles: z.array(z.string()).optional(),
  active: z.boolean().optional(),
})

// GET — single collection with its documents
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_LIBRARY)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const collection = await prisma.libraryCollection.findUnique({
    where: { id: params.id },
    include: {
      createdBy: { select: { name: true } },
      documents: {
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: { select: { name: true } },
          _count: { select: { events: true } },
        },
      },
    },
  })

  if (!collection) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(collection)
}

// PATCH — update collection
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_LIBRARY)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const collection = await prisma.libraryCollection.update({
    where: { id: params.id },
    data: parsed.data,
  })

  return NextResponse.json(collection)
}

// DELETE — delete collection and all its documents
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_LIBRARY)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const collection = await prisma.libraryCollection.findUnique({
    where: { id: params.id },
    include: { documents: { select: { fileUrl: true } } },
  })
  if (!collection) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Best-effort blob cleanup
  try {
    const { del } = await import('@vercel/blob')
    if (collection.thumbnailUrl) await del(collection.thumbnailUrl)
    for (const doc of collection.documents) {
      await del(doc.fileUrl)
    }
  } catch {
    // blob deletion is best-effort
  }

  // Cascade deletes documents + events
  await prisma.libraryCollection.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}
