import crypto from 'crypto'
import type Stripe from 'stripe'
import type { SubscriptionStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { Resend } from 'resend'
import { prisma } from './prisma'
import { requireStripe } from './stripe'
import { wrapEmailHtml } from './email-templates/layout'

const STRIPE_STATUS_MAP: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
  active: 'ACTIVE',
  trialing: 'TRIALING',
  past_due: 'PAST_DUE',
  canceled: 'CANCELED',
  unpaid: 'UNPAID',
  incomplete: 'NONE',
  incomplete_expired: 'CANCELED',
  paused: 'PAST_DUE',
}

export function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status
): SubscriptionStatus {
  return STRIPE_STATUS_MAP[status] ?? 'NONE'
}

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  const already = await prisma.stripeEvent.findUnique({ where: { id: event.id } })
  if (already) return

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
      break
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await handleSubscriptionChange(event.data.object as Stripe.Subscription)
      break
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
      break
    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
      break
  }

  await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } })
}

// ─── Owner resolution ─────────────────────────────────────────────────────────
// A Stripe subscription belongs to either an Organisation (shared seat) or a
// User (individual subscriber with no org). resolveOwner* helpers look up
// whichever owns a given customer/subscription so we can write to the right row.

type Owner =
  | { kind: 'org'; id: string; stripeCustomerId: string | null }
  | { kind: 'user'; id: string; stripeCustomerId: string | null }

async function resolveOwnerFromSession(session: Stripe.Checkout.Session): Promise<Owner | null> {
  // 1. Explicit org reference (set by org-admin checkout flow).
  if (session.client_reference_id) {
    const org = await prisma.organisation.findUnique({
      where: { id: session.client_reference_id },
      select: { id: true, stripeCustomerId: true },
    })
    if (org) return { kind: 'org', id: org.id, stripeCustomerId: org.stripeCustomerId }
  }

  // 2. Anonymous individual checkout — resolve by email.
  const email = session.customer_details?.email
  if (!email) {
    console.error(`[stripe-webhook] Session ${session.id} has no email and no client_reference_id`)
    return null
  }

  const name = session.customer_details?.name ?? null
  const programId = session.metadata?.programId ?? null
  const customerId = (session.customer as string | null) ?? null

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, organisationId: true, stripeCustomerId: true },
  })

  if (existingUser) {
    // Already a user — attach subscription to whichever scope they belong to.
    if (existingUser.organisationId) {
      const org = await prisma.organisation.findUnique({
        where: { id: existingUser.organisationId },
        select: { id: true, stripeCustomerId: true },
      })
      if (!org) return null
      return { kind: 'org', id: org.id, stripeCustomerId: org.stripeCustomerId }
    }
    return { kind: 'user', id: existingUser.id, stripeCustomerId: existingUser.stripeCustomerId }
  }

  // 3. Brand-new individual subscriber — provision a User (no org).
  return provisionIndividualUser(email, name, programId, customerId)
}

async function provisionIndividualUser(
  email: string,
  name: string | null,
  initialProgramId: string | null,
  stripeCustomerId: string | null
): Promise<Owner | null> {
  const tempPassword = crypto.randomBytes(9).toString('base64url')
  const passwordHash = await bcrypt.hash(tempPassword, 10)
  const emailLocal = email.split('@')[0] ?? 'user'

  // Single transaction — if user.create fails (e.g. email collision under race),
  // nothing is left dangling.
  const user = await prisma.$transaction(async (tx) => {
    return tx.user.create({
      data: {
        email,
        name: name ?? emailLocal,
        password: passwordHash,
        role: 'CAREGIVER',
        organisationId: null,
        mustChangePassword: true,
        active: true,
        stripeCustomerId,
        allowedProgramIds: initialProgramId ? [initialProgramId] : [],
      },
      select: { id: true, stripeCustomerId: true },
    })
  })

  await sendCredentialsEmail(email, tempPassword, name)
  return { kind: 'user', id: user.id, stripeCustomerId: user.stripeCustomerId }
}

async function sendCredentialsEmail(
  email: string,
  tempPassword: string,
  name: string | null
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.error(
      `[stripe-webhook] RESEND_API_KEY missing — cannot email credentials to ${email}.`
    )
    return
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const loginUrl = `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/login?email=${encodeURIComponent(email)}`
    const innerHtml = `
      <h2 style="color: #f5821f; margin-top: 0;">Welcome${name ? ', ' + name : ''}!</h2>
      <p>Thank you for your purchase. Your training account is ready.</p>
      <p>Sign in with:</p>
      <ul>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Temporary password:</strong> <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">${tempPassword}</code></li>
      </ul>
      <p><a class="btn" href="${loginUrl}">Sign in</a></p>
      <p class="footer">You'll be asked to change your password on first sign-in.</p>
    `
    await resend.emails.send({
      from: 'Ambitious About Autism <onboarding@resend.dev>',
      to: email,
      subject: 'Welcome — your training account is ready',
      html: wrapEmailHtml(innerHtml),
    })
  } catch (error) {
    console.error('[stripe-webhook] Failed to send credentials email:', error)
  }
}

async function resolveOwnerFromSubscriptionId(subscriptionId: string): Promise<Owner | null> {
  const org = await prisma.organisation.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
    select: { id: true },
  })
  if (org) return { kind: 'org', id: org.id, stripeCustomerId: null }
  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
    select: { id: true },
  })
  if (user) return { kind: 'user', id: user.id, stripeCustomerId: null }
  return null
}

