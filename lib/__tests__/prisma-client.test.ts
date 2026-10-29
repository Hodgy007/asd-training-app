// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { PrismaPg, PrismaClient } = vi.hoisted(() => ({
  PrismaPg: vi.fn(function (this: Record<string, unknown>, opts: unknown) {
    this.opts = opts
  }),
  PrismaClient: vi.fn(function (this: Record<string, unknown>, opts: unknown) {
    this.opts = opts
  }),
}))
vi.mock('@prisma/adapter-pg', () => ({ PrismaPg }))
vi.mock('../generated/prisma/client', () => ({ PrismaClient }))

import { createPrismaClient } from '../prisma'

beforeEach(() => {
  PrismaPg.mockClear()
  PrismaClient.mockClear()
})

describe('createPrismaClient', () => {
  it('builds the client on the pg driver adapter with a connect timeout', () => {
    createPrismaClient('postgresql://u:p@host:6543/db?sslmode=require')
    expect(PrismaPg).toHaveBeenCalledWith({
      connectionString: 'postgresql://u:p@host:6543/db?sslmode=require',
      connectionTimeoutMillis: 5_000,
    })
    const clientOpts = PrismaClient.mock.calls[0][0] as { adapter: unknown }
    expect(clientOpts.adapter).toBe(PrismaPg.mock.instances[0])
  })

  it('defaults to DATABASE_URL (the pooled connection)', () => {
    process.env.DATABASE_URL = 'postgresql://pooled'
    createPrismaClient()
    expect(PrismaPg).toHaveBeenCalledWith(expect.objectContaining({ connectionString: 'postgresql://pooled' }))
  })
})
