import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import AzureADProvider from 'next-auth/providers/azure-ad'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { getUserPrograms } from './modules'
import type { ProgramInfo } from './modules'
import { getEffectiveOrgSettings } from './org-hierarchy'

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

async function getOrgIsParent(organisationId: string | null | undefined): Promise<boolean> {
  if (!organisationId) return false
  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { isParentOrg: true },
  })
  return org?.isParentOrg ?? false
}

async function getOrgSubscriptionInfo(
  organisationId: string | null | undefined
): Promise<{ subscriptionStatus: string; isPersonalOrg: boolean }> {
  if (!organisationId) return { subscriptionStatus: 'NONE', isPersonalOrg: false }
  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { subscriptionStatus: true, isPersonal: true },
  })
  return {
    subscriptionStatus: org?.subscriptionStatus ?? 'NONE',
    isPersonalOrg: org?.isPersonal ?? false,
  }
}

export const authOptions: NextAuthOptions = {
  // No adapter — we use JWT sessions and handle SSO linking manually in signIn callback
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      allowDangerousEmailAccountLinking: true,
    }),
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID ?? '',
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET ?? '',
      tenantId: process.env.AZURE_AD_TENANT_ID ?? 'common',
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        totpCode: { label: 'TOTP Code', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          throw new Error('Email is required')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { organisation: { select: { active: true } } },
        })

        if (!user) {
          throw new Error('No account found with that email address')
        }

        if (user.pendingApproval) {
          throw new Error('Your account is pending approval by your organisation admin. You will be able to sign in once approved.')
        }

        if (!user.active) {
          throw new Error('Your account has been deactivated. Please contact an administrator.')
        }

        if (user.organisation && !user.organisation.active) {
          throw new Error('Your organisation has been deactivated. Please contact an administrator.')
        }

        // MFA verification step (second call from MFA verify page)
        if (credentials.totpCode) {
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

          // MFA verified — return user without mfaPending
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

        // Normal password check
        if (!credentials.password) {
          throw new Error('Password is required')
        }

        if (!user.password) {
          throw new Error('This account uses Single Sign-On. Please sign in using the SSO option.')
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

        if (!isPasswordValid) {
          throw new Error('Incorrect password')
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
      if (account?.provider !== 'credentials') {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email ?? '' },
          include: { organisation: { select: { active: true } } },
        })

        if (!dbUser) {
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
        const flags = await getOrgFeatureFlags(token.organisationId as string | null)
        token.cvBuilderEnabled = flags.cvBuilderEnabled
        token.careersAdvisorEnabled = flags.careersAdvisorEnabled
        token.isParentOrg = await getOrgIsParent(token.organisationId as string | null)
        const subInfo = await getOrgSubscriptionInfo(token.organisationId as string | null)
        token.subscriptionStatus = subInfo.subscriptionStatus
        token.isPersonalOrg = subInfo.isPersonalOrg
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
          const ssoFlags = await getOrgFeatureFlags(dbUser.organisationId)
          token.cvBuilderEnabled = ssoFlags.cvBuilderEnabled
          token.careersAdvisorEnabled = ssoFlags.careersAdvisorEnabled
          token.isParentOrg = await getOrgIsParent(dbUser.organisationId)
          const ssoSubInfo = await getOrgSubscriptionInfo(dbUser.organisationId)
          token.subscriptionStatus = ssoSubInfo.subscriptionStatus
          token.isPersonalOrg = ssoSubInfo.isPersonalOrg
        }
      }

      if (trigger === 'update') {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, organisationId: true, mustChangePassword: true, totpEnabled: true, charityPermissions: true, password: true },
        })
        if (dbUser) {
          token.role = dbUser.role
          token.organisationId = dbUser.organisationId
          token.mustChangePassword = dbUser.mustChangePassword
          token.totpEnabled = dbUser.totpEnabled
          token.hasPassword = !!dbUser.password
          token.charityPermissions = dbUser.charityPermissions ?? []
          const updateFlags = await getOrgFeatureFlags(dbUser.organisationId)
          token.cvBuilderEnabled = updateFlags.cvBuilderEnabled
          token.careersAdvisorEnabled = updateFlags.careersAdvisorEnabled
          token.isParentOrg = await getOrgIsParent(dbUser.organisationId)
          const updateSubInfo = await getOrgSubscriptionInfo(dbUser.organisationId)
          token.subscriptionStatus = updateSubInfo.subscriptionStatus
          token.isPersonalOrg = updateSubInfo.isPersonalOrg
        }
        token.mfaPending = false
        token.effectivePrograms = await getUserEffectivePrograms(token.id as string)
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
