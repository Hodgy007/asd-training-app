/**
 * Disaster-recovery restore script.
 *
 * Run from the `main` branch (not the homepage WIP branch). Sequence:
 *
 *   # 1. Make sure prod DATABASE_URL points at the correct Neon branch first.
 *   npx vercel env pull .env.production --environment production --yes
 *
 *   # 2. Recreate every table the wipe dropped.
 *   npx dotenv-cli -e .env.production -- npx prisma db push
 *
 *   # 3. Restore content + bootstrap admin.
 *   npx dotenv-cli -e .env.production -- npx tsx prisma/restore.ts
 *
 *   # 4. Restore AI prompts.
 *   npx dotenv-cli -e .env.production -- npx tsx prisma/seed-ai-prompts.ts
 *   npx dotenv-cli -e .env.production -- npx tsx prisma/seed-home-prompt.ts
 *
 * Restored (idempotent — safe to re-run):
 *   • TrainingProgram rows (program-asd, program-careers)
 *   • ASD modules + lessons + quiz questions   (lib/training-data.ts)
 *   • Careers modules + lessons + quiz questions (lib/careers-training-data.ts)
 *   • A SUPER_ADMIN account with mustChangePassword=true (login then immediately reset)
 *
 * NOT restored (must be rebuilt by hand or from another source):
 *   • Other user accounts
 *   • Organisations and their settings/hierarchy
 *   • Learner training progress
 *   • Survey definitions and responses
 *   • Library document records (files in Vercel Blob still exist; rows do not)
 *   • Job openings and applications
 *   • CV builder data, Careers Advisor sessions
 *   • Class sessions and attendance
 *   • Stripe purchases (replayable from Stripe webhook history)
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { TRAINING_MODULES, type TrainingModule } from '../lib/training-data'
import { CAREERS_MODULES } from '../lib/careers-training-data'

const prisma = new PrismaClient()

const BOOTSTRAP_ADMIN_EMAIL = process.env.RESTORE_ADMIN_EMAIL ?? 'admin@asdawareness.org.uk'
const BOOTSTRAP_ADMIN_PASSWORD = process.env.RESTORE_ADMIN_PASSWORD ?? 'TempAdmin!2026'

function markdownToHtml(text: string): string {
  const lines = text.split('\n')
  const out: string[] = []
  let inUl = false
  let inOl = false
  const flushUl = () => { if (inUl) { out.push('</ul>'); inUl = false } }
  const flushOl = () => { if (inOl) { out.push('</ol>'); inOl = false } }
  const inline = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

  for (const raw of lines) {
    const line = raw
    if (/^[-*] /.test(line)) {
      flushOl()
      if (!inUl) { out.push('<ul>'); inUl = true }
      out.push(`<li>${inline(line.replace(/^[-*] /, ''))}</li>`)
      continue
    }
    if (/^\d+\. /.test(line)) {
      flushUl()
      if (!inOl) { out.push('<ol>'); inOl = true }
      out.push(`<li>${inline(line.replace(/^\d+\. /, ''))}</li>`)
      continue
    }
    flushUl(); flushOl()
    if (line.trim() === '') continue
    if (/^### /.test(line)) { out.push(`<h3>${inline(line.replace(/^### /, ''))}</h3>`); continue }
    if (/^## /.test(line)) { out.push(`<h2>${inline(line.replace(/^## /, ''))}</h2>`); continue }
    if (/^<[a-zA-Z]/.test(line.trim())) { out.push(inline(line)); continue }
    out.push(`<p>${inline(line)}</p>`)
  }
  flushUl(); flushOl()
  return out.join('\n')
}

async function restoreTrainingPrograms() {
  console.log('\n[1/4] Restoring training programs…')
  await prisma.trainingProgram.upsert({
    where: { id: 'program-asd' },
    update: {},
    create: {
      id: 'program-asd',
      name: 'ASD Awareness Training',
      description: 'Autism awareness training for practitioners working with children and young people.',
      order: 1,
      status: 'APPROVED',
    },
  })
  await prisma.trainingProgram.upsert({
    where: { id: 'program-careers' },
    update: {},
    create: {
      id: 'program-careers',
      name: 'Careers CPD Training',
      description: 'Continuing professional development for careers professionals supporting autistic young people.',
      order: 2,
      status: 'APPROVED',
    },
  })
  console.log('  ✓ program-asd, program-careers')
}

async function restoreModules(modules: TrainingModule[], programId: string, label: string) {
  console.log(`\n[restoreModules] ${label}`)
  for (const mod of modules) {
    await prisma.module.upsert({
      where: { id: mod.id },
      update: { title: mod.title, description: mod.description, order: mod.order, programId },
      create: { id: mod.id, title: mod.title, description: mod.description, order: mod.order, programId },
    })
    for (const lesson of mod.lessons) {
      const html = markdownToHtml(lesson.content)
      await prisma.lesson.upsert({
        where: { id: lesson.id },
        update: {
          moduleId: lesson.moduleId, title: lesson.title, type: lesson.type,
          content: html, videoUrl: lesson.videoUrl ?? null, order: lesson.order,
        },
        create: {
          id: lesson.id, moduleId: lesson.moduleId, title: lesson.title, type: lesson.type,
          content: html, videoUrl: lesson.videoUrl ?? null, order: lesson.order,
        },
      })
      await prisma.quizQuestion.deleteMany({ where: { lessonId: lesson.id } })
      for (let qi = 0; qi < lesson.quizQuestions.length; qi++) {
        const q = lesson.quizQuestions[qi]
        await prisma.quizQuestion.create({
          data: {
            id: q.id, lessonId: lesson.id, question: q.question,
            options: JSON.stringify(q.options), correctAnswer: q.correctAnswer,
            explanation: q.explanation, order: qi + 1,
          },
        })
      }
    }
    console.log(`  ✓ ${mod.id} (${mod.lessons.length} lessons)`)
  }
}

async function restoreSuperAdmin() {
  console.log('\n[4/4] Restoring bootstrap super admin…')
  const password = await bcrypt.hash(BOOTSTRAP_ADMIN_PASSWORD, 12)
  const admin = await prisma.user.upsert({
    where: { email: BOOTSTRAP_ADMIN_EMAIL },
    update: {},
    create: {
      email: BOOTSTRAP_ADMIN_EMAIL,
      name: 'Recovery Admin',
      password,
      role: 'SUPER_ADMIN',
      mustChangePassword: true,
    },
  })
  console.log(`  ✓ ${admin.email}`)
  console.log(`     Password: ${BOOTSTRAP_ADMIN_PASSWORD}`)
  console.log('     mustChangePassword=true — you will be forced to change it at first login.')
}

async function main() {
  console.log('=== Disaster-recovery restore ===')
  console.log('Target DB:', process.env.DATABASE_URL?.replace(/:[^:@/]+@/, ':****@') ?? '(unset)')

  await restoreTrainingPrograms()

  console.log('\n[2/4] Restoring ASD modules…')
  await restoreModules(TRAINING_MODULES, 'program-asd', 'ASD')
  console.log('\n[2/4] Restoring Careers modules…')
  await restoreModules(CAREERS_MODULES, 'program-careers', 'Careers')

  console.log('\n[3/4] Restoring AI prompts (run separately):')
  console.log('       npx dotenv-cli -e .env.production -- npx tsx prisma/seed-ai-prompts.ts')
  console.log('       npx dotenv-cli -e .env.production -- npx tsx prisma/seed-home-prompt.ts')

  await restoreSuperAdmin()

  console.log('\n=== Restore complete ===')
  console.log('Next steps:')
  console.log('  1. Sign in with the bootstrap admin and change the password.')
  console.log('  2. Recreate organisations (Super Admin → Organisations).')
  console.log('  3. Recreate user accounts and re-issue invites.')
  console.log('  4. Replay Stripe webhooks if you need purchase history.')
  console.log('  5. Files in Vercel Blob (PDFs, SCORM packages) are intact;')
  console.log('     reattach them by re-uploading via the Library admin.')
}

main()
  .catch((err) => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
