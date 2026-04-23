import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { mapScormStateToProgress, type CmiState } from '@/lib/scorm/progress'

const bodySchema = z.object({
  moduleId: z.string(),
  lessonId: z.string(),
  cmi: z.record(z.string(), z.string()),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  let parsed
  try {
    parsed = bodySchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const { moduleId, lessonId, cmi } = parsed
  const update = mapScormStateToProgress(cmi as CmiState)

  const saved = await prisma.trainingProgress.upsert({
    where: {
      userId_moduleId_lessonId: { userId: session.user.id, moduleId, lessonId },
    },
    create: {
      userId: session.user.id,
      moduleId,
      lessonId,
      completed: update.completed,
      score: update.score,
      interactionData: update.interactionData,
      completedAt: update.completed ? new Date() : null,
    },
    update: {
      completed: update.completed,
      score: update.score,
      interactionData: update.interactionData,
      completedAt: update.completed ? new Date() : null,
    },
  })

  return NextResponse.json({ ok: true, progressId: saved.id })
}
