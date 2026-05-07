import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { del } from '@vercel/blob'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

const BRAND_ASSET_TYPES = ['LOGO', 'BRAND_GUIDELINES', 'IMAGERY', 'COLOUR_PALETTE', 'MESSAGING', 'OTHER'] as const

const updateSchema = z.object({
  type: z.enum(BRAND_ASSET_TYPES).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  active: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { assetId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_LIBRARY)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await prisma.brandAsset.findUnique({ where: { id: params.assetId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const updated = await prisma.brandAsset.update({
    where: { id: params.assetId },
    data: parsed.data,
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { assetId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_LIBRARY)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await prisma.brandAsset.findUnique({ where: { id: params.assetId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Best-effort blob cleanup. Don't fail the request if the Blob is already
  // gone — the row deletion is the source of truth.
  try {
    await del(existing.fileUrl)
  } catch {
    /* ignore */
  }

  await prisma.brandAsset.delete({ where: { id: params.assetId } })
  return NextResponse.json({ success: true })
}
