import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { del } from '@vercel/blob'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_LIBRARY)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const doc = await prisma.libraryDocument.update({
    where: { id: params.id },
    data: { active: body.active },
  })

  return NextResponse.json(doc)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_LIBRARY)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const doc = await prisma.libraryDocument.findUnique({ where: { id: params.id } })
  if (!doc) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Delete blob files
  try {
    await del(doc.fileUrl)
    if (doc.thumbnailUrl) await del(doc.thumbnailUrl)
  } catch {
    // Blob deletion is best-effort
  }

  await prisma.libraryDocument.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}
