/**
 * ONE-TIME MIGRATION SCRIPT — ALREADY RUN ON PRODUCTION
 *
 * This script migrated from the old ModuleType enum (ASD/CAREERS) to the
 * TrainingProgram model. It has been run and is kept for historical reference.
 *
 * The old schema fields (Module.type, Organisation.allowedModuleIds) no longer
 * exist in the Prisma schema, so this file uses raw SQL as a reference.
 *
 * DO NOT RUN THIS AGAIN.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('This migration has already been run. Exiting.');
  console.log('');
  console.log('It originally:');
  console.log('  1. Created program-asd and program-careers TrainingProgram records');
  console.log('  2. Set Module.programId based on old Module.type field');
  console.log('  3. Migrated Organisation.allowedModuleIds to allowedProgramIds');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
