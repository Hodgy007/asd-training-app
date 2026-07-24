/**
 * Migrate the database to the four-role model and give the charity its own
 * organisation.
 *
 *   SUPER_ADMIN, CHARITY_EMPLOYEE, ORG_ADMIN, LEARNER
 *
 * CAREGIVER, CAREER_DEV_OFFICER, STUDENT, INTERN, EMPLOYEE, PARTICIPANT and
 * FAMILY_CARER all collapse into LEARNER.
 *
 * WHY A SCRIPT AND NOT `prisma db push`
 * PostgreSQL cannot drop values from an enum in place, so db push either fails
 * or strands rows pointing at values that no longer exist. This rebuilds the
 * type: create Role_new, convert every column with a CASE mapping, drop the old
 * type, rename. One transaction, no ALTER TYPE ... ADD VALUE dance.
 *
 * THE TWO HAZARDS THIS HANDLES
 *   1. HomePage.role is the PRIMARY KEY. Seven role-keyed homepages collapsing
 *      into one LEARNER row violates it, so the rows are deduped first — the
 *      most recently updated one survives and becomes the default homepage.
 *   2. SurveyTarget.role has no unique constraint, so collapsing produces
 *      duplicate targeting rows. Harmless but messy; deduped too.
 *
 * DEFAULTS TO DRY-RUN. Pass --apply to write.
 *
 * Usage:
 *   npx dotenv-cli -e .env.local      -- npx tsx scripts/migrate-to-four-roles.ts
 *   npx dotenv-cli -e .env.local      -- npx tsx scripts/migrate-to-four-roles.ts --apply
 *   npx dotenv-cli -e .env.production -- npx tsx scripts/migrate-to-four-roles.ts --apply
 *
 * Run against the dev branch first. After it succeeds, run `npx prisma db push`
 * so the rest of the schema (the CHARITY OrganisationType value) lands too.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')

const RETIRED_ROLES = [
  'CAREGIVER',
  'CAREER_DEV_OFFICER',
  'STUDENT',
  'INTERN',
  'EMPLOYEE',
  'PARTICIPANT',
  'FAMILY_CARER',
]
const KEPT_ROLES = ['SUPER_ADMIN', 'CHARITY_EMPLOYEE', 'ORG_ADMIN']

const CHARITY_ORG_SLUG = 'ambitious-about-autism'
const CHARITY_ORG_NAME = 'Ambitious about Autism'

const sqlList = (values: string[]) => values.map((v) => `'${v}'`).join(', ')

/** CASE expression mapping any old enum value onto the four-role set. */
const roleCase = (col: string) =>
  `(CASE WHEN ${col}::text IN (${sqlList(KEPT_ROLES)}) THEN ${col}::text ELSE 'LEARNER' END)::"Role_new"`

