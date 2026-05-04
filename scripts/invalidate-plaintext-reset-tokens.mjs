/**
 * One-shot: clear all existing PasswordResetToken rows.
 *
 * Run after deploying the reset-token-hashing fix. Existing rows store the
 * raw token (pre-fix); the redeem path now hashes incoming tokens and looks
 * up by hash, so the old rows can never match anyway. Deleting them avoids a
 * confusing audit trail of unredeemed-but-orphaned tokens.
 *
 * Active reset emails sent before the deploy will stop working. Affected
 * users just request a new link — same end-state as letting tokens expire
 * (they expire after 1h regardless).
 *
 * Usage:
 *   # dev
 *   node scripts/invalidate-plaintext-reset-tokens.mjs
 *   # prod
 *   $env:DATABASE_URL = '...prod url...'
 *   node scripts/invalidate-plaintext-reset-tokens.mjs
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const result = await prisma.passwordResetToken.deleteMany({})
console.log(`\nDB host: ${new URL(process.env.DATABASE_URL).host}`)
console.log(`Deleted ${result.count} plaintext reset token row(s).`)

await prisma.$disconnect()
