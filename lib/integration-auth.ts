import { createHash, randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'

/** Generate a new API key. Returns the raw key (shown once) and its SHA-256 hash. */
export function generateApiKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
  const rawKey = `int_${randomBytes(32).toString('hex')}`
  const keyHash = createHash('sha256').update(rawKey).digest('hex')
  const keyPrefix = rawKey.slice(0, 12)
  return { rawKey, keyHash, keyPrefix }
}

/** Hash a raw API key for lookup. */
export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex')
}

/**
 * Validate a Bearer token from the Authorization header.
 * Returns true if the key is valid, active, and not expired.
 * Updates lastUsedAt on success.
 */
export async function validateApiKey(authHeader: string | null): Promise<boolean> {
  if (!authHeader?.startsWith('Bearer ')) return false
  const rawKey = authHeader.slice(7).trim()
  if (!rawKey) return false

  const keyHash = hashApiKey(rawKey)
  const apiKey = await prisma.integrationApiKey.findUnique({ where: { keyHash } })

  if (!apiKey || !apiKey.active) return false
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return false

  // Update last used timestamp (fire-and-forget)
  prisma.integrationApiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {})

  return true
}
