import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

const BRAND_ASSET_TYPES = ['LOGO', 'BRAND_GUIDELINES', 'IMAGERY', 'COLOUR_PALETTE', 'MESSAGING', 'OTHER'] as const

const createSchema = z.object({
  type: z.enum(BRAND_ASSET_TYPES),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  fileUrl: z.string().url(),
  fileName: z.string().min(1),
  fileSize: z.number().int().positive(),
  fileType: z.string().min(1),
  active: z.boolean().optional(),
})

// GET — list all brand assets. Filter by `type` for the picker, `active`
// to show/hide inactive entries. Charity-level admins (MANAGE_LIBRARY)
// only — same gate as the Library admin routes.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_LIBRARY)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const typeParam = req.nextUrl.searchParams.get('type')
  const activeParam = req.nextUrl.searchParams.get('active')

  const where: { type?: typeof BRAND_ASSET_TYPES[number]; active?: boolean } = {}
  if (typeParam && (BRAND_ASSET_TYPES as readonly string[]).includes(typeParam)) {
    where.type = typeParam as typeof BRAND_ASSET_TYPES[number]
  }
  if (activeParam === 'true') where.active = true
  if (activeParam === 'false') where.active = false

  const assets = await prisma.brandAsset.findMany({
    where,
    orderBy: [{ active: 'desc' }, { type: 'asc' }, { createdAt: 'desc' }],
    include: { uploadedBy: { select: { name: true } } },
  })

  return NextResponse.json({ assets })
}

// POST — create a brand asset row after the file has been uploaded to Blob
// via the existing /api/super-admin/library/upload/upload-url token (which
// is a generic blob upload-url issuer; reusing it avoids a duplicate route).
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_LIBRARY)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const asset = await prisma.brandAsset.create({
    data: {
      type: parsed.data.type,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      fileUrl: parsed.data.fileUrl,
      fileName: parsed.data.fileName,
      fileSize: parsed.data.fileSize,
      fileType: parsed.data.fileType,
      active: parsed.data.active ?? true,
      uploadedById: session.user.id,
    },
  })
  return NextResponse.json(asset, { status: 201 })
}
