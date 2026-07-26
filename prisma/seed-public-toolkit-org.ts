import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SLUG = 'public-toolkit'
const REQUIRED_ALLOWED_ROLES = ['LEARNER']

export async function seedPublicToolkitOrg(client: PrismaClient = prisma) {
  const existing = await client.organisation.findUnique({ where: { slug: SLUG } })
  if (existing) {
    // Idempotent reconcile: ensure allowedRoles contains every role we
    // currently need. A previously-seeded environment from before
    // FAMILY_CARER was added needs the role added here.
    const missing = REQUIRED_ALLOWED_ROLES.filter((r) => !existing.allowedRoles.includes(r))
    if (missing.length > 0) {
      await client.organisation.update({
        where: { id: existing.id },
        data: { allowedRoles: [...existing.allowedRoles, ...missing] },
      })
      console.log(`Public Toolkit Users org existed (id=${existing.id}) — added missing allowedRoles: ${missing.join(', ')}`)
    } else {
      console.log(`Public Toolkit Users org already exists (id=${existing.id})`)
    }
    return existing
  }
  const created = await client.organisation.create({
    data: {
      name: 'Public Toolkit Users',
      slug: SLUG,
      organisationType: 'BUSINESS',
      orgType: 'ORGANISATION',
      allowedRoles: REQUIRED_ALLOWED_ROLES,
      allowedProgramIds: [],
      active: true,
    },
  })
  console.log(`Created Public Toolkit Users org (id=${created.id})`)
  return created
}

if (require.main === module) {
  seedPublicToolkitOrg()
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
