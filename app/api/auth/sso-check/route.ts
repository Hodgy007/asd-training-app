import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const domain = req.nextUrl.searchParams.get('domain')
    if (!domain) {
      return NextResponse.json({ sso: false })
    }

    const config = await prisma.orgSsoConfig.findFirst({
      where: { emailDomain: domain, configured: true },
      include: { organisation: { select: { name: true, slug: true } } },
    })

    if (!config) {
      return NextResponse.json({ sso: false })
    }

    return NextResponse.json({
      sso: true,
      orgName: config.organisation.name,
      orgSlug: config.organisation.slug,
    })
  } catch (error) {
    console.error('SSO check error:', error)
    return NextResponse.json({ sso: false })
  }
}
