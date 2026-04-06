import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { del } from '@vercel/blob'

interface Params {
  params: { lessonId: string; attachmentId: string }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_TRAINING)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const attachment = await prisma.lessonAttachment.findFirst({
    where: { id: params.attachmentId, lessonId: params.lessonId },
  })

  if (!attachment) {
    return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
  }

  try {
    await del(attachment.url)
  } catch {
    // Blob may already be deleted — continue with DB cleanup
  }

  await prisma.lessonAttachment.delete({ where: { id: params.attachmentId } })

  return NextResponse.json({ success: true })
}
