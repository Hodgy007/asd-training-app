import { describe, it, expect, vi, beforeEach } from 'vitest'
import type Stripe from 'stripe'
import { Prisma } from '@prisma/client'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    stripeEvent: { create: vi.fn() },
    organisation: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    purchase: { upsert: vi.fn() },
  },
}))

vi.mock('@/lib/stripe', () => ({
  requireStripe: vi.fn(() => ({
    subscriptions: { retrieve: vi.fn() },
  })),
}))

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: vi.fn().mockResolvedValue({}) },
  })),
}))

import { prisma } from '@/lib/prisma'
import { handleStripeEvent, mapStripeSubscriptionStatus } from '../stripe-webhook'

describe('mapStripeSubscriptionStatus', () => {
  it('maps all eight Stripe statuses to the correct Prisma enum', () => {
    expect(mapStripeSubscriptionStatus('active')).toBe('ACTIVE')
    expect(mapStripeSubscriptionStatus('trialing')).toBe('TRIALING')
    expect(mapStripeSubscriptionStatus('past_due')).toBe('PAST_DUE')
    expect(mapStripeSubscriptionStatus('canceled')).toBe('CANCELED')
    expect(mapStripeSubscriptionStatus('unpaid')).toBe('UNPAID')
    expect(mapStripeSubscriptionStatus('incomplete')).toBe('NONE')
    expect(mapStripeSubscriptionStatus('incomplete_expired')).toBe('CANCELED')
    expect(mapStripeSubscriptionStatus('paused')).toBe('PAST_DUE')
  })
})

describe('handleStripeEvent idempotency', () => {
  beforeEach(() => {
    vi.mocked(prisma.stripeEvent.create).mockReset()
    vi.mocked(prisma.organisation.findFirst).mockReset()
    vi.mocked(prisma.organisation.update).mockReset()
    vi.mocked(prisma.organisation.updateMany).mockReset()
    vi.mocked(prisma.user.findFirst).mockReset()
    vi.mocked(prisma.user.updateMany).mockReset()
  })

  it('no-ops when the event id has already been recorded (P2002 on create)', async () => {
    // The new contract: insert StripeEvent FIRST. A duplicate delivery hits the
    // unique constraint and we abort before running side effects.
    vi.mocked(prisma.stripeEvent.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.x',
      })
    )

    const event = {
      id: 'evt_123',
      type: 'customer.subscription.updated',
      created: Math.floor(Date.now() / 1000),
      data: { object: { id: 'sub_abc' } as Stripe.Subscription },
    } as Stripe.Event

    await handleStripeEvent(event)

    expect(prisma.organisation.findFirst).not.toHaveBeenCalled()
    expect(prisma.organisation.update).not.toHaveBeenCalled()
    expect(prisma.organisation.updateMany).not.toHaveBeenCalled()
  })

  it('processes a new event and uses updateMany with a staleness guard', async () => {
    vi.mocked(prisma.stripeEvent.create).mockResolvedValue({} as never)
    vi.mocked(prisma.organisation.findFirst).mockResolvedValue({ id: 'org_1' } as never)
    vi.mocked(prisma.organisation.updateMany).mockResolvedValue({ count: 1 } as never)
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null)

    const eventCreatedSec = Math.floor(Date.now() / 1000)
    const event = {
      id: 'evt_new',
      type: 'invoice.payment_failed',
      created: eventCreatedSec,
      data: {
        object: {
          parent: {
            subscription_details: { subscription: 'sub_xyz' },
          },
        },
      },
    } as unknown as Stripe.Event

    await handleStripeEvent(event)

    expect(prisma.stripeEvent.create).toHaveBeenCalledWith({
      data: { id: 'evt_new', type: 'invoice.payment_failed' },
    })
    expect(prisma.organisation.findFirst).toHaveBeenCalledWith({
      where: { stripeSubscriptionId: 'sub_xyz' },
      select: { id: true },
    })
    // Status update goes through updateMany with the staleness guard.
    expect(prisma.organisation.updateMany).toHaveBeenCalledTimes(1)
    const callArg = vi.mocked(prisma.organisation.updateMany).mock.calls[0]![0]
    expect(callArg.where).toMatchObject({ id: 'org_1' })
    expect(callArg.data).toMatchObject({
      subscriptionStatus: 'PAST_DUE',
    })
  })

  it('ignores unknown event types but still records the id', async () => {
    vi.mocked(prisma.stripeEvent.create).mockResolvedValue({} as never)

    const event = {
      id: 'evt_unknown',
      type: 'charge.dispute.created',
      created: Math.floor(Date.now() / 1000),
      data: { object: {} },
    } as unknown as Stripe.Event

    await handleStripeEvent(event)

    expect(prisma.organisation.findFirst).not.toHaveBeenCalled()
    expect(prisma.stripeEvent.create).toHaveBeenCalledWith({
      data: { id: 'evt_unknown', type: 'charge.dispute.created' },
    })
  })
})
