import { describe, it, expect, vi, beforeEach } from 'vitest'
import type Stripe from 'stripe'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    stripeEvent: { findUnique: vi.fn(), create: vi.fn() },
    organisation: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    user: { findUnique: vi.fn(), create: vi.fn() },
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
    vi.mocked(prisma.stripeEvent.findUnique).mockReset()
    vi.mocked(prisma.stripeEvent.create).mockReset()
    vi.mocked(prisma.organisation.findFirst).mockReset()
    vi.mocked(prisma.organisation.update).mockReset()
  })

  it('no-ops when the event id has already been recorded', async () => {
    vi.mocked(prisma.stripeEvent.findUnique).mockResolvedValue({
      id: 'evt_123',
      type: 'customer.subscription.updated',
      createdAt: new Date(),
    } as never)

    const event = {
      id: 'evt_123',
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub_abc' } as Stripe.Subscription },
    } as Stripe.Event

    await handleStripeEvent(event)

    expect(prisma.organisation.findFirst).not.toHaveBeenCalled()
    expect(prisma.organisation.update).not.toHaveBeenCalled()
    expect(prisma.stripeEvent.create).not.toHaveBeenCalled()
  })

  it('processes a new event and records it for future idempotency', async () => {
    vi.mocked(prisma.stripeEvent.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.organisation.findFirst).mockResolvedValue({ id: 'org_1' } as never)
    vi.mocked(prisma.organisation.update).mockResolvedValue({} as never)
    vi.mocked(prisma.stripeEvent.create).mockResolvedValue({} as never)

    const event = {
      id: 'evt_new',
      type: 'invoice.payment_failed',
      data: {
        object: {
          parent: {
            subscription_details: { subscription: 'sub_xyz' },
          },
        },
      },
    } as unknown as Stripe.Event

    await handleStripeEvent(event)

    expect(prisma.organisation.findFirst).toHaveBeenCalledWith({
      where: { stripeSubscriptionId: 'sub_xyz' },
      select: { id: true },
    })
    expect(prisma.organisation.update).toHaveBeenCalledWith({
      where: { id: 'org_1' },
      data: { subscriptionStatus: 'PAST_DUE' },
    })
    expect(prisma.stripeEvent.create).toHaveBeenCalledWith({
      data: { id: 'evt_new', type: 'invoice.payment_failed' },
    })
  })

  it('ignores unknown event types but still records the id', async () => {
    vi.mocked(prisma.stripeEvent.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.stripeEvent.create).mockResolvedValue({} as never)

    const event = {
      id: 'evt_unknown',
      type: 'charge.dispute.created',
      data: { object: {} },
    } as unknown as Stripe.Event

    await handleStripeEvent(event)

    expect(prisma.organisation.findFirst).not.toHaveBeenCalled()
    expect(prisma.stripeEvent.create).toHaveBeenCalledWith({
      data: { id: 'evt_unknown', type: 'charge.dispute.created' },
    })
  })
})
