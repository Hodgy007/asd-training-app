import { NextRequest, NextResponse } from 'next/server'
import { encode } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { validateSamlResponse } from '@/lib/saml'
import { getUserPrograms } from '@/lib/modules'
import { LEAF_ROLES } from '@/types'

function loginError(req: NextRequest, message: string): NextResponse {
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, req.url))
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const samlResponse = formData.get('SAMLResponse') as string | null
    const relayState = formData.get('RelayState') as string | null

    if (!samlResponse || !relayState) {
      return loginError(req, 'Invalid SAML response')
    }

    // RelayState is UI state, not a credential. We use it only to pick which
    // IdP config's certificate to verify the signature against; the assertion
    // itself (and the server-side AuthnRequest row it answers) are the
    // authoritative identity. Never trust RelayState past config selection.
    const relayIsCharity = relayState.startsWith('charity:')
    const relayEmail = (relayIsCharity ? relayState.slice('charity:'.length) : relayState)
      .toLowerCase()
      .trim()
    const relayDomain = relayEmail.split('@')[1]
    if (!relayDomain) {
      return loginError(req, 'Invalid email in SAML response')
    }

    // Look up the config that will supply the signing certificate + issuer.
    let certificate: string
    let expectedIssuer: string
    let orgConfig: {
      organisationId: string
      emailDomain: string
      autoProvision: boolean
      defaultRole: string | null
    } | null = null

    if (relayIsCharity) {
      const charityConfig = await prisma.charitySsoConfig.findFirst({ where: { configured: true } })
      if (!charityConfig || !charityConfig.certificate || !charityConfig.entityId) {
        return loginError(req, 'No charity SSO configuration found')
      }
      certificate = charityConfig.certificate
      expectedIssuer = charityConfig.entityId
    } else {
      const cfg = await prisma.orgSsoConfig.findFirst({
        where: { emailDomain: relayDomain, configured: true },
      })
      if (!cfg || !cfg.entityId) {
        return loginError(req, 'No SSO configuration found')
      }
      certificate = cfg.certificate
      expectedIssuer = cfg.entityId
      orgConfig = {
        organisationId: cfg.organisationId,
        emailDomain: cfg.emailDomain,
        autoProvision: cfg.autoProvision,
        defaultRole: cfg.defaultRole,
      }
    }

    // Validate signature, XSW protection, InResponseTo (single-use), issuer,
    // audience, recipient and freshness. Returns the consumed AuthnRequest row.
    const result = await validateSamlResponse(samlResponse, certificate, expectedIssuer)
    if (!result.valid || !result.email || !result.authnRequest) {
      console.error('SAML validation failed:', result.error)
      return loginError(req, 'SSO authentication failed')
    }

    // The AuthnRequest row (bound by InResponseTo) is the source of truth for
    // whether this was a charity or org flow. Reject any mismatch with the
    // RelayState we used to pick the certificate — it means the two disagree
    // about the flow, which should never happen for a legitimate login.
    if (result.authnRequest.isCharity !== relayIsCharity) {
      console.error('SAML flow mismatch between RelayState and AuthnRequest')
      return loginError(req, 'SSO authentication failed')
    }

    const isCharity = result.authnRequest.isCharity
    const validatedEmail = result.email.toLowerCase().trim()
    const validatedName = result.name
    const validatedDomain = validatedEmail.split('@')[1]
    if (!validatedDomain) {
      return loginError(req, 'SSO response missing email')
    }

    let user = await prisma.user.findUnique({
      where: { email: validatedEmail },
      include: { organisation: { select: { active: true } } },
    })

    if (isCharity) {
      // Charity SSO: user must already exist as a charity-level account. No
      // auto-provisioning, and no org binding (charity staff have no org).
      if (!user) {
        return loginError(req, 'No charity account found for this email')
      }
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'CHARITY_EMPLOYEE') {
        return loginError(req, 'This account is not a charity staff account')
      }
    } else {
      // Org SSO. Bind the assertion to the tenant that configured it:
      //   1. The signed NameID's domain must equal the config's emailDomain.
      //      Without this, an org admin who runs their own IdP for evil.com
      //      could have it assert superadmin@charity.org and be logged in as
      //      the charity admin.
      //   2. An existing user must belong to that same organisation, and must
      //      not be a charity-level account — org SSO can only ever
      //      authenticate members of its own org.
      //   3. Auto-provisioned users are created only in that org, with a leaf
      //      role.
      if (!orgConfig) {
        return loginError(req, 'No SSO configuration found')
      }
      if (validatedDomain !== orgConfig.emailDomain) {
        console.error('SAML NameID domain does not match the SSO config domain', {
          validatedDomain,
          configDomain: orgConfig.emailDomain,
        })
        return loginError(req, 'SSO email domain does not match this organisation')
      }

      if (user) {
        if (user.role === 'SUPER_ADMIN' || user.role === 'CHARITY_EMPLOYEE') {
          console.error('Org SSO refused for a charity-level account', { email: validatedEmail })
          return loginError(req, 'SSO authentication failed')
        }
        if (user.organisationId !== orgConfig.organisationId) {
          console.error('Org SSO user does not belong to the configured organisation', {
            email: validatedEmail,
          })
          return loginError(req, 'SSO authentication failed')
        }
      } else if (orgConfig.autoProvision) {
        // Defence in depth: even if a malformed defaultRole somehow landed in
        // the DB, refuse to mint anything other than a leaf role here.
        const configuredRole = orgConfig.defaultRole
        const safeRole =
          typeof configuredRole === 'string' &&
          LEAF_ROLES.includes(configuredRole as (typeof LEAF_ROLES)[number])
            ? configuredRole
            : 'LEARNER'
        user = await prisma.user.create({
          data: {
            email: validatedEmail,
            name: validatedName || validatedEmail.split('@')[0],
            password: null, // SSO user, no password
            role: safeRole as never,
            organisationId: orgConfig.organisationId,
            active: true,
          },
          include: { organisation: { select: { active: true } } },
        })
      }

      if (!user) {
        return loginError(req, 'Account not found. Contact your organisation administrator.')
      }
    }

    // Blocked accounts / orgs fail closed, same as the credentials path.
    if (!user.active) {
      return loginError(req, 'Your account has been deactivated. Please contact an administrator.')
    }
    if (user.organisation && !user.organisation.active) {
      return loginError(req, 'Your organisation has been deactivated. Please contact an administrator.')
    }

    // Build JWT token
    const effectivePrograms = await getUserPrograms(user.id)
    const orgForFeatures = user.organisationId
      ? await prisma.organisation.findUnique({
          where: { id: user.organisationId },
          select: {
            isParentOrg: true,
            subscriptionStatus: true,
          },
        })
      : null
    const userSubInfo = user.organisationId
      ? null
      : await prisma.user.findUnique({
          where: { id: user.id },
          select: { subscriptionStatus: true },
        })

    // TOTP still applies to SSO sessions when the account has it enrolled:
    // the corporate IdP is one factor, the app's own TOTP is a second. Users
    // without TOTP (typically learners) get mfaPending=false; admin roles
    // without it are pushed to /mfa-setup by the middleware as usual.
    const mfaPending = user.totpEnabled === true

    const token = await encode({
      token: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organisationId: user.organisationId,
        mustChangePassword: user.mustChangePassword ?? false,
        totpEnabled: user.totpEnabled ?? false,
        mfaPending,
        hasPassword: !!user.password,
        effectivePrograms,
        charityPermissions: user.charityPermissions ?? [],
        isParentOrg: orgForFeatures?.isParentOrg ?? false,
        subscriptionStatus:
          orgForFeatures?.subscriptionStatus ?? userSubInfo?.subscriptionStatus ?? 'NONE',
        isPersonalOrg: !user.organisationId,
        lastValidatedAt: Date.now(),
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
    return NextResponse.redirect(new URL('/login?error=SSO+authentication+failed', req.url))
  }
}
