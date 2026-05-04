import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { del } from '@vercel/blob'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  fileUrl: z.string().url(),
  fileName: z.string().min(1),
  fileSize: z.number().int().positive(),
  fileType: z.string().min(1),
  thumbnailUrl: z.string().url().nullable().optional(),
  videoUrl: z.string().url().nullable().optional().or(z.literal('')),
})

// POST — add a document to a collection
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_LIBRARY)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify collection exists
  const collection = await prisma.libraryCollection.findUnique({ where: { id: params.id } })
  if (!collection) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const document = await prisma.libraryDocument.create({
    data: {
      collectionId: params.id,
      title: parsed.data.title,
      description: parsed.data.description,
      fileUrl: parsed.data.fileUrl,
      fileName: parsed.data.fileName,
      fileSize: parsed.data.fileSize,
      fileType: parsed.data.fileType,
      thumbnailUrl: parsed.data.thumbnailUrl ?? null,
      videoUrl: parsed.data.videoUrl ? parsed.data.videoUrl : null,
      uploadedById: session.user.id,
    },
  })

  // Don't expose the raw Blob URL — clients use the auth-gated proxy.
  return NextResponse.json({
    ...document,
    fileUrl: `/api/library/documents/${document.id}/file`,
  }, { status: 201 })
}

// DELETE — remove every document in a collection (keeps the collection itself).
// Best-effort cleanup of Blob files for each doc + thumbnail.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_LIBRARY)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const collection = await prisma.libraryCollection.findUnique({ where: { id: params.id } })
  if (!collection) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  }

  const docs = await prisma.libraryDocument.findMany({
    where: { collectionId: params.id },
    select: { id: true, fileUrl: true, thumbnailUrl: true },
  })

  await Promise.all(
    docs.flatMap((d) => [
      del(d.fileUrl).catch(() => {}),
      d.thumbnailUrl ? del(d.thumbnailUrl).catch(() => {}) : Promise.resolve(),
    ]),
  )

  const result = await prisma.libraryDocument.deleteMany({ where: { collectionId: params.id } })
  return NextResponse.json({ deleted: result.count })
}
