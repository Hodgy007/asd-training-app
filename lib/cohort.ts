/**
 * Cohort helpers — invite codes, lifecycle transitions, and the public join flow.
 *
 * A "cohort" here is an Organisation row with `orgType = 'COHORT'`. Membership is
 * tracked in the `CohortMembership` join table so users can belong to multiple
 * cohorts over time and keep platform access after a cohort archives.
 */
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const INDEPENDENT_LEARNERS_SLUG = 'independent-learners'

/**
 * The Independent Learners org is system-managed: its row exists so PARTICIPANT
 * users always have a valid `organisationId` (avoiding a nullable refactor).
 * It can be targeted by libraries / announcements / surveys, but cannot be
 * renamed, deleted, or have its `orgType` changed by admins.
 */
export function isSystemOrg(org: { slug?: string | null; isPersonal?: boolean | null }): boolean {
  return org.slug === INDEPENDENT_LEARNERS_SLUG
}

/** URL-safe code, ~16 chars of base64url (96 bits of entropy). */
export function generateInviteCode(): string {
  return crypto.randomBytes(12).toString('base64url')
}

/** Find the singleton "Independent Learners" org used as the home org for unaligned PARTICIPANT users. */
export async function getIndependentLearnersOrg() {
  const org = await prisma.organisation.findUnique({ where: { slug: INDEPENDENT_LEARNERS_SLUG } })
  if (!org) {
    throw new Error(
      `Independent Learners org not found. Run scripts/backfill-cohort-memberships.ts to seed it.`
    )
  }
  return org
}

export async function archiveCohort(cohortId: string) {
  return prisma.organisation.update({
    where: { id: cohortId },
    data: {
      lifecycleStatus: 'ARCHIVED',
      archivedAt: new Date(),
      inviteEnabled: false,
    },
  })
}

export async function unarchiveCohort(cohortId: string) {
  return prisma.organisation.update({
    where: { id: cohortId },
    data: { lifecycleStatus: 'ACTIVE', archivedAt: null },
  })
}

export interface JoinResult {
  userId: string
  isNewUser: boolean
  cohortId: string
  cohortName: string
}

export interface JoinPayload {
  code: string
  email: string
  name: string
  password: string
}

export class JoinError extends Error {
  constructor(public code: 'INVALID_CODE' | 'EXPIRED' | 'ARCHIVED' | 'WEAK_PASSWORD' | 'EMAIL_IN_USE_DIFFERENT_PASSWORD', message: string) {
    super(message)
  }
}

/**
 * Public cohort-join handler. Resolves an invite code, creates or links a user,
 * and writes the membership row. Idempotent for repeat joins by the same email.
 *
 * If the email already exists:
 *   - If the supplied password matches, we just attach the membership (no role change).
 *   - If it doesn't match, we reject — we don't want a public form to clobber a
 *     real user's password or silently link to someone else's account.
 */
export async function joinCohortByCode(payload: JoinPayload): Promise<JoinResult> {
  const { code, email, name, password } = payload

  if (password.length < 8) {
    throw new JoinError('WEAK_PASSWORD', 'Password must be at least 8 characters.')
  }

  const cohort = await prisma.organisation.findUnique({ where: { inviteCode: code } })
  if (!cohort || cohort.orgType !== 'COHORT' || !cohort.inviteEnabled) {
    throw new JoinError('INVALID_CODE', 'This invite link is not valid.')
  }
  if (cohort.lifecycleStatus === 'ARCHIVED') {
    throw new JoinError('ARCHIVED', 'This cohort has ended and is no longer accepting joins.')
  }
  if (cohort.inviteExpiresAt && cohort.inviteExpiresAt < new Date()) {
    throw new JoinError('EXPIRED', 'This invite link has expired.')
  }

  const normalisedEmail = email.trim().toLowerCase()
  const existingUser = await prisma.user.findUnique({ where: { email: normalisedEmail } })

  let userId: string
  let isNewUser = false

  if (existingUser) {
    // Verify password matches before linking, so the public form can't be used to
    // hijack an existing account.
    if (!existingUser.password) {
      throw new JoinError(
        'EMAIL_IN_USE_DIFFERENT_PASSWORD',
        'An account with this email already exists. Sign in to join this cohort.'
      )
    }
    const ok = await bcrypt.compare(password, existingUser.password)
    if (!ok) {
      throw new JoinError(
        'EMAIL_IN_USE_DIFFERENT_PASSWORD',
        'An account with this email already exists. Sign in to join this cohort.'
      )
    }
    userId = existingUser.id
  } else {
    const independent = await getIndependentLearnersOrg()
    const passwordHash = await bcrypt.hash(password, 10)
    const created = await prisma.user.create({
      data: {
        email: normalisedEmail,
        name: name.trim() || null,
        password: passwordHash,
        role: 'PARTICIPANT',
        organisationId: independent.id,
        active: true,
      },
    })
    userId = created.id
    isNewUser = true
  }

  // Idempotent membership upsert — a repeat click on the invite link just no-ops.
  await prisma.cohortMembership.upsert({
    where: { userId_cohortId: { userId, cohortId: cohort.id } },
    create: { userId, cohortId: cohort.id, status: 'ACTIVE' },
    update: { status: 'ACTIVE', leftAt: null },
  })

  return { userId, isNewUser, cohortId: cohort.id, cohortName: cohort.name }
}
