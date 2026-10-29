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

import { createPrismaClient, prisma } from '../prisma'

beforeEach(() => {
  PrismaPg.mockClear()
  PrismaClient.mockClear()
  delete (globalThis as { prisma?: unknown }).prisma
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

describe('missing DATABASE_URL', () => {
  it('throws a clear error instead of letting pg fall back to localhost', () => {
    delete process.env.DATABASE_URL
    expect(() => createPrismaClient()).toThrow(/DATABASE_URL is not set/)
    expect(PrismaPg).not.toHaveBeenCalled()
  })

  it('does not fail on import: the shared client is created on first use', () => {
    delete process.env.DATABASE_URL
    // Importing the module (done above) built nothing.
    expect(PrismaClient).not.toHaveBeenCalled()
    expect(() => prisma.user).toThrow(/DATABASE_URL is not set/)
  })

  it('creates the shared client once and forwards calls to it', () => {
    process.env.DATABASE_URL = 'postgresql://pooled'
    const fakeClient = { user: { marker: true }, $disconnect: vi.fn(function (this: unknown) { return this }) }
    PrismaClient.mockImplementationOnce(function () { return fakeClient })

    expect(prisma.user).toBe(fakeClient.user)
    expect(prisma.$disconnect()).toBe(fakeClient) // methods stay bound to the real client
    void prisma.user
    expect(PrismaClient).toHaveBeenCalledTimes(1)
  })
})
