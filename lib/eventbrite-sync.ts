/**
 * Higher-level operations that pull Eventbrite data into our DB. Eventbrite
 * events are modelled as Cohort organisations (orgType=COHORT) with a
 * 1:1 CohortEventbriteEvent metadata row. Bookings become CohortMembership
 * rows so the existing cohort UI just works.
 *
 *   - upsertCohortFromEvent(eventId)         → create/refresh cohort + metadata
 *   - syncAttendeesAsCohortMembers(eventId)  → backfill / "Sync now" button
 *   - processOrder(orderId)                  → react to order.* webhooks
 *   - processEventUpdate(eventId)            → react to event.updated
 *   - processEventUnpublish(eventId)         → react to event.unpublished
 *   - ensureWebhookRegistered(baseUrl)       → idempotent webhook setup
 *   - revokeWebhookIfRegistered()            → cleanup on disable / rotate
 *
 * All Eventbrite REST is delegated to lib/eventbrite.ts; this module is the
 * sole writer to CohortEventbriteEvent and to CohortMembership rows whose
 * `source = 'EVENTBRITE'`.
 */

import crypto from 'crypto'
import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'
import {
  fetchEvent,
  fetchOrder,
  fetchAllAttendees,
  registerWebhook,
  deleteWebhook,
  requireEventbriteToken,
  getEventbriteConfig,
  mapEventStatus,
  formatPriceText,
  isSoldOut,
  pickImageUrl,
  pickVenue,
  DEFAULT_WEBHOOK_ACTIONS,
  type EventbriteEvent,
  type EventbriteAttendee,
} from './eventbrite'
import { hashResetToken } from './reset-token'
import { renderWorkshopBookingWelcomeEmail } from './email-templates/workshop-booking'
import { logger, errMeta } from './logger'
import { getPublicToolkitOrgId } from './toolkit-registration'

type EmailMatchPolicy = 'STRICT' | 'AUTO_INVITE' | 'CLAIM_LINK'

interface EventContext {
  cohortId: string
  name: string
  startsAt: Date
  ticketUrl: string
}

// ─── Cohort upsert from Eventbrite event ────────────────────────────────────

export async function upsertCohortFromEvent(eventId: string) {
  const token = await requireEventbriteToken()
  const event = await fetchEvent(eventId, token)
  return writeCohortFromEvent(event)
}

async function writeCohortFromEvent(event: EventbriteEvent) {
  const eventMetadata = {
    name: event.name.text,
    description: event.description?.text ?? null,
    imageUrl: pickImageUrl(event),
    startsAt: new Date(event.start.utc),
    endsAt: event.end ? new Date(event.end.utc) : null,
    venue: pickVenue(event),
    ticketUrl: event.url,
    priceText: formatPriceText(event),
    capacity: event.capacity ?? null,
    soldOut: isSoldOut(event),
    status: mapEventStatus(event.status),
    lastSyncedAt: new Date(),
  }

  const existing = await prisma.cohortEventbriteEvent.findUnique({
    where: { externalEventId: event.id },
    include: { cohort: { select: { id: true, lifecycleStatus: true } } },
  })

  if (existing) {
    // Refresh cached metadata + keep the cohort name in sync with Eventbrite.
    const [updated] = await prisma.$transaction([
      prisma.cohortEventbriteEvent.update({
        where: { id: existing.id },
        data: eventMetadata,
      }),
      prisma.organisation.update({
        where: { id: existing.cohortId },
        data: { name: event.name.text },
      }),
    ])
    return { cohortId: existing.cohortId, eventbriteEvent: updated, created: false }
  }

  // Brand new — create the cohort + the metadata row in one transaction.
  const baseSlug = slugify(event.name.text) || 'eventbrite'
  const slug = `cohort-eb-${baseSlug}-${event.id.slice(-6)}`

  const cohort = await prisma.organisation.create({
    data: {
      name: event.name.text,
      slug,
      orgType: 'COHORT',
      organisationType: 'EDUCATION',
      allowedProgramIds: [],
      allowedRoles: ['STUDENT', 'CAREGIVER', 'CAREER_DEV_OFFICER', 'INTERN', 'EMPLOYEE'],
      active: true,
      lifecycleStatus: 'ACTIVE',
      eventbriteEvent: {
        create: {
          ...eventMetadata,
          externalEventId: event.id,
        },
      },
    },
    include: { eventbriteEvent: true },
  })

  return {
    cohortId: cohort.id,
    eventbriteEvent: cohort.eventbriteEvent!,
    created: true,
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60)
}

// ─── Attendee → CohortMembership sync ───────────────────────────────────────

