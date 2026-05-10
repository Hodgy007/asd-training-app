import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Returns whether each OAuth provider is currently enabled for the login UI.
 *
 * A provider is "enabled" iff:
 *   1. Its env credentials are present (otherwise the OAuth dance can't run)
 *   2. The OAuthSsoConfig row in the DB has the corresponding toggle on
 *
 * The login page reads this on render to decide whether to show the Google
 * and Microsoft buttons. The DB toggle is set by a charity admin at
 * /super-admin/settings/sso.
 */
export async function GET() {
  try {
    const config = await prisma.oAuthSsoConfig.findFirst()
    const hasGoogleCreds = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    const hasAzureCreds = !!(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET)
    return NextResponse.json({
      google: hasGoogleCreds && Boolean(config?.googleEnabled),
      microsoft: hasAzureCreds && Boolean(config?.microsoftEnabled),
    })
  } catch {
    return NextResponse.json({ google: false, microsoft: false })
  }
}
