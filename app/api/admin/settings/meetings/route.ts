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

  const config = await prisma.orgMeetingConfig.findUnique({
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
  const { platform, apiKey, apiSecret, tenantId } = body

  if (!platform) {
    return NextResponse.json({ error: 'platform is required' }, { status: 400 })
  }

  const configured = Boolean(apiKey && apiSecret)

  const config = await prisma.orgMeetingConfig.upsert({
    where: { organisationId: orgId },
    create: {
      organisationId: orgId,
      platform,
      apiKey: apiKey ?? null,
      apiSecret: apiSecret ?? null,
      tenantId: tenantId ?? null,
      configured,
    },
    update: {
      platform,
      apiKey: apiKey ?? null,
      apiSecret: apiSecret ?? null,
      tenantId: tenantId ?? null,
      configured,
    },
  })

  return NextResponse.json(config)
}
