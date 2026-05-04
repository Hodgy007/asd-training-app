import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const checks = await prisma.$queryRaw`
  SELECT 'User.lastStripeEventAt' AS check_name,
         EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'User' AND column_name = 'lastStripeEventAt') AS present
  UNION ALL
  SELECT 'Organisation.lastStripeEventAt',
         EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'Organisation' AND column_name = 'lastStripeEventAt')
  UNION ALL
  SELECT 'SamlAuthnRequest table',
         EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_name = 'SamlAuthnRequest')
  UNION ALL
  SELECT 'Purchase.programId FK rule',
         EXISTS (SELECT 1 FROM information_schema.referential_constraints rc
                 JOIN information_schema.table_constraints tc
                   ON rc.constraint_name = tc.constraint_name
                 WHERE tc.table_name = 'Purchase'
                   AND rc.delete_rule = 'RESTRICT')
`

console.log(`\nDB host: ${new URL(process.env.DATABASE_URL).host}\n`)
for (const row of checks) {
  console.log(`  ${row.present ? '✓' : '✗'}  ${row.check_name}`)
}

await prisma.$disconnect()
