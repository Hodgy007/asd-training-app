import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const trackSchema = z.object({
  documentId: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = trackSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  await prisma.libraryDocumentEvent.create({
    data: {
      documentId: parsed.data.documentId,
      userId: session.user.id,
      organisationId: session.user.organisationId ?? null,
      action: 'download',
    },
  })

  return NextResponse.json({ success: true })
}
