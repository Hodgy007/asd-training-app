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

    // Check if any charity-level user exists with this email domain
    // and if charity SSO is configured
    const charityUser = await prisma.user.findFirst({
      where: {
        email: { endsWith: `@${domain}` },
        role: { in: ['SUPER_ADMIN', 'CHARITY_EMPLOYEE'] },
        active: true,
      },
      select: { id: true },
    })

    if (charityUser) {
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
    }

    return NextResponse.json({ sso: false })
  } catch (error) {
    console.error('SSO check error:', error)
    return NextResponse.json({ sso: false })
  }
}
