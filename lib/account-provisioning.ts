/**
 * Reusable user-provisioning + transactional-email helpers.
 *
 * Used by the free-claim flow (/api/courses/free-claim) — and structured so the
 * Stripe webhook could migrate onto these helpers in the future. For now the
 * webhook keeps its own near-identical copies to avoid disturbing tested code.
 */

import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { Resend } from 'resend'
import { prisma } from './prisma'
import { wrapEmailHtml } from './email-templates/layout'

const FROM_ADDRESS = 'Ambitious About Autism <onboarding@resend.dev>'

function loginUrl(email: string): string {
  const base = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  return `${base}/login?email=${encodeURIComponent(email)}`
}

/**
 * Email a brand-new user their temporary password.
 */
export async function sendCredentialsEmail(args: {
  email: string
  tempPassword: string
  name: string | null
  programName?: string | null
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.error(
      `[account-provisioning] RESEND_API_KEY missing — cannot email credentials to ${args.email}.`
    )
    return
  }

  const programLine = args.programName
    ? `<p>You now have access to <strong>${escapeHtml(args.programName)}</strong>.</p>`
    : ''

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const innerHtml = `
      <h2 style="color: #f5821f; margin-top: 0;">Welcome${args.name ? ', ' + escapeHtml(args.name) : ''}!</h2>
      ${programLine}
      <p>Sign in with:</p>
      <ul>
        <li><strong>Email:</strong> ${escapeHtml(args.email)}</li>
        <li><strong>Temporary password:</strong> <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">${escapeHtml(args.tempPassword)}</code></li>
      </ul>
      <p><a class="btn" href="${loginUrl(args.email)}">Sign in</a></p>
      <p class="footer">You'll be asked to change your password on first sign-in.</p>
    `
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: args.email,
      subject: 'Welcome — your training account is ready',
      html: wrapEmailHtml(innerHtml),
    })
  } catch (error) {
    console.error('[account-provisioning] Failed to send credentials email:', error)
  }
}

/**
 * Email an existing user that they've been granted access to a new program.
 * Includes a one-click password-reset link so they can set a new password
 * without having to navigate through forgot-password manually.
 */
export async function sendAccessGrantedEmail(args: {
  email: string
  name: string | null
  programName: string
  resetUrl: string
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.error(
      `[account-provisioning] RESEND_API_KEY missing — cannot email access notice to ${args.email}.`
    )
    return
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const innerHtml = `
      <h2 style="color: #f5821f; margin-top: 0;">Hello${args.name ? ', ' + escapeHtml(args.name) : ''}!</h2>
      <p>You've been granted free access to <strong>${escapeHtml(args.programName)}</strong>.</p>
      <p>You already have an account with this email. Set a fresh password to sign in:</p>
      <p><a class="btn" href="${args.resetUrl}">Set my password</a></p>
      <p class="footer">This link expires in 1 hour. If you remember your existing password you can ignore it and <a href="${loginUrl(args.email)}">sign in here</a> instead.</p>
    `
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: args.email,
      subject: `You now have access to ${args.programName}`,
      html: wrapEmailHtml(innerHtml),
    })
  } catch (error) {
    console.error('[account-provisioning] Failed to send access-granted email:', error)
  }
}

export interface GrantFreeAccessResult {
  /** True if a brand-new user was created. */
  created: boolean
  /** True if the program was newly attached to the user/org (false if it was already accessible). */
  programAttached: boolean
}

/**
 * Grant a user free access to a program by email.
 *
 * Behaviour:
 * - New email → create User (no org, role CAREGIVER) with the program in
 *   allowedProgramIds, send credentials email.
 * - Existing email with no org → append program to user.allowedProgramIds,
 *   send access-granted email.
 * - Existing email in an org → append program to org.allowedProgramIds (so the
 *   purchaser doesn't get private access to a shared org's seats), send
 *   access-granted email.
 *
 * Always records a Purchase row with amount=0 and a synthetic
 * stripeCheckoutSessionId prefixed `free_`.
 */
export async function grantFreeAccess(args: {
  programId: string
  programName: string
  email: string
  name: string | null
}): Promise<GrantFreeAccessResult> {
  const { programId, programName, email, name } = args

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, organisationId: true, allowedProgramIds: true },
  })

  let userId: string
  let created = false
  let programAttached = false

  if (existing) {
    userId = existing.id
    if (existing.organisationId) {
      const org = await prisma.organisation.findUnique({
        where: { id: existing.organisationId },
        select: { allowedProgramIds: true },
      })
      if (org && !org.allowedProgramIds.includes(programId)) {
        await prisma.organisation.update({
          where: { id: existing.organisationId },
          data: { allowedProgramIds: [...org.allowedProgramIds, programId] },
        })
        programAttached = true
      }
    } else if (!existing.allowedProgramIds.includes(programId)) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { allowedProgramIds: [...existing.allowedProgramIds, programId] },
      })
      programAttached = true
    }

    // Mint a fresh single-use reset token so the email can include a one-click
    // "Set my password" CTA. Same envelope as forgot-password (1-hour expiry,
    // 32-byte random token). Old tokens for this email are cleared so the
    // freshest link is always the one that wins.
    await prisma.passwordResetToken.deleteMany({ where: { email } })
    const resetToken = crypto.randomBytes(32).toString('hex')
    await prisma.passwordResetToken.create({
      data: {
        email,
        token: resetToken,
        expires: new Date(Date.now() + 1000 * 60 * 60),
      },
    })
    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`

    await sendAccessGrantedEmail({ email, name, programName, resetUrl })
  } else {
    const tempPassword = crypto.randomBytes(9).toString('base64url')
    const passwordHash = await bcrypt.hash(tempPassword, 10)
    const emailLocal = email.split('@')[0] ?? 'user'
    const user = await prisma.user.create({
      data: {
        email,
        name: name ?? emailLocal,
        password: passwordHash,
        role: 'CAREGIVER',
        organisationId: null,
        mustChangePassword: true,
        active: true,
        allowedProgramIds: [programId],
      },
      select: { id: true },
    })
    userId = user.id
    created = true
    programAttached = true

    await sendCredentialsEmail({ email, tempPassword, name, programName })
  }

  // Record an at-rest Purchase row even though no money changed hands. Keeps
  // reporting + audit consistent and ensures we don't double-grant if the same
  // claim is replayed (the synthetic session id is unique per claim).
  const syntheticSessionId = `free_${crypto.randomBytes(12).toString('hex')}`
  await prisma.purchase.create({
    data: {
      userId,
      organisationId: null,
      programId,
      stripeCheckoutSessionId: syntheticSessionId,
      stripePaymentIntentId: null,
      amount: 0,
      currency: 'gbp',
      status: 'PAID',
    },
  })

  return { created, programAttached }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
