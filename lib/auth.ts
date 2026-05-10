import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import AzureADProvider from 'next-auth/providers/azure-ad'
import { encode } from 'next-auth/jwt'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { getUserPrograms } from './modules'
import type { ProgramInfo } from './modules'
import { getEffectiveOrgSettings } from './org-hierarchy'
import { isSystemOrg } from './cohort'

async function getUserEffectivePrograms(userId: string): Promise<ProgramInfo[]> {
  return getUserPrograms(userId)
}

async function getOrgFeatureFlags(organisationId: string | null | undefined): Promise<{ cvBuilderEnabled: boolean; careersAdvisorEnabled: boolean }> {
  if (!organisationId) return { cvBuilderEnabled: true, careersAdvisorEnabled: true }
  const settings = await getEffectiveOrgSettings(organisationId)
  return {
    cvBuilderEnabled: settings.cvBuilderEnabled,
    careersAdvisorEnabled: settings.careersAdvisorEnabled,
  }
}

/**
 * Effective per-user feature flags.
 *
 * Normal orgs: user-level override wins, otherwise inherit the org default.
 * Independent Learners (system org): null user-level value means OFF, not
 *   inherit. Each unaffiliated learner is opted in explicitly — we don't
 *   want toggling the org default to silently grant CV Builder to every
 *   workshop participant.
 */
async function getEffectiveFeatureFlags(
  userId: string | null | undefined,
  organisationId: string | null | undefined
): Promise<{ cvBuilderEnabled: boolean; careersAdvisorEnabled: boolean }> {
  const orgFlags = await getOrgFeatureFlags(organisationId)
  if (!userId) return orgFlags
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      cvBuilderEnabled: true,
      careersAdvisorEnabled: true,
      organisation: { select: { slug: true } },
    },
  })
  if (!user) return orgFlags
  const onSystemOrg = isSystemOrg(user.organisation ?? {})
  return {
    cvBuilderEnabled: onSystemOrg
      ? (user.cvBuilderEnabled ?? false)
      : (user.cvBuilderEnabled ?? orgFlags.cvBuilderEnabled),
    careersAdvisorEnabled: onSystemOrg
      ? (user.careersAdvisorEnabled ?? false)
      : (user.careersAdvisorEnabled ?? orgFlags.careersAdvisorEnabled),
  }
}

async function getOrgIsParent(organisationId: string | null | undefined): Promise<boolean> {
  if (!organisationId) return false
  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { isParentOrg: true },
  })
  return org?.isParentOrg ?? false
}

async function getUserSubscriptionInfo(
  userId: string | null | undefined,
  organisationId: string | null | undefined
): Promise<{ subscriptionStatus: string; isPersonalOrg: boolean }> {
  // Org-attached users: read from the org.
  if (organisationId) {
    const org = await prisma.organisation.findUnique({
      where: { id: organisationId },
      select: { subscriptionStatus: true },
    })
    return { subscriptionStatus: org?.subscriptionStatus ?? 'NONE', isPersonalOrg: false }
  }
  // Individual subscribers: read from the user. `isPersonalOrg` is retained
  // for session compatibility but always true for individuals (no org).
  if (!userId) return { subscriptionStatus: 'NONE', isPersonalOrg: false }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true },
  })
  return {
    subscriptionStatus: user?.subscriptionStatus ?? 'NONE',
    isPersonalOrg: true,
  }
}

// OAuth providers (Google / Microsoft) are registered with NextAuth whenever
// their env credentials are present, so the callback URLs work without a
// redeploy when the admin flips the DB toggle. Whether the provider is
// actually allowed to sign a user in is enforced in the signIn callback by
// looking up the OAuthSsoConfig row — that gate is what makes the per-tenant
// admin toggle effective. The login UI separately reads the same toggle via
// /api/auth/sso-providers to decide whether to render the buttons.
const HAS_GOOGLE_CREDENTIALS = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
const HAS_AZURE_CREDENTIALS = !!(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET)

