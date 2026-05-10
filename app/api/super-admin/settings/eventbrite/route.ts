import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

const VALID_POLICIES = new Set(['STRICT', 'AUTO_INVITE', 'CLAIM_LINK'])

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let config = await prisma.charityEventbriteConfig.findFirst()
  if (!config) {
    config = await prisma.charityEventbriteConfig.create({ data: {} })
  }

  // Never return the raw token — only whether one is set.
  return NextResponse.json({
    id: config.id,
    hasToken: Boolean(config.privateToken),
    webhookId: config.webhookId,
    emailMatchPolicy: config.emailMatchPolicy,
    configured: config.configured,
    lastSyncAt: config.lastSyncAt,
  })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { privateToken, emailMatchPolicy } = body as {
    privateToken?: string
    emailMatchPolicy?: string
  }

  if (emailMatchPolicy && !VALID_POLICIES.has(emailMatchPolicy)) {
    return NextResponse.json(
      { error: 'emailMatchPolicy must be STRICT, AUTO_INVITE, or CLAIM_LINK' },
      { status: 400 },
    )
  }

  const existing = await prisma.charityEventbriteConfig.findFirst()
  // Treat empty string as "leave token unchanged" — UI never echoes the token
  // back, so a blank field on save would otherwise wipe it.
  const tokenUpdate =
    typeof privateToken === 'string' && privateToken.trim()
      ? privateToken.trim()
      : undefined

  const data = {
    ...(tokenUpdate !== undefined ? { privateToken: tokenUpdate } : {}),
    ...(emailMatchPolicy ? { emailMatchPolicy } : {}),
    configured: Boolean(tokenUpdate ?? existing?.privateToken),
  }

  const config = existing
    ? await prisma.charityEventbriteConfig.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.charityEventbriteConfig.create({ data })

  return NextResponse.json({
    id: config.id,
    hasToken: Boolean(config.privateToken),
    webhookId: config.webhookId,
    emailMatchPolicy: config.emailMatchPolicy,
    configured: config.configured,
    lastSyncAt: config.lastSyncAt,
  })
}