async function report() {
  const [users, homepages, surveyTargets, orgs] = await Promise.all([
    prisma.$queryRawUnsafe<{ role: string; n: bigint }[]>(
      `SELECT role::text AS role, COUNT(*) AS n FROM "User" GROUP BY role ORDER BY n DESC`
    ),
    prisma.$queryRawUnsafe<{ role: string; updatedAt: Date }[]>(
      `SELECT role::text AS role, "updatedAt" FROM "HomePage" ORDER BY "updatedAt" DESC`
    ),
    prisma.$queryRawUnsafe<{ role: string; n: bigint }[]>(
      `SELECT role::text AS role, COUNT(*) AS n FROM "SurveyTarget" WHERE role IS NOT NULL GROUP BY role`
    ),
    prisma.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT COUNT(*) AS n FROM "Organisation" WHERE slug = '${CHARITY_ORG_SLUG}'`
    ),
  ])

  console.log('USERS BY ROLE')
  for (const r of users) console.log(`  ${r.role.padEnd(20)} ${r.n}`)

  const movingToLearner = users
    .filter((r) => RETIRED_ROLES.includes(r.role))
    .reduce((a, r) => a + Number(r.n), 0)
  const charityStaff = users
    .filter((r) => r.role === 'SUPER_ADMIN' || r.role === 'CHARITY_EMPLOYEE')
    .reduce((a, r) => a + Number(r.n), 0)

  console.log()
  console.log(`  → ${movingToLearner} user(s) become LEARNER`)
  console.log(`  → ${charityStaff} charity user(s) move into the ${CHARITY_ORG_NAME} org`)

  console.log()
  console.log(`HOMEPAGES (${homepages.length} row(s), role is the PRIMARY KEY)`)
  for (const [i, h] of homepages.entries()) {
    const fate =
      KEPT_ROLES.includes(h.role) ? 'kept as-is'
        : i === homepages.findIndex((x) => RETIRED_ROLES.includes(x.role)) ? 'KEPT → becomes the LEARNER default'
          : 'DELETED (would collide on the primary key)'
    console.log(`  ${h.role.padEnd(20)} ${h.updatedAt.toISOString().slice(0, 10)}  ${fate}`)
  }

  console.log()
  console.log(`SURVEY TARGETS BY ROLE (${surveyTargets.length} distinct)`)
  for (const s of surveyTargets) console.log(`  ${s.role.padEnd(20)} ${s.n}`)

  console.log()
  console.log(
    Number(orgs[0].n) > 0
      ? `CHARITY ORG: already exists (slug ${CHARITY_ORG_SLUG}) — will be reused`
      : `CHARITY ORG: will be created (slug ${CHARITY_ORG_SLUG})`
  )
}

/** True once the Role enum holds exactly the four-role set. */
async function roleEnumAlreadyMigrated(): Promise<boolean> {
  const vals = await prisma.$queryRawUnsafe<{ v: string }[]>(
    `SELECT e.enumlabel AS v FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'Role'`
  )
  const set = new Set(vals.map((x) => x.v))
  return set.size === 4 && [...KEPT_ROLES, 'LEARNER'].every((r) => set.has(r))
}

/**
 * Add CHARITY to OrganisationType. This has to happen OUTSIDE the enum-rebuild
 * transaction and before the charity org is created: PostgreSQL will not let a
 * value added by ALTER TYPE ... ADD VALUE be used in the same transaction.
 */
async function addCharityOrgType() {
  await prisma.$executeRawUnsafe(
    `ALTER TYPE "OrganisationType" ADD VALUE IF NOT EXISTS 'CHARITY' BEFORE 'SCHOOL'`
  )
  console.log('  OrganisationType now includes CHARITY')
}

async function migrate() {
  if (await roleEnumAlreadyMigrated()) {
    console.log('  Role enum already migrated — skipping the rebuild')
    return
  }

  await prisma.$transaction(async (tx) => {
    // ── 1. Dedupe HomePage before the collapse, or the PK blows up ──────────
    // Keep the most recently updated retired-role homepage; it becomes the
    // single LEARNER default. Any kept-role rows are untouched.
    await tx.$executeRawUnsafe(`
      DELETE FROM "HomePage"
      WHERE role::text IN (${sqlList(RETIRED_ROLES)})
        AND role::text <> (
          SELECT role::text FROM "HomePage"
          WHERE role::text IN (${sqlList(RETIRED_ROLES)})
          ORDER BY "updatedAt" DESC
          LIMIT 1
        )
    `)

    // ── 2. Dedupe SurveyTarget role rows (no unique constraint, just noise) ──
    await tx.$executeRawUnsafe(`
      DELETE FROM "SurveyTarget" a
      USING "SurveyTarget" b
      WHERE a.role IS NOT NULL
        AND b.role IS NOT NULL
        AND a."surveyId" = b."surveyId"
        AND a."organisationId" IS NOT DISTINCT FROM b."organisationId"
        AND a."userId" IS NOT DISTINCT FROM b."userId"
        AND a.role::text IN (${sqlList(RETIRED_ROLES)})
        AND b.role::text IN (${sqlList(RETIRED_ROLES)})
        AND a.id > b.id
    `)

    // ── 3. Rebuild the enum ────────────────────────────────────────────────
    await tx.$executeRawUnsafe(
      `CREATE TYPE "Role_new" AS ENUM ('SUPER_ADMIN', 'CHARITY_EMPLOYEE', 'ORG_ADMIN', 'LEARNER')`
    )
    await tx.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT`)

    await tx.$executeRawUnsafe(
      `ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ${roleCase('"role"')}`
    )
    await tx.$executeRawUnsafe(
      `ALTER TABLE "HomePage" ALTER COLUMN "role" TYPE "Role_new" USING ${roleCase('"role"')}`
    )
    // Nullable columns: NULL must stay NULL, so guard the CASE.
    await tx.$executeRawUnsafe(`
      ALTER TABLE "SurveyTarget" ALTER COLUMN "role" TYPE "Role_new"
      USING (CASE WHEN "role" IS NULL THEN NULL ELSE ${roleCase('"role"')} END)
    `)
    await tx.$executeRawUnsafe(`
      ALTER TABLE "TrainingProgram" ALTER COLUMN "defaultLeafRole" TYPE "Role_new"
      USING (CASE WHEN "defaultLeafRole" IS NULL THEN NULL ELSE ${roleCase('"defaultLeafRole"')} END)
    `)

    await tx.$executeRawUnsafe(`DROP TYPE "Role"`)
    await tx.$executeRawUnsafe(`ALTER TYPE "Role_new" RENAME TO "Role"`)
    await tx.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'LEARNER'`)

    // ── 4. String columns that carry role names ────────────────────────────
    // allowedRoles / targetRoles are String[], not enums, so they need their
    // own rewrite. Collapse retired values to LEARNER and de-duplicate.
    for (const [table, col] of [
      ['Organisation', 'allowedRoles'],
      ['LibraryCollection', 'targetRoles'],
      ['JobOpening', 'targetRoles'],
    ] as const) {
      await tx.$executeRawUnsafe(`
        UPDATE "${table}" SET "${col}" = ARRAY(
          SELECT DISTINCT CASE WHEN v IN (${sqlList(RETIRED_ROLES)}) THEN 'LEARNER' ELSE v END
          FROM unnest("${col}") AS v
        )
        WHERE "${col}" && ARRAY[${sqlList(RETIRED_ROLES)}]
      `)
    }

    await tx.$executeRawUnsafe(`
      UPDATE "OrgSsoConfig" SET "defaultRole" = 'LEARNER'
      WHERE "defaultRole" IN (${sqlList(RETIRED_ROLES)})
    `)
  }, { timeout: 120_000 })

  console.log('  enum rebuilt, role columns and role-bearing arrays migrated')
}

/**
 * Create the charity's own organisation and move charity staff into it, so
 * internal users are ordinary members of an org like everyone else — progress,
 * reports and certificates then work with no "user with no organisation"
 * special-casing.
 */
async function seedCharityOrg() {
  const existing = await prisma.organisation.findUnique({ where: { slug: CHARITY_ORG_SLUG } })

  const org =
    existing ??
    (await prisma.organisation.create({
      data: {
        name: CHARITY_ORG_NAME,
        slug: CHARITY_ORG_SLUG,
        organisationType: 'CHARITY',
        orgType: 'ORGANISATION',
        allowedRoles: ['LEARNER'],
        allowedProgramIds: [],
        active: true,
        pendingApproval: false,
      },
    }))

  console.log(`  charity org ${existing ? 'reused' : 'created'}: ${org.id}`)

  const moved = await prisma.user.updateMany({
    where: { role: { in: ['SUPER_ADMIN', 'CHARITY_EMPLOYEE'] }, organisationId: null },
    data: { organisationId: org.id },
  })
  console.log(`  moved ${moved.count} charity user(s) into it`)
}

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? ''
  const host = dbUrl.match(/@([^/:]+)/)?.[1] ?? '?'
  const safety = host.includes('blue-thunder') ? 'PROD' : host.includes('lucky-cherry') ? 'DEV' : 'UNKNOWN'

  console.log(`DB:   ${host} (${safety})`)
  console.log(`Mode: ${apply ? 'APPLY — will modify the database' : 'DRY-RUN (no writes)'}`)
  console.log()

  await report()
  console.log()

  if (!apply) {
    console.log('Dry-run complete. Re-run with --apply to migrate.')
    console.log('Run against the dev branch first, then production.')
    return
  }

  console.log('Migrating…')
  await migrate()
  await addCharityOrgType()
  await seedCharityOrg()
  console.log()
  console.log('Done. Run `npx prisma db push` to sync any remaining schema drift.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
