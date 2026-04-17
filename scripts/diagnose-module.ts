import { prisma } from '../lib/prisma'

async function main() {
  const programId = 'cmo32h62s000012cu9ec3hgnx'
  const moduleId = 'Module 1 ID'

  console.log('─'.repeat(60))
  console.log(`Program ID: "${programId}"`)
  console.log(`Module ID : "${moduleId}"`)
  console.log('─'.repeat(60))

  const program = await prisma.trainingProgram.findUnique({
    where: { id: programId },
    select: { id: true, name: true, active: true, status: true },
  })
  console.log('\nProgram:', program)

  const moduleByIdOnly = await prisma.module.findUnique({
    where: { id: moduleId },
    select: { id: true, title: true, active: true, programId: true },
  })
  console.log('\nModule (by id only):', moduleByIdOnly)

  const moduleFullFilter = await prisma.module.findFirst({
    where: { id: moduleId, active: true, programId },
    select: { id: true, title: true, active: true, programId: true },
  })
  console.log('\nModule (with active + programId filter — this is what the learner page uses):', moduleFullFilter)

  const allModulesInProgram = await prisma.module.findMany({
    where: { programId },
    select: { id: true, title: true, active: true },
  })
  console.log(`\nAll modules in program ${programId}:`, allModulesInProgram)

  const allModulesWithSimilarId = await prisma.module.findMany({
    where: { id: { startsWith: 'Module' } },
    select: { id: true, title: true, active: true, programId: true },
  })
  console.log('\nAll modules whose id starts with "Module":', allModulesWithSimilarId)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
