/**
 * Cohort v2 backfill — run once per environment after schema push.
 *
 * 1. Ensure singleton "Independent Learners" Organisation exists (orgType=PERSONAL,
 *    isPersonal=true). This is the home org for unaligned PARTICIPANT users so
 *    User.organisationId can stay non-null and existing org-aware code keeps working.
 *
 * 2. For every existing User whose Organisation has orgType=COHORT, create a matching
 *    CohortMembership row (idempotent — skips users who already have one).
 *
 * Run on dev:  npx tsx scripts/backfill-cohort-memberships.ts
 * Run on prod: npx vercel env pull .env.production --environment production --yes
 *              npx dotenv-cli -e .env.production -- npx tsx scripts/backfill-cohort-memberships.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const INDEPENDENT_SLUG = 'independent-learners'
const INDEPENDENT_NAME = 'Independent Learners'

async function ensureIndependentOrg() {
  const existing = await prisma.organisation.findUnique({ where: { slug: INDEPENDENT_SLUG } })
  if (existing) {
    console.log(`✓ "${INDEPENDENT_NAME}" org exists (id=${existing.id})`)
    return existing
  }
  const created = await prisma.organisation.create({
    data: {
      name: INDEPENDENT_NAME,
      slug: INDEPENDENT_SLUG,
      orgType: 'PERSONAL',
      isPersonal: true,
      organisationType: 'BUSINESS',
      allowedProgramIds: [],
      allowedRoles: ['PARTICIPANT'],
      cvBuilderEnabled: false,
      careersAdvisorEnabled: false,
    },
  })
  console.log(`✓ Created "${INDEPENDENT_NAME}" org (id=${created.id})`)
  return created
}

async function backfillMemberships() {
  const cohortUsers = await prisma.user.findMany({
    where: {
      organisation: { orgType: 'COHORT' },
    },
    select: { id: true, organisationId: true, email: true, createdAt: true },
  })

  console.log(`Found ${cohortUsers.length} users in cohorts`)

  let created = 0
  let skipped = 0
  for (const u of cohortUsers) {
    if (!u.organisationId) continue
    const existing = await prisma.cohortMembership.findUnique({
      where: { userId_cohortId: { userId: u.id, cohortId: u.organisationId } },
    })
    if (existing) {
      skipped++
      continue
    }
    await prisma.cohortMembership.create({
      data: {
        userId: u.id,
        cohortId: u.organisationId,
        status: 'ACTIVE',
        joinedAt: u.createdAt,
      },
    })
    created++
  }
  console.log(`✓ Created ${created} memberships (skipped ${skipped} that already existed)`)
}

async function main() {
  console.log('--- Cohort v2 backfill ---')
  await ensureIndependentOrg()
  await backfillMemberships()
  console.log('--- Done ---')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
