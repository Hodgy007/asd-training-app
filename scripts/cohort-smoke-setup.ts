import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { generateInviteCode } from '../lib/cohort'

const prisma = new PrismaClient()

async function main() {
  // Find or create a SUPER_ADMIN user we can sign in as for the smoke test
  const adminEmail = 'cohort-smoke-admin@example.com'
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (!admin) {
    const hash = await bcrypt.hash('SmokeTest123!', 10)
    admin = await prisma.user.create({
      data: { email: adminEmail, name: 'Smoke Admin', password: hash, role: 'SUPER_ADMIN', active: true },
    })
  }

  // Create a cohort with an invite code
  const slug = `cohort-smoke-${Date.now()}`
  const cohort = await prisma.organisation.create({
    data: {
      name: 'Spring Smoke Test Cohort',
      slug,
      orgType: 'COHORT',
      allowedProgramIds: [],
      allowedRoles: ['PARTICIPANT'],
      active: true,
      inviteCode: generateInviteCode(),
      inviteEnabled: true,
    },
  })

  console.log(JSON.stringify({
    adminEmail,
    adminPassword: 'SmokeTest123!',
    cohortId: cohort.id,
    cohortName: cohort.name,
    inviteCode: cohort.inviteCode,
    inviteUrl: `http://localhost:3000/join/${cohort.inviteCode}`,
  }, null, 2))
}

main().finally(() => prisma.$disconnect())
