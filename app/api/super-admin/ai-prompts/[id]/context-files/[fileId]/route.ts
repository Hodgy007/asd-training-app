import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { del } from '@vercel/blob'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; fileId: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_AI_PROMPTS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const row = await prisma.aiPromptContextFile.findFirst({
    where: { id: params.fileId, promptId: params.id },
  })
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    await del(row.blobUrl)
  } catch (err) {
    console.warn('Blob delete failed (continuing):', err)
  }

  await prisma.aiPromptContextFile.delete({ where: { id: row.id } })
  return NextResponse.json({ ok: true })
}
