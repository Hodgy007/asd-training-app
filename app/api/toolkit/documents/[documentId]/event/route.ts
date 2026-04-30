import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recordToolkitDocumentEvent } from '@/lib/toolkit'

const eventSchema = z.object({
  action: z.enum(['view', 'download']),
})

export async function POST(req: NextRequest, { params }: { params: { documentId: string } }) {
  const body = await req.json().catch(() => ({}))
  const parsed = eventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const session = await getServerSession(authOptions)
  const result = await recordToolkitDocumentEvent(prisma, {
    documentId: params.documentId,
    action: parsed.data.action,
    user: session?.user?.id
      ? {
          id: session.user.id,
          organisationId: session.user.organisationId ?? null,
        }
      : null,
  })

  if (!result.recorded) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ tracked: true })
}
