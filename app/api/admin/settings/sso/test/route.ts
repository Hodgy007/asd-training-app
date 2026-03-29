import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isOrgAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { generateSamlLoginUrl } from '@/lib/saml'

export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = session.user.organisationId
  if (!orgId) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  const config = await prisma.orgSsoConfig.findUnique({
    where: { organisationId: orgId },
  })

  if (!config) {
    return NextResponse.json({ error: 'No SSO configuration found' }, { status: 404 })
  }

  if (!config.ssoUrl || !config.emailDomain) {
    return NextResponse.json({ error: 'SSO URL and email domain are required' }, { status: 400 })
  }

  const loginUrl = generateSamlLoginUrl(config.ssoUrl, 'test@' + config.emailDomain)

  return NextResponse.json({ loginUrl })
}
