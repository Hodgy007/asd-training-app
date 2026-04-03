import { NextRequest, NextResponse } from 'next/server'
import { encode } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { validateSamlResponse } from '@/lib/saml'
import { getUserPrograms } from '@/lib/modules'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const samlResponse = formData.get('SAMLResponse') as string | null
    const relayState = formData.get('RelayState') as string | null

    if (!samlResponse || !relayState) {
      return NextResponse.redirect(
        new URL('/login?error=Invalid+SAML+response', req.url)
      )
    }

    // Determine if this is a charity SSO callback
    const isCharity = relayState.startsWith('charity:')
    const email = isCharity
      ? relayState.replace('charity:', '').toLowerCase().trim()
      : relayState.toLowerCase().trim()

    const domain = email.split('@')[1]
    if (!domain) {
      return NextResponse.redirect(
        new URL('/login?error=Invalid+email+in+SAML+response', req.url)
      )
    }

    // Look up the appropriate SSO config
    let certificate: string

    if (isCharity) {
      const charityConfig = await prisma.charitySsoConfig.findFirst({
        where: { configured: true },
      })
      if (!charityConfig || !charityConfig.certificate) {
        return NextResponse.redirect(
          new URL('/login?error=No+charity+SSO+configuration+found', req.url)
        )
      }
      certificate = charityConfig.certificate
    } else {
      const orgConfig = await prisma.orgSsoConfig.findFirst({
        where: { emailDomain: domain, configured: true },
      })
      if (!orgConfig) {
        return NextResponse.redirect(
          new URL('/login?error=No+SSO+configuration+found', req.url)
        )
      }
      certificate = orgConfig.certificate
    }

    // Validate the SAML response
    const result = await validateSamlResponse(samlResponse, certificate)
    if (!result.valid) {
      console.error('SAML validation failed:', result.error)
      return NextResponse.redirect(
        new URL('/login?error=SSO+authentication+failed', req.url)
      )
    }

    const validatedEmail = (result.email || email).toLowerCase().trim()
    const validatedName = result.name

    // Find user
    let user = await prisma.user.findUnique({
      where: { email: validatedEmail },
      include: { organisation: { select: { active: true } } },
    })

    if (isCharity) {
      // Charity SSO: user must exist as SUPER_ADMIN or CHARITY_EMPLOYEE (no auto-provision)
      if (!user) {
        return NextResponse.redirect(
          new URL('/login?error=No+charity+account+found+for+this+email', req.url)
        )
      }
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'CHARITY_EMPLOYEE') {
        return NextResponse.redirect(
          new URL('/login?error=This+account+is+not+a+charity+staff+account', req.url)
        )
      }
    } else {
      // Org SSO: existing auto-provision logic
      if (!user) {
        const orgConfig = await prisma.orgSsoConfig.findFirst({
          where: { emailDomain: domain, configured: true },
        })
        if (orgConfig?.autoProvision) {
          user = await prisma.user.create({
            data: {
              email: validatedEmail,
              name: validatedName || validatedEmail.split('@')[0],
              password: null, // SSO user, no password
              role: (orgConfig.defaultRole as any) || 'EMPLOYEE', // eslint-disable-line @typescript-eslint/no-explicit-any
              organisationId: orgConfig.organisationId,
              active: true,
            },
            include: { organisation: { select: { active: true } } },
          })
        }
      }

      if (!user) {
        return NextResponse.redirect(
          new URL(
            '/login?error=Account+not+found.+Contact+your+organisation+administrator.',
            req.url
          )
        )
      }
    }

    // Build JWT token
    const effectivePrograms = await getUserPrograms(user.id)
    const orgForFeatures = user.organisationId
      ? await prisma.organisation.findUnique({
          where: { id: user.organisationId },
          select: { cvBuilderEnabled: true, careersAdvisorEnabled: true },
        })
      : null
    const cvBuilderEnabled = orgForFeatures?.cvBuilderEnabled ?? true
    const careersAdvisorEnabled = orgForFeatures?.careersAdvisorEnabled ?? true

    const token = await encode({
      token: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organisationId: user.organisationId,
        mustChangePassword: user.mustChangePassword ?? false,
        totpEnabled: user.totpEnabled ?? false,
        mfaPending: false, // SAML users skip MFA (already authenticated by corporate IdP)
        hasPassword: !!user.password,
        effectivePrograms,
        charityPermissions: user.charityPermissions ?? [],
        cvBuilderEnabled,
        careersAdvisorEnabled,
      },
      secret: process.env.NEXTAUTH_SECRET!,
    })

    // Set session cookie and redirect to home
    const isProduction = process.env.NODE_ENV === 'production'
    const cookieName = isProduction
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token'

    const response = NextResponse.redirect(new URL('/', req.url))
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60, // 8 hours — matches NextAuth session maxAge
    })

    return response
  } catch (error) {
    console.error('SAML callback error:', error)
    return NextResponse.redirect(
      new URL('/login?error=SSO+authentication+failed', req.url)
    )
  }
}
