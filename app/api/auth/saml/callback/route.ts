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

    const email = relayState.toLowerCase().trim()
    const domain = email.split('@')[1]
    if (!domain) {
      return NextResponse.redirect(
        new URL('/login?error=Invalid+email+in+SAML+response', req.url)
      )
    }

    // Look up SSO config for this domain
    const config = await prisma.orgSsoConfig.findFirst({
      where: { emailDomain: domain, configured: true },
    })
    if (!config) {
      return NextResponse.redirect(
        new URL('/login?error=No+SSO+configuration+found', req.url)
      )
    }

    // Validate the SAML response
    const result = await validateSamlResponse(samlResponse, config.certificate)
    if (!result.valid) {
      console.error('SAML validation failed:', result.error)
      return NextResponse.redirect(
        new URL('/login?error=SSO+authentication+failed', req.url)
      )
    }

    const validatedEmail = (result.email || email).toLowerCase().trim()
    const validatedName = result.name

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: validatedEmail },
      include: { organisation: { select: { active: true } } },
    })

    if (!user && config.autoProvision) {
      user = await prisma.user.create({
        data: {
          email: validatedEmail,
          name: validatedName || validatedEmail.split('@')[0],
          password: '', // SSO user, no password
          role: (config.defaultRole as any) || 'EMPLOYEE', // eslint-disable-line @typescript-eslint/no-explicit-any
          organisationId: config.organisationId,
          active: true,
        },
        include: { organisation: { select: { active: true } } },
      })
    }

    if (!user) {
      return NextResponse.redirect(
        new URL(
          '/login?error=Account+not+found.+Contact+your+organisation+administrator.',
          req.url
        )
      )
    }

    // Build JWT token
    const effectivePrograms = await getUserPrograms(user.id)

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
        effectivePrograms,
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
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    return response
  } catch (error) {
    console.error('SAML callback error:', error)
    return NextResponse.redirect(
      new URL('/login?error=SSO+authentication+failed', req.url)
    )
  }
}
