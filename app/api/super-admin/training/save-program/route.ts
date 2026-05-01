import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import prisma from '@/lib/prisma'
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

  const { programName, modules, publish } = body

  if (!programName || typeof programName !== 'string' || !programName.trim()) {
    return NextResponse.json({ error: 'programName is required' }, { status: 400 })
  }
  if (!modules || !Array.isArray(modules)) {
    return NextResponse.json({ error: 'modules is required and must be an array' }, { status: 400 })
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
          description: 'AI-generated training program',
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
              content: lesson.content ?? '',
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