interface SyncResult {
  matched: number
  invited: number
  skipped: number
  unmatchedEmails: string[]
}

export async function syncAttendeesAsCohortMembers(eventId: string): Promise<SyncResult> {
  const token = await requireEventbriteToken()
  const config = await getEventbriteConfig()
  const policy = (config?.emailMatchPolicy ?? 'AUTO_INVITE') as EmailMatchPolicy

  const link = await prisma.cohortEventbriteEvent.findUnique({
    where: { externalEventId: eventId },
    select: {
      cohortId: true,
      name: true,
      startsAt: true,
      ticketUrl: true,
    },
  })
  if (!link) {
    throw new Error(`No cohort linked to Eventbrite event ${eventId}. Add it first.`)
  }
  const ctx: EventContext = {
    cohortId: link.cohortId,
    name: link.name,
    startsAt: link.startsAt,
    ticketUrl: link.ticketUrl,
  }

  const attendees = await fetchAllAttendees(eventId, token)
  const result: SyncResult = { matched: 0, invited: 0, skipped: 0, unmatchedEmails: [] }

  for (const attendee of attendees) {
    const summary = await applyAttendee(attendee, policy, ctx)
    if (summary === 'matched') result.matched++
    else if (summary === 'invited') result.invited++
    else if (summary === 'skipped') {
      result.skipped++
      result.unmatchedEmails.push(attendee.profile.email)
    }
  }

  await prisma.charityEventbriteConfig.updateMany({
    data: { lastSyncAt: new Date() },
  })

  return result
}

/**
 * Apply a single Eventbrite attendee to the cohort. Cancellations/refunds
 * remove the membership row; otherwise we upsert (per-policy email match).
 */
async function applyAttendee(
  attendee: EventbriteAttendee,
  policy: EmailMatchPolicy,
  ctx: EventContext,
): Promise<'matched' | 'invited' | 'skipped' | 'removed'> {
  if (attendee.cancelled || attendee.refunded || attendee.status === 'Deleted') {
    await prisma.cohortMembership.deleteMany({
      where: { externalAttendeeId: attendee.id },
    })
    return 'removed'
  }

  const email = attendee.profile.email.trim().toLowerCase()
  const name = attendee.profile.name?.trim() || null
  const userResult = await resolveUserForBooking(email, name, policy, ctx)
  if (!userResult) return 'skipped'

  await prisma.cohortMembership.upsert({
    where: { userId_cohortId: { userId: userResult.userId, cohortId: ctx.cohortId } },
    create: {
      userId: userResult.userId,
      cohortId: ctx.cohortId,
      status: 'ACTIVE',
      source: 'EVENTBRITE',
      externalOrderId: attendee.order_id,
      externalAttendeeId: attendee.id,
    },
    update: {
      status: 'ACTIVE',
      leftAt: null,
      source: 'EVENTBRITE',
      externalOrderId: attendee.order_id,
      externalAttendeeId: attendee.id,
    },
  })

  return userResult.created ? 'invited' : 'matched'
}

async function resolveUserForBooking(
  email: string,
  name: string | null,
  policy: EmailMatchPolicy,
  ctx: EventContext,
): Promise<{ userId: string; created: boolean } | null> {
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })
  if (existing) return { userId: existing.id, created: false }

  if (policy === 'STRICT') return null

  if (policy === 'AUTO_INVITE') {
    const orgId = await getPublicToolkitOrgId()
    if (!orgId) {
      logger.warn('eventbrite.sync.no_public_toolkit_org', { email })
      return null
    }
    const created = await prisma.user.create({
      data: {
        email,
        name,
        password: null,
        role: 'STUDENT',
        organisationId: orgId,
        active: true,
        invitedAt: new Date(),
      },
      select: { id: true },
    })
    await sendWorkshopWelcomeEmail(email, name, ctx).catch((err) =>
      logger.error('eventbrite.sync.welcome_email_failed', { email, ...errMeta(err) }),
    )
    return { userId: created.id, created: true }
  }

  if (policy === 'CLAIM_LINK') {
    await sendWorkshopClaimEmail(email, name, ctx).catch((err) =>
      logger.error('eventbrite.sync.claim_email_failed', { email, ...errMeta(err) }),
    )
    return null
  }

  return null
}

