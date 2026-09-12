import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const httpsUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => {
    try {
      return new URL(v).protocol === 'https:'
    } catch {
      return false
    }
  }, 'Must be an https URL')

const putSchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional(),
  entityId: z.string().trim().max(2048).optional().nullable().or(z.literal('')),
  ssoUrl: httpsUrl.optional().nullable().or(z.literal('')),
  certificate: z.string().max(64_000).optional().nullable().or(z.literal('')),
  enforceForCharityUsers: z.boolean().optional(),
})

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let config = await prisma.charitySsoConfig.findFirst()
  if (!config) {
    config = await prisma.charitySsoConfig.create({ data: {} })
  }

  return NextResponse.json(config)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = putSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    )
  }
  const { displayName, entityId, ssoUrl, certificate, enforceForCharityUsers } = parsed.data

  const configured = Boolean(ssoUrl && entityId && certificate)

  let existing = await prisma.charitySsoConfig.findFirst()
  let config
  if (existing) {
    config = await prisma.charitySsoConfig.update({
      where: { id: existing.id },
      data: {
        displayName: displayName ?? existing.displayName,
        entityId: entityId ?? null,
        ssoUrl: ssoUrl ?? null,
        certificate: certificate ?? null,
        enforceForCharityUsers: enforceForCharityUsers ?? false,
        configured,
      },
    })
  } else {
    config = await prisma.charitySsoConfig.create({
      data: {
        displayName: displayName ?? 'Charity',
        entityId: entityId ?? null,
        ssoUrl: ssoUrl ?? null,
        certificate: certificate ?? null,
        enforceForCharityUsers: enforceForCharityUsers ?? false,
        configured,
      },
    })
  }

  return NextResponse.json(config)
}
