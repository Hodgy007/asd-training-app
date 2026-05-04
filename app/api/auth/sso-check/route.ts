import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const domain = req.nextUrl.searchParams.get('domain')
    if (!domain) {
      return NextResponse.json({ sso: false })
    }

    // Check org-level SSO first (existing behaviour)
    const orgConfig = await prisma.orgSsoConfig.findFirst({
      where: { emailDomain: domain, configured: true },
      include: { organisation: { select: { name: true, slug: true } } },
    })

    if (orgConfig) {
      return NextResponse.json({
        sso: true,
        orgName: orgConfig.organisation.name,
        orgSlug: orgConfig.organisation.slug,
      })
    }

    // Charity SSO advertisement: previously this branch flipped on iff *any*
    // active charity-level user used the queried domain — letting an
    // unauthenticated visitor enumerate "is anyone on @example.com a charity
    // staff member?". We now surface the charity SSO option whenever it's
    // configured, regardless of which domain was asked about. This widens
    // the allowed SSO entry surface harmlessly (anyone hitting the SSO
    // button still has to authenticate with the IdP) and removes the
    // domain-presence side channel.
    const charitySsoConfig = await prisma.charitySsoConfig.findFirst({
      where: { configured: true },
    })

    if (charitySsoConfig) {
      return NextResponse.json({
        sso: true,
        type: 'charity',
        displayName: charitySsoConfig.displayName,
        enforced: charitySsoConfig.enforceForCharityUsers,
      })
    }

    return NextResponse.json({ sso: false })
  } catch (error) {
    console.error('SSO check error:', error)
    return NextResponse.json({ sso: false })
  }
}
