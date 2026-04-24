import { describe, expect, it } from 'vitest'
import { subscriptionGrantsAccess } from '@/lib/modules'

const DAY = 24 * 60 * 60 * 1000
const NOW = new Date('2026-04-23T12:00:00Z')

describe('subscriptionGrantsAccess', () => {
  it('grants access when status is ACTIVE', () => {
    expect(subscriptionGrantsAccess('ACTIVE', null, NOW)).toBe(true)
  })

  it('grants access when status is TRIALING', () => {
    expect(subscriptionGrantsAccess('TRIALING', null, NOW)).toBe(true)
  })

  it('grants access when PAST_DUE and still within the 3-day grace period', () => {
    const periodEnd = new Date(NOW.getTime() - 2 * DAY)
    expect(subscriptionGrantsAccess('PAST_DUE', periodEnd, NOW)).toBe(true)
  })

  it('revokes access when PAST_DUE more than 3 days past the period end', () => {
    const periodEnd = new Date(NOW.getTime() - 4 * DAY)
    expect(subscriptionGrantsAccess('PAST_DUE', periodEnd, NOW)).toBe(false)
  })

  it('revokes access when PAST_DUE with no period end on record', () => {
    expect(subscriptionGrantsAccess('PAST_DUE', null, NOW)).toBe(false)
  })

  it('revokes access when CANCELED regardless of period end', () => {
    const periodEnd = new Date(NOW.getTime() + 30 * DAY)
    expect(subscriptionGrantsAccess('CANCELED', periodEnd, NOW)).toBe(false)
  })

  it('revokes access when UNPAID', () => {
    expect(subscriptionGrantsAccess('UNPAID', null, NOW)).toBe(false)
  })

  it('revokes access when status is NONE', () => {
    expect(subscriptionGrantsAccess('NONE', null, NOW)).toBe(false)
  })

  it('revokes access when status is null/undefined', () => {
    expect(subscriptionGrantsAccess(null, null, NOW)).toBe(false)
    expect(subscriptionGrantsAccess(undefined, null, NOW)).toBe(false)
  })
})
