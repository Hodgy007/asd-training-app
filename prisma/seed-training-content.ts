import { PrismaClient } from '@prisma/client'
import { TRAINING_MODULES } from '../lib/training-data'
import { CAREERS_MODULES } from '../lib/careers-training-data'

const prisma = new PrismaClient()

// ---------------------------------------------------------------------------
// Markdown → clean HTML converter
// ---------------------------------------------------------------------------
function markdownToHtml(text: string): string {
  const lines = text.split('\n')
  const output: string[] = []
  let inUl = false
  let inOl = false

  const flushUl = () => {
    if (inUl) { output.push('</ul>'); inUl = false }
  }
  const flushOl = () => {
    if (inOl) { output.push('</ol>'); inOl = false }
  }

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]

    // --- Unordered list item (lines starting with "- " or "* ")
    if (/^[-*] /.test(line)) {
      flushOl()
      if (!inUl) { output.push('<ul>'); inUl = true }
      const content = convertInline(line.replace(/^[-*] /, ''))
      output.push(`<li>${content}</li>`)
      continue
    }

    // --- Ordered list item (lines starting with "1. ", "2. ", etc.)
    if (/^\d+\. /.test(line)) {
      flushUl()
      if (!inOl) { output.push('<ol>'); inOl = true }
      const content = convertInline(line.replace(/^\d+\. /, ''))
      output.push(`<li>${content}</li>`)
      continue
    }

    // Close any open list before processing non-list lines
    flushUl()
    flushOl()

    // --- Blank line: skip (whitespace between blocks)
    if (line.trim() === '') {
      continue
    }

    // --- ### heading
    if (/^### /.test(line)) {
      output.push(`<h3>${convertInline(line.replace(/^### /, ''))}</h3>`)
      continue
    }

    // --- ## heading
    if (/^## /.test(line)) {
      output.push(`<h2>${convertInline(line.replace(/^## /, ''))}</h2>`)
      continue
    }

    // --- Lines that already start with an HTML tag — preserve as-is
    if (/^<[a-zA-Z]/.test(line.trim())) {
      output.push(convertInline(line))
      continue
    }

    // --- Normal paragraph line
    output.push(`<p>${convertInline(line)}</p>`)
  }

  // Close any trailing open list
  flushUl()
  flushOl()

  return output.join('\n')
}

/**
 * Convert inline markdown within a single line:
 *   **bold** → <strong>bold</strong>
 * Leaves existing HTML tags untouched.
 */
function convertInline(text: string): string {
  // Replace **bold** with <strong>bold</strong>
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------
async function main() {
  console.log('Seeding training content…')

  // ── ASD modules ──────────────────────────────────────────────────────────
  for (const mod of TRAINING_MODULES) {
    await prisma.module.upsert({
      where: { id: mod.id },
      update: {
        title: mod.title,
        description: mod.description,
        order: mod.order,
        programId: 'program-asd',
      },
      create: {
        id: mod.id,
        title: mod.title,
        description: mod.description,
        order: mod.order,
        programId: 'program-asd',
      },
    })
    console.log(`  ✓ Module: ${mod.id}`)

    for (const lesson of mod.lessons) {
      const htmlContent = markdownToHtml(lesson.content)

      await prisma.lesson.upsert({
        where: { id: lesson.id },
        update: {
          moduleId: lesson.moduleId,
          title: lesson.title,
          type: lesson.type,
          content: htmlContent,
          videoUrl: lesson.videoUrl ?? null,
          order: lesson.order,
        },
        create: {
          id: lesson.id,
          moduleId: lesson.moduleId,
          title: lesson.title,
          type: lesson.type,
          content: htmlContent,
          videoUrl: lesson.videoUrl ?? null,
          order: lesson.order,
        },
      })
      console.log(`    ✓ Lesson: ${lesson.id}`)

      // Delete existing quiz questions then recreate
      await prisma.quizQuestion.deleteMany({ where: { lessonId: lesson.id } })

      for (let qi = 0; qi < lesson.quizQuestions.length; qi++) {
        const q = lesson.quizQuestions[qi]
        await prisma.quizQuestion.create({
          data: {
            id: q.id,
            lessonId: lesson.id,
            question: q.question,
            options: JSON.stringify(q.options),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            order: qi + 1,
          },
        })
      }
      console.log(`      ✓ ${lesson.quizQuestions.length} quiz question(s)`)
    }
  }

  // ── Careers modules ───────────────────────────────────────────────────────
  for (const mod of CAREERS_MODULES) {
    await prisma.module.upsert({
      where: { id: mod.id },
      update: {
        title: mod.title,
        description: mod.description,
        order: mod.order,
        programId: 'program-careers',
      },
      create: {
        id: mod.id,
        title: mod.title,
        description: mod.description,
        order: mod.order,
        programId: 'program-careers',
      },
    })
    console.log(`  ✓ Module: ${mod.id}`)

    for (const lesson of mod.lessons) {
      const htmlContent = markdownToHtml(lesson.content)

      await prisma.lesson.upsert({
        where: { id: lesson.id },
        update: {
          moduleId: lesson.moduleId,
          title: lesson.title,
          type: lesson.type,
          content: htmlContent,
          videoUrl: lesson.videoUrl ?? null,
          order: lesson.order,
        },
        create: {
          id: lesson.id,
          moduleId: lesson.moduleId,
          title: lesson.title,
          type: lesson.type,
          content: htmlContent,
          videoUrl: lesson.videoUrl ?? null,
          order: lesson.order,
        },
      })
      console.log(`    ✓ Lesson: ${lesson.id}`)

      // Delete existing quiz questions then recreate
      await prisma.quizQuestion.deleteMany({ where: { lessonId: lesson.id } })

      for (let qi = 0; qi < lesson.quizQuestions.length; qi++) {
        const q = lesson.quizQuestions[qi]
        await prisma.quizQuestion.create({
          data: {
            id: q.id,
            lessonId: lesson.id,
            question: q.question,
            options: JSON.stringify(q.options),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            order: qi + 1,
          },
        })
      }
      console.log(`      ✓ ${lesson.quizQuestions.length} quiz question(s)`)
    }
  }

  console.log('\nDone.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
