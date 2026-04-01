import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { generateApiKey } from '@/lib/integration-auth'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  expiresAt: z.string().datetime().optional().nullable(),
})

// List API keys
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const keys = await prisma.integrationApiKey.findMany({
    include: { createdBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(
    keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      active: k.active,
      createdAt: k.createdAt,
      lastUsedAt: k.lastUsedAt,
      expiresAt: k.expiresAt,
      createdBy: k.createdBy?.name ?? 'Unknown',
    }))
  )
}

// Create new API key
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { rawKey, keyHash, keyPrefix } = generateApiKey()

  const apiKey = await prisma.integrationApiKey.create({
    data: {
      name: parsed.data.name,
      keyHash,
      keyPrefix,
      createdById: session.user.id,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    },
  })

  // Return the raw key only once — it cannot be retrieved again
  return NextResponse.json({
    id: apiKey.id,
    name: apiKey.name,
    rawKey,
    keyPrefix,
    expiresAt: apiKey.expiresAt,
    createdAt: apiKey.createdAt,
  })
}

// Revoke (deactivate) or delete an API key
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await prisma.integrationApiKey.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
