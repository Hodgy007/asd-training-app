import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma/client'

/**
 * Build a Prisma client on the `pg` driver adapter (required since Prisma 7).
 *
 * The app uses the pooled `DATABASE_URL` (Neon pooler, port 6543). One-off
 * scripts and seeds call this too, optionally passing `DIRECT_URL`.
 */
export function createPrismaClient(connectionString = process.env.DATABASE_URL) {
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

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
