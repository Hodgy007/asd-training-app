import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { del } from '@vercel/blob'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canManageJobs } from '@/lib/rbac'

export const runtime = 'nodejs'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { jobId: string; attachmentId: string } },
) {
  const session = await getServerSession(authOptions)
  if (!canManageJobs(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const attachment = await prisma.jobAttachment.findUnique({ where: { id: params.attachmentId } })
  if (!attachment || attachment.jobId !== params.jobId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  await del(attachment.url).catch(() => undefined)
  await prisma.jobAttachment.delete({ where: { id: params.attachmentId } })
  return NextResponse.json({ ok: true })
}
