import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isOrgAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = session.user.organisationId
  if (!orgId) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  const config = await prisma.orgSsoConfig.findUnique({
    where: { organisationId: orgId },
  })

  return NextResponse.json(config ?? null)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = session.user.organisationId
  if (!orgId) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  const body = await req.json()
  const { emailDomain, metadataUrl, ssoUrl, entityId, certificate, autoProvision, defaultRole } = body

  if (!emailDomain) {
    return NextResponse.json({ error: 'emailDomain is required' }, { status: 400 })
  }

  const configured = Boolean(ssoUrl && entityId && certificate)

  const config = await prisma.orgSsoConfig.upsert({
    where: { organisationId: orgId },
    create: {
      organisationId: orgId,
      emailDomain,
      metadataUrl: metadataUrl ?? null,
      ssoUrl: ssoUrl ?? '',
      entityId: entityId ?? '',
      certificate: certificate ?? '',
      autoProvision: autoProvision ?? false,
      defaultRole: defaultRole ?? null,
      configured,
    },
    update: {
      emailDomain,
      metadataUrl: metadataUrl ?? null,
      ssoUrl: ssoUrl ?? '',
      entityId: entityId ?? '',
      certificate: certificate ?? '',
      autoProvision: autoProvision ?? false,
      defaultRole: defaultRole ?? null,
      configured,
    },
  })

  return NextResponse.json(config)
}

export async function DELETE(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = session.user.organisationId
  if (!orgId) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  try {
    await prisma.orgSsoConfig.delete({
      where: { organisationId: orgId },
    })
  } catch {
    // Config may not exist — that's fine
  }

  return NextResponse.json({ success: true })
}