// ─── Event handlers ───────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const owner = await resolveOwnerFromSession(session)
  if (!owner) return

  const customerId = (session.customer as string | null) ?? null
  if (customerId && !owner.stripeCustomerId) {
    if (owner.kind === 'org') {
      await prisma.organisation.update({
        where: { id: owner.id },
        data: { stripeCustomerId: customerId },
      })
    } else {
      await prisma.user.update({
        where: { id: owner.id },
        data: { stripeCustomerId: customerId },
      })
    }
  }

  if (session.mode === 'payment') {
    await handlePurchaseFulfilment(session, owner)
  } else if (session.mode === 'subscription') {
    await handleSubscriptionFulfilment(session, owner)
  }
}

async function handlePurchaseFulfilment(
  session: Stripe.Checkout.Session,
  owner: Owner
): Promise<void> {
  const programId = session.metadata?.programId
  if (!programId) {
    console.error(`[stripe-webhook] Purchase session ${session.id} missing programId metadata`)
    return
  }

  const amount = session.amount_total ?? 0
  const currency = session.currency ?? 'gbp'

  if (owner.kind === 'org') {
    await prisma.purchase.upsert({
      where: { stripeCheckoutSessionId: session.id },
      update: {
        status: 'PAID',
        stripePaymentIntentId: (session.payment_intent as string) ?? null,
      },
      create: {
        organisationId: owner.id,
        programId,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: (session.payment_intent as string) ?? null,
        amount,
        currency,
        status: 'PAID',
      },
    })

    const org = await prisma.organisation.findUnique({
      where: { id: owner.id },
      select: { allowedProgramIds: true },
    })
    if (org && !org.allowedProgramIds.includes(programId)) {
      await prisma.organisation.update({
        where: { id: owner.id },
        data: { allowedProgramIds: [...org.allowedProgramIds, programId] },
      })
    }
    return
  }

  // Individual purchase — record purchase against the user, append to user.allowedProgramIds.
  await prisma.purchase.upsert({
    where: { stripeCheckoutSessionId: session.id },
    update: {
      status: 'PAID',
      stripePaymentIntentId: (session.payment_intent as string) ?? null,
    },
    create: {
      userId: owner.id,
      organisationId: null,
      programId,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: (session.payment_intent as string) ?? null,
      amount,
      currency,
      status: 'PAID',
    },
  })

  const user = await prisma.user.findUnique({
    where: { id: owner.id },
    select: { allowedProgramIds: true },
  })
  if (user && !user.allowedProgramIds.includes(programId)) {
    await prisma.user.update({
      where: { id: owner.id },
      data: { allowedProgramIds: [...user.allowedProgramIds, programId] },
    })
  }
}

async function handleSubscriptionFulfilment(
  session: Stripe.Checkout.Session,
  owner: Owner
): Promise<void> {
  const subscriptionId = session.subscription as string | null
  if (!subscriptionId) {
    console.error(`[stripe-webhook] Subscription session ${session.id} missing subscription id`)
    return
  }
  const stripe = requireStripe()
  const sub = await stripe.subscriptions.retrieve(subscriptionId)
  await syncSubscriptionToOwner(owner, sub)
}

async function handleSubscriptionChange(sub: Stripe.Subscription): Promise<void> {
  const owner = await resolveOwnerFromSubscriptionId(sub.id)
  if (!owner) return
  await syncSubscriptionToOwner(owner, sub)
}

// current_period_end moved from the subscription to each item in API 2026-03-25.dahlia.
function getSubscriptionPeriodEnd(sub: Stripe.Subscription): Date | null {
  const itemEnd = sub.items.data[0]?.current_period_end
  if (typeof itemEnd === 'number') return new Date(itemEnd * 1000)
  return null
}

// invoice.subscription moved to invoice.parent.subscription_details.subscription in newer API versions.
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const parent = (invoice as unknown as { parent?: { subscription_details?: { subscription?: string | { id: string } | null } } }).parent
  const raw = parent?.subscription_details?.subscription
  if (!raw) return null
  if (typeof raw === 'string') return raw
  if (typeof raw === 'object' && raw && 'id' in raw) return raw.id
  return null
}

async function syncSubscriptionToOwner(owner: Owner, sub: Stripe.Subscription): Promise<void> {
  const data = {
    subscriptionStatus: mapStripeSubscriptionStatus(sub.status),
    stripeSubscriptionId: sub.id,
    subscriptionCurrentPeriodEnd: getSubscriptionPeriodEnd(sub),
    subscriptionPriceId: sub.items.data[0]?.price.id ?? null,
  }
  if (owner.kind === 'org') {
    await prisma.organisation.update({ where: { id: owner.id }, data })
  } else {
    await prisma.user.update({ where: { id: owner.id }, data })
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = getInvoiceSubscriptionId(invoice)
  if (!subscriptionId) return
  const owner = await resolveOwnerFromSubscriptionId(subscriptionId)
  if (!owner) return
  if (owner.kind === 'org') {
    await prisma.organisation.update({
      where: { id: owner.id },
      data: { subscriptionStatus: 'PAST_DUE' },
    })
  } else {
    await prisma.user.update({
      where: { id: owner.id },
      data: { subscriptionStatus: 'PAST_DUE' },
    })
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = getInvoiceSubscriptionId(invoice)
  if (!subscriptionId) return
  const stripe = requireStripe()
  const sub = await stripe.subscriptions.retrieve(subscriptionId)
  await handleSubscriptionChange(sub)
}
