import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateSamlLoginUrl } from '@/lib/saml'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const domain = email.split('@')[1]?.toLowerCase()
    if (!domain) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const config = await prisma.orgSsoConfig.findFirst({
      where: { emailDomain: domain, configured: true },
    })

    if (!config) {
      return NextResponse.json(
        { error: 'No SSO configuration found for this email domain' },
        { status: 400 }
      )
    }

    const redirectUrl = generateSamlLoginUrl(config.ssoUrl, email)
    return NextResponse.json({ redirectUrl })
  } catch (error) {
    console.error('SAML login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
