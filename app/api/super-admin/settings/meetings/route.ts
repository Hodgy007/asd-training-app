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

  let config = await prisma.charityMeetingConfig.findFirst()
  if (!config) {
    config = await prisma.charityMeetingConfig.create({ data: {} })
  }

  return NextResponse.json(config)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { platform, apiKey, apiSecret, tenantId } = body

  if (!platform) {
    return NextResponse.json({ error: 'platform is required' }, { status: 400 })
  }

  const configured = Boolean(apiKey && apiSecret)

  const existing = await prisma.charityMeetingConfig.findFirst()
  let config
  if (existing) {
    config = await prisma.charityMeetingConfig.update({
      where: { id: existing.id },
      data: {
        platform,
        apiKey: apiKey ?? null,
        apiSecret: apiSecret ?? null,
        tenantId: tenantId ?? null,
        configured,
      },
    })
  } else {
    config = await prisma.charityMeetingConfig.create({
      data: {
        platform,
        apiKey: apiKey ?? null,
        apiSecret: apiSecret ?? null,
        tenantId: tenantId ?? null,
        configured,
      },
    })
  }

  return NextResponse.json(config)
}
