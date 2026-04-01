import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { del } from '@vercel/blob'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  active: z.boolean().optional(),
})

// PATCH — update a document's title, description, thumbnail, or active status
export async function PATCH(req: NextRequest, { params }: { params: { id: string; docId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_LIBRARY)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const doc = await prisma.libraryDocument.findUnique({ where: { id: params.docId } })
  if (!doc || doc.collectionId !== params.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  // If replacing thumbnail, delete old one from blob
  if (parsed.data.thumbnailUrl !== undefined && doc.thumbnailUrl && parsed.data.thumbnailUrl !== doc.thumbnailUrl) {
    try { await del(doc.thumbnailUrl) } catch { /* best-effort */ }
  }

  const updated = await prisma.libraryDocument.update({
    where: { id: params.docId },
    data: parsed.data,
  })

  return NextResponse.json(updated)
}

// DELETE — remove a document from a collection
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; docId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_LIBRARY)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const doc = await prisma.libraryDocument.findUnique({ where: { id: params.docId } })
  if (!doc || doc.collectionId !== params.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    await del(doc.fileUrl)
    if (doc.thumbnailUrl) await del(doc.thumbnailUrl)
  } catch {
    // best-effort
  }

  await prisma.libraryDocument.delete({ where: { id: params.docId } })

  return NextResponse.json({ success: true })
}
