/**
 * Aggregate quiz analytics across all SCORM lessons. Returns one entry per
 * lesson, with per-question pct-correct rates rolled up from every learner
 * who has attempted the lesson. No individual-learner data is returned —
 * the response is intentionally anonymised so this report can sit on the
 * "improving the material" side of the line, not the "tracking learners"
 * side.
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { aggregateQuizPerformance } from '@/lib/scorm/quiz-analytics'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.VIEW_REPORTS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const scormLessons = await prisma.lesson.findMany({
    where: { type: 'SCORM' },
    select: {
      id: true,
      title: true,
      module: {
        select: {
          id: true,
          title: true,
          program: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { title: 'asc' },
  })

  const lessonIds = scormLessons.map((l) => l.id)
  if (lessonIds.length === 0) {
    return NextResponse.json({ lessons: [] })
  }

  const rows = await prisma.trainingProgress.findMany({
    where: { lessonId: { in: lessonIds } },
    select: { lessonId: true, interactionData: true },
  })

  // Bucket each row's CMI snapshot under its lesson. `lessonId` is nullable
  // on the model (module-level progress rows have it as null) — skip those.
  const byLesson = new Map<string, Array<Record<string, string>>>()
  for (const row of rows) {
    if (!row.lessonId) continue
    const cmi = (row.interactionData as { scorm?: Record<string, string> } | null)
      ?.scorm
    if (!cmi || typeof cmi !== 'object') continue
    let arr = byLesson.get(row.lessonId)
    if (!arr) {
      arr = []
      byLesson.set(row.lessonId, arr)
    }
    arr.push(cmi)
  }

  const lessons = scormLessons.map((l) => {
    const snapshots = byLesson.get(l.id) ?? []
    const questions = aggregateQuizPerformance(snapshots)
    return {
      lessonId: l.id,
      lessonTitle: l.title,
      moduleTitle: l.module.title,
      programName: l.module.program.name,
      learnerCount: snapshots.length,
      questions,
    }
  })

  return NextResponse.json({ lessons })
}
