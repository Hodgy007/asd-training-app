/**
 * Migrates existing "Personal" organisations to user-level subscriptions.
 *
 * For each `Organisation` where `isPersonal: true`:
 *   - exactly one user → copy stripe* + subscription* + allowedProgramIds onto
 *     that user, detach (organisationId = null), reassign purchases, delete org.
 *   - zero users (orphan) → delete the org outright.
 *   - multiple users → log and skip (manual triage required).
 *
 * Uses $executeRawUnsafe / $queryRawUnsafe so it works without regenerating the
 * Prisma client (the new User columns aren't yet in the generated types).
 *
 * Run: npx dotenv-cli -e .env.local -- npx tsx scripts/migrate-personal-orgs-to-users.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface PersonalOrgRow {
  id: string
  name: string
  slug: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  subscriptionStatus: string
  subscriptionCurrentPeriodEnd: Date | null
  subscriptionPriceId: string | null
  allowedProgramIds: string[]
}

async function main() {
  const orgs = await prisma.$queryRawUnsafe<PersonalOrgRow[]>(
    `SELECT id, name, slug,
            "stripeCustomerId",
            "stripeSubscriptionId",
            "subscriptionStatus"::text AS "subscriptionStatus",
            "subscriptionCurrentPeriodEnd",
            "subscriptionPriceId",
            "allowedProgramIds"
       FROM "Organisation"
      WHERE "isPersonal" = true`
  )

  console.log(`Found ${orgs.length} personal org(s).`)

  let migrated = 0
  let orphans = 0
  let skipped = 0

  for (const org of orgs) {
    const users = await prisma.$queryRawUnsafe<Array<{ id: string; email: string }>>(
      `SELECT id, email FROM "User" WHERE "organisationId" = $1`,
      org.id
    )

    if (users.length === 0) {
      console.log(`[orphan] Deleting "${org.name}" (slug: ${org.slug}, no users).`)
      await prisma.$executeRawUnsafe(`DELETE FROM "Organisation" WHERE id = $1`, org.id)
      orphans += 1
      continue
    }

    if (users.length > 1) {
      console.warn(
        `[skip] "${org.name}" (id: ${org.id}) has ${users.length} users — manual triage required.`
      )
      skipped += 1
      continue
    }

    const user = users[0]!
    console.log(`[migrate] "${org.name}" → user ${user.email}`)

    await prisma.$transaction([
      prisma.$executeRawUnsafe(
        `UPDATE "User"
            SET "organisationId" = NULL,
                "stripeCustomerId" = $2,
                "stripeSubscriptionId" = $3,
                "subscriptionStatus" = $4::"SubscriptionStatus",
                "subscriptionCurrentPeriodEnd" = $5,
                "subscriptionPriceId" = $6,
                "allowedProgramIds" = $7
          WHERE id = $1`,
        user.id,
        org.stripeCustomerId,
        org.stripeSubscriptionId,
        org.subscriptionStatus,
        org.subscriptionCurrentPeriodEnd,
        org.subscriptionPriceId,
        org.allowedProgramIds
      ),
      prisma.$executeRawUnsafe(
        `UPDATE "Purchase" SET "userId" = $2, "organisationId" = NULL WHERE "organisationId" = $1`,
        org.id,
        user.id
      ),
      prisma.$executeRawUnsafe(`DELETE FROM "Organisation" WHERE id = $1`, org.id),
    ])
    migrated += 1
  }

  console.log('\n— Migration complete —')
  console.log(`  Migrated:        ${migrated}`)
  console.log(`  Orphans deleted: ${orphans}`)
  console.log(`  Skipped:         ${skipped}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
