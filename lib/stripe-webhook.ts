import crypto from 'crypto'
import type Stripe from 'stripe'
import type { SubscriptionStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { Resend } from 'resend'
import { prisma } from './prisma'
import { requireStripe } from './stripe'

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

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const org = await resolveOrgFromSession(session)
  if (!org) return

  const customerId = (session.customer as string | null) ?? null
  if (customerId && !org.stripeCustomerId) {
    await prisma.organisation.update({
      where: { id: org.id },
      data: { stripeCustomerId: customerId },
    })
  }

  if (session.mode === 'payment') {
    await handlePurchaseFulfilment(session, org.id)
  } else if (session.mode === 'subscription') {
    await handleSubscriptionFulfilment(session, org.id)
  }
}

async function resolveOrgFromSession(
  session: Stripe.Checkout.Session
): Promise<{ id: string; stripeCustomerId: string | null } | null> {
  if (session.client_reference_id) {
    return prisma.organisation.findUnique({
      where: { id: session.client_reference_id },
      select: { id: true, stripeCustomerId: true },
    })
  }

  const email = session.customer_details?.email
  if (!email) {
    console.error(`[stripe-webhook] Session ${session.id} has no email and no client_reference_id`)
    return null
  }

  const name = session.customer_details?.name ?? null
  const programId = session.metadata?.programId ?? null

  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: {
      organisation: {
        select: { id: true, isPersonal: true, stripeCustomerId: true },
      },
    },
  })

  if (existingUser?.organisation) {
    if (existingUser.organisation.isPersonal) {
      return {
        id: existingUser.organisation.id,
        stripeCustomerId: existingUser.organisation.stripeCustomerId,
      }
    }
    console.error(
      `[stripe-webhook] Refusing to attach anonymous purchase for ${email} — user already in shared org ${existingUser.organisation.id}. Manual follow-up required.`
    )
    return null
  }

  const customerId = (session.customer as string | null) ?? null
  return provisionPersonalAccount(email, name, programId, customerId)
}

async function provisionPersonalAccount(
  email: string,
  name: string | null,
  initialProgramId: string | null,
  stripeCustomerId: string | null
): Promise<{ id: string; stripeCustomerId: string | null }> {
  const tempPassword = crypto.randomBytes(9).toString('base64url')
  const passwordHash = await bcrypt.hash(tempPassword, 10)

  const emailLocal = email.split('@')[0] ?? 'user'
  const sluggedLocal = emailLocal.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'user'
  const slug = `personal-${sluggedLocal}-${crypto.randomBytes(3).toString('hex')}`

  const org = await prisma.organisation.create({
    data: {
      name: `${email} (Personal)`,
      slug,
      orgType: 'PERSONAL',
      isPersonal: true,
      allowedRoles: ['CAREGIVER', 'STUDENT'],
      allowedProgramIds: initialProgramId ? [initialProgramId] : [],
      stripeCustomerId,
    },
    select: { id: true, stripeCustomerId: true },
  })

  await prisma.user.create({
    data: {
      email,
      name: name ?? emailLocal,
      password: passwordHash,
      role: 'CAREGIVER',
      organisationId: org.id,
      mustChangePassword: true,
      active: true,
    },
  })

  await sendCredentialsEmail(email, tempPassword, name)
  return org
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
    await resend.emails.send({
      from: 'Ambitious About Autism <onboarding@resend.dev>',
      to: email,
      subject: 'Welcome — your training account is ready',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #f5821f;">Welcome${name ? ', ' + name : ''}!</h2>
          <p>Thank you for your purchase. Your training account is ready.</p>
          <p>Sign in with:</p>
          <ul>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Temporary password:</strong> <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">${tempPassword}</code></li>
          </ul>
          <p>
            <a href="${loginUrl}" style="display:inline-block;background:#f5821f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
              Sign in
            </a>
          </p>
          <p style="color:#6b7280;font-size:14px;">You'll be asked to change your password on first sign-in.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
          <p style="color:#9ca3af;font-size:12px;">Ambitious About Autism — Not a diagnostic tool</p>
        </div>
      `,
    })
  } catch (error) {
    console.error('[stripe-webhook] Failed to send credentials email:', error)
  }
}

async function handlePurchaseFulfilment(
  session: Stripe.Checkout.Session,
  orgId: string
): Promise<void> {
  const programId = session.metadata?.programId
  if (!programId) {
    console.error(`[stripe-webhook] Purchase session ${session.id} missing programId metadata`)
    return
  }

  const amount = session.amount_total ?? 0
  const currency = session.currency ?? 'gbp'

  await prisma.purchase.upsert({
    where: { stripeCheckoutSessionId: session.id },
    update: {
      status: 'PAID',
      stripePaymentIntentId: (session.payment_intent as string) ?? null,
    },
    create: {
      organisationId: orgId,
      programId,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: (session.payment_intent as string) ?? null,
      amount,
      currency,
      status: 'PAID',
    },
  })

  const org = await prisma.organisation.findUnique({
    where: { id: orgId },
    select: { allowedProgramIds: true },
  })
  if (org && !org.allowedProgramIds.includes(programId)) {
    await prisma.organisation.update({
      where: { id: orgId },
      data: { allowedProgramIds: [...org.allowedProgramIds, programId] },
    })
  }
}

async function handleSubscriptionFulfilment(
  session: Stripe.Checkout.Session,
  orgId: string
): Promise<void> {
  const subscriptionId = session.subscription as string | null
  if (!subscriptionId) {
    console.error(`[stripe-webhook] Subscription session ${session.id} missing subscription id`)
    return
  }
  const stripe = requireStripe()
  const sub = await stripe.subscriptions.retrieve(subscriptionId)
  await syncSubscriptionToOrg(orgId, sub)
}

async function handleSubscriptionChange(sub: Stripe.Subscription): Promise<void> {
  const org = await prisma.organisation.findFirst({
    where: { stripeSubscriptionId: sub.id },
    select: { id: true },
  })
  if (!org) return
  await syncSubscriptionToOrg(org.id, sub)
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

async function syncSubscriptionToOrg(
  orgId: string,
  sub: Stripe.Subscription
): Promise<void> {
  await prisma.organisation.update({
    where: { id: orgId },
    data: {
      subscriptionStatus: mapStripeSubscriptionStatus(sub.status),
      stripeSubscriptionId: sub.id,
      subscriptionCurrentPeriodEnd: getSubscriptionPeriodEnd(sub),
      subscriptionPriceId: sub.items.data[0]?.price.id ?? null,
    },
  })
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = getInvoiceSubscriptionId(invoice)
  if (!subscriptionId) return
  const org = await prisma.organisation.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
    select: { id: true },
  })
  if (!org) return
  await prisma.organisation.update({
    where: { id: org.id },
    data: { subscriptionStatus: 'PAST_DUE' },
  })
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = getInvoiceSubscriptionId(invoice)
  if (!subscriptionId) return
  const stripe = requireStripe()
  const sub = await stripe.subscriptions.retrieve(subscriptionId)
  await handleSubscriptionChange(sub)
}