async function sendWorkshopWelcomeEmail(
  email: string,
  name: string | null,
  ctx: EventContext,
) {
  if (!process.env.RESEND_API_KEY) return
  const rawToken = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { email } }),
    prisma.passwordResetToken.create({
      data: { email, token: hashResetToken(rawToken), expires },
    }),
  ])
  const welcomeUrl = `${process.env.NEXTAUTH_URL ?? ''}/welcome?token=${rawToken}`
  const { subject, html, text } = renderWorkshopBookingWelcomeEmail({
    name,
    workshopName: ctx.name,
    workshopDate: ctx.startsAt,
    welcomeUrl,
    ticketUrl: ctx.ticketUrl,
  })
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: 'Ambitious About Autism <onboarding@resend.dev>',
    to: email,
    subject,
    html,
    text,
  })
}

async function sendWorkshopClaimEmail(
  email: string,
  name: string | null,
  ctx: EventContext,
) {
  if (!process.env.RESEND_API_KEY) return
  const claimUrl = `${process.env.NEXTAUTH_URL ?? ''}/register?email=${encodeURIComponent(email)}`
  const { subject, html, text } = renderWorkshopBookingWelcomeEmail({
    name,
    workshopName: ctx.name,
    workshopDate: ctx.startsAt,
    welcomeUrl: claimUrl,
    ticketUrl: ctx.ticketUrl,
  })
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: 'Ambitious About Autism <onboarding@resend.dev>',
    to: email,
    subject,
    html,
    text,
  })
}

// ─── Webhook event handlers ─────────────────────────────────────────────────

export async function processOrder(orderId: string) {
  const token = await requireEventbriteToken()
  const order = await fetchOrder(orderId, token)
  const link = await prisma.cohortEventbriteEvent.findUnique({
    where: { externalEventId: order.event_id },
    select: { cohortId: true, name: true, startsAt: true, ticketUrl: true },
  })
  if (!link) {
    // Unknown event — admin hasn't added this cohort. Ignore silently.
    logger.info('eventbrite.webhook.unknown_event', { orderId, eventId: order.event_id })
    return { processed: 0 }
  }

  const config = await getEventbriteConfig()
  const policy = (config?.emailMatchPolicy ?? 'AUTO_INVITE') as EmailMatchPolicy
  const ctx: EventContext = {
    cohortId: link.cohortId,
    name: link.name,
    startsAt: link.startsAt,
    ticketUrl: link.ticketUrl,
  }

  const attendees = order.attendees ?? []
  let processed = 0
  for (const attendee of attendees) {
    await applyAttendee(attendee, policy, ctx)
    processed++
  }
  return { processed }
}

export async function processEventUpdate(eventId: string) {
  const tracked = await prisma.cohortEventbriteEvent.findUnique({
    where: { externalEventId: eventId },
    select: { id: true },
  })
  if (!tracked) return { skipped: true }
  await upsertCohortFromEvent(eventId)
  return { skipped: false }
}

export async function processEventUnpublish(eventId: string) {
  // Hide from the catalogue + archive the cohort. Memberships remain so
  // attendance history is preserved.
  const link = await prisma.cohortEventbriteEvent.findUnique({
    where: { externalEventId: eventId },
    select: { id: true, cohortId: true },
  })
  if (!link) return
  await prisma.$transaction([
    prisma.cohortEventbriteEvent.update({
      where: { id: link.id },
      data: { purchasable: false, status: 'CANCELLED' },
    }),
    prisma.organisation.update({
      where: { id: link.cohortId },
      data: { lifecycleStatus: 'ARCHIVED', archivedAt: new Date() },
    }),
  ])
}

// ─── Webhook subscription lifecycle ─────────────────────────────────────────

export async function ensureWebhookRegistered(baseUrl: string): Promise<string | null> {
  const config = await getEventbriteConfig()
  if (!config?.privateToken) {
    throw new Error('Cannot register webhook without a Private Token.')
  }
  if (config.webhookId) return config.webhookId

  const endpointUrl = `${baseUrl.replace(/\/$/, '')}/api/webhooks/eventbrite`
  const webhook = await registerWebhook(
    endpointUrl,
    [...DEFAULT_WEBHOOK_ACTIONS],
    config.privateToken,
  )

  await prisma.charityEventbriteConfig.update({
    where: { id: config.id },
    data: { webhookId: webhook.id },
  })

  return webhook.id
}

export async function revokeWebhookIfRegistered(): Promise<void> {
  const config = await getEventbriteConfig()
  if (!config?.webhookId || !config.privateToken) return
  try {
    await deleteWebhook(config.webhookId, config.privateToken)
  } catch (err) {
    logger.warn('eventbrite.webhook.revoke_failed', errMeta(err))
  }
  await prisma.charityEventbriteConfig.update({
    where: { id: config.id },
    data: { webhookId: null },
  })
}
