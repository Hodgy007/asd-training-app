import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

/**
 * GET — current OAuth toggles + whether the env credentials each provider
 * needs are present. The UI uses `*Available` to show a "credentials missing"
 * warning that explains why a toggle is locked off.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let config = await prisma.oAuthSsoConfig.findFirst()
  if (!config) {
    config = await prisma.oAuthSsoConfig.create({ data: {} })
  }

  return NextResponse.json({
    googleEnabled: config.googleEnabled,
    microsoftEnabled: config.microsoftEnabled,
    googleAvailable: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    microsoftAvailable: !!(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET),
  })
}

/**
 * PUT — admin flips the toggles. We refuse to enable a provider whose env
 * credentials are missing; otherwise the button would render but every login
 * attempt would fail with a Configuration error.
 */
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const googleEnabled = Boolean(body.googleEnabled)
  const microsoftEnabled = Boolean(body.microsoftEnabled)

  const hasGoogleCreds = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  const hasAzureCreds = !!(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET)

  if (googleEnabled && !hasGoogleCreds) {
    return NextResponse.json(
      { error: 'Google credentials are not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on Vercel first.' },
      { status: 400 }
    )
  }
  if (microsoftEnabled && !hasAzureCreds) {
    return NextResponse.json(
      { error: 'Microsoft credentials are not configured. Set AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, and AZURE_AD_TENANT_ID on Vercel first.' },
      { status: 400 }
    )
  }

  const existing = await prisma.oAuthSsoConfig.findFirst()
  const config = existing
    ? await prisma.oAuthSsoConfig.update({
        where: { id: existing.id },
        data: { googleEnabled, microsoftEnabled },
      })
    : await prisma.oAuthSsoConfig.create({
        data: { googleEnabled, microsoftEnabled },
      })

  return NextResponse.json({
    googleEnabled: config.googleEnabled,
    microsoftEnabled: config.microsoftEnabled,
    googleAvailable: hasGoogleCreds,
    microsoftAvailable: hasAzureCreds,
  })
}
