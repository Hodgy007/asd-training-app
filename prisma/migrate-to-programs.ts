import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting migration to training programs...');

  // 1. Create "ASD Awareness Training" program
  const asdProgram = await prisma.trainingProgram.upsert({
    where: { id: 'program-asd' },
    update: {
      name: 'ASD Awareness Training',
      status: 'APPROVED',
      version: '1.0',
      order: 1,
    },
    create: {
      id: 'program-asd',
      name: 'ASD Awareness Training',
      description: 'Comprehensive training program for ASD awareness and caregiving best practices.',
      status: 'APPROVED',
      version: '1.0',
      order: 1,
    },
  });
  console.log(`Upserted program: ${asdProgram.name} (${asdProgram.id})`);

  // 2. Create "Careers CPD Training" program
  const careersProgram = await prisma.trainingProgram.upsert({
    where: { id: 'program-careers' },
    update: {
      name: 'Careers CPD Training',
      status: 'APPROVED',
      version: '1.0',
      order: 2,
    },
    create: {
      id: 'program-careers',
      name: 'Careers CPD Training',
      description: 'Continuing professional development training for career development officers.',
      status: 'APPROVED',
      version: '1.0',
      order: 2,
    },
  });
  console.log(`Upserted program: ${careersProgram.name} (${careersProgram.id})`);

  // 3. Update all ASD modules to point to the ASD program
  const asdUpdate = await prisma.module.updateMany({
    where: { type: 'ASD' },
    data: { programId: 'program-asd' },
  });
  console.log(`Updated ${asdUpdate.count} ASD modules -> program-asd`);

  // 4. Update all CAREERS modules to point to the Careers program
  const careersUpdate = await prisma.module.updateMany({
    where: { type: 'CAREERS' },
    data: { programId: 'program-careers' },
  });
  console.log(`Updated ${careersUpdate.count} CAREERS modules -> program-careers`);

  // 5. Migrate org allowedModuleIds -> allowedProgramIds
  const orgs = await prisma.organisation.findMany({
    select: { id: true, name: true, allowedModuleIds: true, allowedProgramIds: true },
  });

  for (const org of orgs) {
    const programIds = new Set<string>(org.allowedProgramIds);

    const hasAsd = org.allowedModuleIds.some((id) => id.startsWith('module-'));
    const hasCareers = org.allowedModuleIds.some((id) => id.startsWith('careers-'));

    if (hasAsd) programIds.add('program-asd');
    if (hasCareers) programIds.add('program-careers');

    const newProgramIds = Array.from(programIds);

    if (newProgramIds.length > 0) {
      await prisma.organisation.update({
        where: { id: org.id },
        data: { allowedProgramIds: newProgramIds },
      });
      console.log(`Org "${org.name}": allowedProgramIds = [${newProgramIds.join(', ')}]`);
    } else {
      console.log(`Org "${org.name}": no module IDs to migrate`);
    }
  }

  console.log('Migration complete!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
