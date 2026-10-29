import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma/client'

/**
 * Build a Prisma client on the `pg` driver adapter (required since Prisma 7).
 *
 * The app uses the pooled `DATABASE_URL` (Neon pooler, port 6543). One-off
 * scripts and seeds call this too, optionally passing `DIRECT_URL`.
 *
 * Throws when no connection string is available: without one, `pg` silently
 * falls back to localhost:5432 and the failure surfaces as a confusing
 * ECONNREFUSED instead of a missing environment variable.
 */
export function createPrismaClient(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set, so Prisma has no database to connect to. ' +
        'Add it to .env.local (local dev), .env (CLI scripts), or the Vercel project settings.',
    )
  }
  const adapter = new PrismaPg({
    connectionString,
    // Prisma 6's engine gave up connecting after 5s; `pg` waits forever by
    // default, which would hang a request if Neon is unreachable.
    connectionTimeoutMillis: 5_000,
  })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }
  return globalForPrisma.prisma
}

/**
 * The shared client, created on first use rather than at import. Plenty of
 * modules (and tests, and `next build`'s page-data step) import this without
 * ever querying, and they must keep working when DATABASE_URL isn't set; the
 * first real query is what reports the missing variable.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient()
    const value = Reflect.get(client, prop, client)
    return typeof value === 'function' ? value.bind(client) : value
  },
})

export default prisma
