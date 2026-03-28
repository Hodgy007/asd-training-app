// prisma/migrate-to-multi-tenant.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Step 1: Migrate ADMIN → SUPER_ADMIN...')
  const adminUpdate = await prisma.$executeRawUnsafe(
    `UPDATE "User" SET role = 'SUPER_ADMIN' WHERE role = 'ADMIN'`
  )
  console.log(`  Updated ${adminUpdate} user(s) from ADMIN to SUPER_ADMIN`)

  console.log('Step 2: Create Legacy organisation...')
  const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "Organisation" WHERE slug = 'legacy' LIMIT 1`
  )

  let legacyOrgId: string
  if (existing.length > 0) {
    legacyOrgId = existing[0].id
    console.log(`  Legacy org already exists: ${legacyOrgId}`)
  } else {
    const org = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO "Organisation" (id, name, slug, active, "allowedModuleIds", "allowedRoles", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, 'Legacy', 'legacy', true,
               ARRAY['module-1','module-2','module-3','module-4','module-5','careers-module-1','careers-module-2','careers-module-3','careers-module-4'],
               ARRAY['CAREGIVER','CAREER_DEV_OFFICER'],
               NOW(), NOW())
       RETURNING id`
    )
    legacyOrgId = org[0].id
    console.log(`  Created Legacy org: ${legacyOrgId}`)
  }

  console.log('Step 3: Assign existing leaf-role users to Legacy org...')
  const userUpdate = await prisma.$executeRawUnsafe(
    `UPDATE "User" SET "organisationId" = $1
     WHERE role IN ('CAREGIVER', 'CAREER_DEV_OFFICER')
     AND "organisationId" IS NULL`,
    legacyOrgId
  )
  console.log(`  Assigned ${userUpdate} user(s) to Legacy org`)

  console.log('Migration complete.')
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
