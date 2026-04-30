import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const eventSchema = z.object({
  action: z.enum(['view', 'download']),
})

export async function POST(req: NextRequest, { params }: { params: { documentId: string } }) {
  const session = await getServerSession(authOptions)

  // Current LibraryDocumentEvent requires a userId, so anonymous public toolkit
  // users are intentionally ignored for now instead of adding a new analytics model.
  if (!session?.user?.id) {
    return NextResponse.json({ tracked: false })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = eventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const document = await prisma.libraryDocument.findFirst({
    where: {
      id: params.documentId,
      active: true,
      collection: {
        active: true,
        publishedToToolkit: true,
      },
    },
    select: { id: true },
  })

  if (!document) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.libraryDocumentEvent.create({
    data: {
      documentId: document.id,
      userId: session.user.id,
      organisationId: session.user.organisationId ?? null,
      action: parsed.data.action,
    },
  })

  return NextResponse.json({ tracked: true })
}
