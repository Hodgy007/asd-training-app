import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { mapScormStateToProgress, normaliseCmiState } from '@/lib/scorm/progress'

const bodySchema = z.object({
  moduleId: z.string(),
  lessonId: z.string(),
  cmi: z.record(z.string(), z.unknown()),
  // LMS-level TOC navigation position (leaf href). Capped at 1 KB so a
  // misbehaving client can't write large blobs through this field.
  navLocation: z.string().max(1024).optional(),
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

  const { moduleId, lessonId, navLocation } = parsed
  const cmi = normaliseCmiState(parsed.cmi)

  // Only accept progress writes for SCORM lessons — stops stray clients or
  // future refactors from stamping non-SCORM lessons with SCORM-shaped
  // interaction data.
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { type: true, moduleId: true },
  })
  if (!lesson || lesson.type !== 'SCORM' || lesson.moduleId !== moduleId) {
    return NextResponse.json({ error: 'Not a SCORM lesson' }, { status: 404 })
  }

  const update = mapScormStateToProgress(cmi, navLocation)
  const userId = session.user.id

  // Read the existing row (if any) so we can:
  //   1. Never revert `completed=true → false`. Out-of-order serverless
  //      handlers can deliver an older CMI snapshot after a newer one;
  //      we treat completion as monotonic.
  //   2. Preserve a higher previously-recorded score when a later snapshot
  //      reports a worse number (same race).
  //   3. Keep the original completedAt timestamp once a lesson is marked
  //      complete — re-marking with a later timestamp lies about when the
  //      learner actually finished.
  const existing = await prisma.trainingProgress.findUnique({
    where: {
      userId_moduleId_lessonId: { userId, moduleId, lessonId },
    },
    select: { completed: true, score: true, completedAt: true },
  })

  const completed = existing?.completed ? true : update.completed
  const score =
    existing?.score != null && update.score != null
      ? Math.max(existing.score, update.score)
      : (update.score ?? existing?.score ?? null)
  const completedAt = existing?.completedAt ?? (update.completed ? new Date() : null)

  const saved = await prisma.trainingProgress.upsert({
    where: {
      userId_moduleId_lessonId: { userId, moduleId, lessonId },
    },
    create: {
      userId,
      moduleId,
      lessonId,
      completed,
      score,
      interactionData: update.interactionData,
      completedAt,
    },
    update: {
      completed,
      score,
      interactionData: update.interactionData,
      completedAt,
    },
  })

  return NextResponse.json({ ok: true, progressId: saved.id })
}
