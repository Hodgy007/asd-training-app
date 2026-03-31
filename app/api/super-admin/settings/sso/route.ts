import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

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

  const body = await req.json()
  const { displayName, entityId, ssoUrl, certificate, enforceForCharityUsers } = body

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
