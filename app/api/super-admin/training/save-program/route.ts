import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import prisma from '@/lib/prisma'
import { sanitizeHtml } from '@/lib/sanitize'
import { validateInteractiveBlocks } from '@/lib/interactive-blocks'
import type { InteractiveBlock } from '@/types/interactive'
import type { GeneratedProgram } from '@/lib/content-generator-types'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_TRAINING)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: GeneratedProgram & { publish?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { programName, modules, publish, brief } = body

  if (!programName || typeof programName !== 'string' || !programName.trim()) {
    return NextResponse.json({ error: 'programName is required' }, { status: 400 })
  }
  if (!modules || !Array.isArray(modules)) {
    return NextResponse.json({ error: 'modules is required and must be an array' }, { status: 400 })
  }

  // Blocks are checked all-or-nothing before anything is written, so a
  // malformed block can't be silently dropped (see validateInteractiveBlocks).
  const blocksByLesson = new Map<string, InteractiveBlock[]>()
  for (let m = 0; m < modules.length; m++) {
    const lessons = modules[m].lessons ?? []
    for (let l = 0; l < lessons.length; l++) {
      const raw = lessons[l].interactiveBlocks ?? []
      const blocks = validateInteractiveBlocks(raw)
      if (!blocks) {
        return NextResponse.json(
          { error: `Lesson "${lessons[l].title}": its interactive blocks are not valid` },
          { status: 400 },
        )
      }
      blocksByLesson.set(`${m}:${l}`, blocks)
    }
  }

  // A correctAnswer that matches no option makes the question unanswerable for
  // learners, so refuse the save rather than store it.
  for (const mod of modules) {
    for (const lesson of mod.lessons ?? []) {
      const broken = (lesson.quizQuestions ?? []).some(
        (q) => !Array.isArray(q.options) || !q.options.includes(q.correctAnswer),
      )
      if (broken) {
        return NextResponse.json(
          { error: `Lesson "${lesson.title}": a quiz question's correct answer is not one of its options` },
          { status: 400 },
        )
      }
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Determine the next program order
      const maxOrder = await tx.trainingProgram.aggregate({ _max: { order: true } })
      const programOrder = (maxOrder._max.order ?? 0) + 1

      // Create the training program
      const program = await tx.trainingProgram.create({
        data: {
          name: programName.trim(),
          description: describeObjectives(taughtObjectives(brief?.objectives ?? [], modules)),
          order: programOrder,
          status: 'DRAFT',
        },
      })

      const programId = program.id

      for (let modIndex = 0; modIndex < modules.length; modIndex++) {
        const mod = modules[modIndex]
        const modOrder = modIndex + 1
        const moduleId = `${programId}-mod-${modOrder}`

        await tx.module.create({
          data: {
            id: moduleId,
            title: mod.title,
            description: mod.description ?? '',
            order: modOrder,
            active: publish === true,
            programId,
          },
        })

        const lessons = mod.lessons ?? []
        for (let lesIndex = 0; lesIndex < lessons.length; lesIndex++) {
          const lesson = lessons[lesIndex]
          const lesOrder = lesIndex + 1
          const lessonId = `${moduleId}-les-${lesOrder}`

          await tx.lesson.create({
            data: {
              id: lessonId,
              moduleId,
              title: lesson.title,
              type: 'TEXT',
              content: sanitizeHtml(lesson.content ?? ''),
              interactiveBlocks: blocksByLesson.get(`${modIndex}:${lesIndex}`)?.length
                ? (blocksByLesson.get(`${modIndex}:${lesIndex}`) as object[])
                : undefined,
              order: lesOrder,
              active: publish === true,
            },
          })

          const quizQuestions = lesson.quizQuestions ?? []
          for (let qIndex = 0; qIndex < quizQuestions.length; qIndex++) {
            const q = quizQuestions[qIndex]
            await tx.quizQuestion.create({
              data: {
                lessonId,
                question: q.question,
                options: JSON.stringify(q.options),
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
                order: qIndex + 1,
              },
            })
          }
        }
      }

      return programId
    })

    return NextResponse.json({ programId: result }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save program'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Only objectives that are filled in and taught by at least one lesson are
 * promised to learners. Lessons from before objectives existed carry no ids,
 * in which case every non-blank objective is kept.
 */
function taughtObjectives(
  objectives: { id: string; text: string }[],
  modules: GeneratedProgram['modules'],
): { id: string; text: string }[] {
  const cited = new Set(modules.flatMap((m) => (m.lessons ?? []).flatMap((l) => l.objectiveIds ?? [])))
  return objectives.filter((o) => o.text.trim() && (cited.size === 0 || cited.has(o.id)))
}

/** Learners see the objectives as the programme description. */
function describeObjectives(objectives: { text: string }[]): string {
  if (objectives.length === 0) return 'AI-generated training program'
  const items = objectives.map((o) => `<li>${escapeHtml(o.text)}</li>`).join('')
  return `<p>By the end of this programme you will be able to:</p><ul>${items}</ul>`
}