export const authOptions: NextAuthOptions = {
  // No adapter — we use JWT sessions and handle SSO linking manually in signIn callback
  providers: [
    ...(HAS_GOOGLE_CREDENTIALS
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID ?? '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(HAS_AZURE_CREDENTIALS
      ? [
          AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID ?? '',
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET ?? '',
            tenantId: process.env.AZURE_AD_TENANT_ID ?? 'common',
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        totpCode: { label: 'TOTP Code', type: 'text' },
      },
      async authorize(credentials) {
        // Single, opaque credentials error. Distinct messages for "no such
        // user" vs "wrong password" vs "uses SSO" let an attacker enumerate
        // valid emails and learn which sign-in method each one uses.
        // Collapse them all to one neutral string; only surface specific
        // copy AFTER we've confirmed the password is correct.
        const INVALID_CREDENTIALS = 'Invalid email or password'

        if (!credentials?.email) {
          throw new Error(INVALID_CREDENTIALS)
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { organisation: { select: { active: true } } },
        })

        // MFA verification step (second call from MFA verify page) — gated
        // by an existing user with TOTP enabled. Genuinely keyed on a code,
        // not a password, so it doesn't widen the enumeration surface.
        if (credentials.totpCode) {
          if (!user) throw new Error(INVALID_CREDENTIALS)
          const { TOTP } = await import('otpauth')
          if (!user.totpSecret || !user.totpEnabled) {
            throw new Error('MFA not enabled')
          }
          const totp = new TOTP({
            issuer: 'Ambitious about Autism',
            label: user.email,
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: user.totpSecret,
          })
          const delta = totp.validate({ token: credentials.totpCode, window: 1 })
          if (delta === null) {
            throw new Error('Invalid MFA code')
          }

          // MFA verified — apply the same post-auth checks that the password
          // path runs (deactivation / pending approval) before issuing a token.
          if (user.pendingApproval) {
            throw new Error('Your account is pending approval by your organisation admin. You will be able to sign in once approved.')
          }
          if (!user.active) {
            throw new Error('Your account has been deactivated. Please contact an administrator.')
          }
          if (user.organisation && !user.organisation.active) {
            throw new Error('Your organisation has been deactivated. Please contact an administrator.')
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            organisationId: user.organisationId,
            mustChangePassword: user.mustChangePassword,
            totpEnabled: true,
            mfaPending: false,
          }
        }

        // Normal password check. Every failure path below collapses to the
        // generic INVALID_CREDENTIALS error.
        if (!credentials.password) throw new Error(INVALID_CREDENTIALS)
        if (!user) throw new Error(INVALID_CREDENTIALS)
        if (!user.password) {
          // SSO-only account. Don't tell the attacker that — same generic
          // error as a wrong password. Legitimate SSO users will use the
          // SSO toggle on the login page.
          throw new Error(INVALID_CREDENTIALS)
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
        if (!isPasswordValid) throw new Error(INVALID_CREDENTIALS)

        // Password verified — only NOW reveal account-state errors. These
        // are not enumeration vectors because the attacker already had to
        // present the correct password to get here.
        if (user.pendingApproval) {
          throw new Error('Your account is pending approval by your organisation admin. You will be able to sign in once approved.')
        }
        if (!user.active) {
          throw new Error('Your account has been deactivated. Please contact an administrator.')
        }
        if (user.organisation && !user.organisation.active) {
          throw new Error('Your organisation has been deactivated. Please contact an administrator.')
        }

        // Check if MFA is required
        const mfaPending = user.totpEnabled === true

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organisationId: user.organisationId,
          mustChangePassword: user.mustChangePassword,
          totpEnabled: user.totpEnabled,
          mfaPending,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },
  callbacks: {
    async signIn({ user, account }) {
      // OAuth providers — even though they're registered with NextAuth, the
      // DB toggle gates whether logins are accepted. Without this an admin
      // who turned Google off in the UI could still be impersonated by
      // anyone hitting /api/auth/signin/google directly.
      if (account?.provider === 'google' || account?.provider === 'azure-ad') {
        const oauthConfig = await prisma.oAuthSsoConfig.findFirst()
        if (account.provider === 'google' && !oauthConfig?.googleEnabled) {
          return '/login?error=Google+sign-in+is+not+enabled'
        }
        if (account.provider === 'azure-ad' && !oauthConfig?.microsoftEnabled) {
          return '/login?error=Microsoft+sign-in+is+not+enabled'
        }
      }

      if (account?.provider !== 'credentials') {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email ?? '' },
          include: { organisation: { select: { active: true } } },
        })

        if (!dbUser) {
          // OAuth-first sign-up: an SSO-authenticated visitor with no DB
          // record gets redirected to /register/sso-complete to pick the
          // self-registration role that mirrors the no-org path on /register.
          // The JWT carries the IdP-verified email + provider link so the
          // completion page can't be forged from a hand-crafted URL.
          if (account?.provider === 'google' || account?.provider === 'azure-ad') {
            // Intent JWT — NOT a full session token. The encode helper's
            // generic type insists on the JWT (session) shape; we cast
            // because the on-disk format is just JSON and we re-verify
            // both `purpose` and the embedded fields on the consuming end
            // (app/api/auth/register/sso-complete).
            const intentPayload = {
              purpose: 'sso-register' as const,
              email: (user.email ?? '').toLowerCase(),
              name: user.name ?? null,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            }
            const intentToken = await encode({
              token: intentPayload as unknown as import('next-auth/jwt').JWT,
              secret: process.env.NEXTAUTH_SECRET!,
              maxAge: 10 * 60,
            })
            return `/register/sso-complete?token=${encodeURIComponent(intentToken)}`
          }
          return '/login?error=Account not found. Contact your organisation administrator.'
        }

        if (dbUser.pendingApproval) {
          return '/login?error=Your+account+is+pending+approval+by+your+organisation+admin.'
        }

        if (!dbUser.active) {
          return false
        }

        if (dbUser.organisation && !dbUser.organisation.active) {
          return false
        }

        // Ensure Account link exists for SSO provider (prevents OAuthAccountNotLinked)
        if (account) {
          const existing = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
          })
          if (!existing) {
            await prisma.account.create({
              data: {
                userId: dbUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token ?? null,
                access_token: account.access_token ?? null,
                expires_at: account.expires_at ?? null,
                token_type: account.token_type ?? null,
                scope: account.scope ?? null,
                id_token: account.id_token ?? null,
                session_state: (account.session_state as string) ?? null,
              },
            })
          }
        }

        return true
      }
      return true
    },
    async jwt({ token, user, account, trigger }) {
      // Credentials login — user object already has DB fields
      if (user && account?.provider === 'credentials') {
        token.id = user.id
        token.role = (user as { role?: string }).role ?? 'EMPLOYEE'
        token.organisationId = (user as { organisationId?: string | null }).organisationId ?? null
        token.mustChangePassword = (user as { mustChangePassword?: boolean }).mustChangePassword ?? false
        token.totpEnabled = (user as { totpEnabled?: boolean }).totpEnabled ?? false
        token.mfaPending = (user as { mfaPending?: boolean }).mfaPending ?? false
        token.hasPassword = true // Credentials users always have a password
        token.effectivePrograms = await getUserEffectivePrograms(user.id)
        // Fetch charityPermissions for charity-level users
        const dbUserForPerms = await prisma.user.findUnique({
          where: { id: user.id },
          select: { charityPermissions: true },
        })
        token.charityPermissions = dbUserForPerms?.charityPermissions ?? []
        const flags = await getEffectiveFeatureFlags(user.id, token.organisationId as string | null)
        token.cvBuilderEnabled = flags.cvBuilderEnabled
        token.careersAdvisorEnabled = flags.careersAdvisorEnabled
        token.isParentOrg = await getOrgIsParent(token.organisationId as string | null)
        const subInfo = await getUserSubscriptionInfo(
          token.id as string,
          token.organisationId as string | null
        )
        token.subscriptionStatus = subInfo.subscriptionStatus
        token.isPersonalOrg = subInfo.isPersonalOrg
        token.lastValidatedAt = Date.now()
      }

      // SSO login — look up DB user by email since there's no adapter
      if (user && account?.provider !== 'credentials') {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email ?? '' },
          select: { id: true, role: true, organisationId: true, mustChangePassword: true, totpEnabled: true, charityPermissions: true, password: true },
        })
        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
          token.organisationId = dbUser.organisationId
          token.mustChangePassword = dbUser.mustChangePassword
          token.totpEnabled = dbUser.totpEnabled
          token.mfaPending = dbUser.totpEnabled === true
          token.hasPassword = !!dbUser.password
          token.effectivePrograms = await getUserEffectivePrograms(dbUser.id)
          token.charityPermissions = dbUser.charityPermissions ?? []
          const ssoFlags = await getEffectiveFeatureFlags(dbUser.id, dbUser.organisationId)
          token.cvBuilderEnabled = ssoFlags.cvBuilderEnabled
          token.careersAdvisorEnabled = ssoFlags.careersAdvisorEnabled
          token.isParentOrg = await getOrgIsParent(dbUser.organisationId)
          const ssoSubInfo = await getUserSubscriptionInfo(dbUser.id, dbUser.organisationId)
          token.subscriptionStatus = ssoSubInfo.subscriptionStatus
          token.isPersonalOrg = ssoSubInfo.isPersonalOrg
          token.lastValidatedAt = Date.now()
        }
      }

      // Periodic re-validation. Without this, role demotions, deactivations,
      // feature-flag toggles, and program revocations only take effect when
      // the user signs out and back in (up to 8h). Now they propagate within
      // VALIDATION_INTERVAL_MS (60s) — fast enough for ops, infrequent enough
      // that the per-request DB cost is negligible.
      //
      // Forced refreshes (`trigger === 'update'` from session.update() on the
      // client) bypass the freshness window so explicit refresh works
      // immediately. Fail-closed: if the user is gone or deactivated we
      // return null so NextAuth treats the session as signed out.
      const VALIDATION_INTERVAL_MS = 60_000
      const needsRefresh =
        Boolean(token.id) && (
          trigger === 'update' ||
          typeof token.lastValidatedAt !== 'number' ||
          Date.now() - token.lastValidatedAt > VALIDATION_INTERVAL_MS
        )

      if (needsRefresh && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            role: true,
            organisationId: true,
            active: true,
            mustChangePassword: true,
            totpEnabled: true,
            charityPermissions: true,
            password: true,
            organisation: { select: { active: true } },
          },
        })

        if (!dbUser || !dbUser.active || (dbUser.organisation && !dbUser.organisation.active)) {
          // NextAuth v4 supports returning null from the jwt callback to
          // invalidate the session at runtime, but its TS signature only
          // declares JWT. Cast — confirmed via the (deactivation) test path
          // below and via NextAuth's own credentials-provider behaviour.
          return null as unknown as import('next-auth/jwt').JWT
        }

        token.role = dbUser.role
        token.organisationId = dbUser.organisationId
        token.mustChangePassword = dbUser.mustChangePassword
        token.totpEnabled = dbUser.totpEnabled
        token.hasPassword = !!dbUser.password
        token.charityPermissions = dbUser.charityPermissions ?? []
        const updateFlags = await getEffectiveFeatureFlags(token.id as string, dbUser.organisationId)
        token.cvBuilderEnabled = updateFlags.cvBuilderEnabled
        token.careersAdvisorEnabled = updateFlags.careersAdvisorEnabled
        token.isParentOrg = await getOrgIsParent(dbUser.organisationId)
        const updateSubInfo = await getUserSubscriptionInfo(token.id as string, dbUser.organisationId)
        token.subscriptionStatus = updateSubInfo.subscriptionStatus
        token.isPersonalOrg = updateSubInfo.isPersonalOrg
        token.effectivePrograms = await getUserEffectivePrograms(token.id as string)
        token.lastValidatedAt = Date.now()
      }

      // Explicit session.update() also clears any pending MFA gate.
      if (trigger === 'update') {
        token.mfaPending = false
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.organisationId = (token.organisationId as string | null) ?? null
        session.user.mustChangePassword = token.mustChangePassword as boolean
        session.user.totpEnabled = token.totpEnabled as boolean
        session.user.mfaPending = token.mfaPending as boolean
        session.user.hasPassword = (token.hasPassword as boolean) ?? true
        session.user.effectivePrograms = (token.effectivePrograms as ProgramInfo[]) ?? []
        session.user.charityPermissions = (token.charityPermissions as string[]) ?? []
        session.user.cvBuilderEnabled = (token.cvBuilderEnabled as boolean) ?? true
        session.user.careersAdvisorEnabled = (token.careersAdvisorEnabled as boolean) ?? true
        session.user.isParentOrg = (token.isParentOrg as boolean) ?? false
        session.user.subscriptionStatus = (token.subscriptionStatus as string) ?? 'NONE'
        session.user.isPersonalOrg = (token.isPersonalOrg as boolean) ?? false
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
