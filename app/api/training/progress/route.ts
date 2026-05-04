import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isCharityLevel } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const progress = await prisma.trainingProgress.findMany({
    where: { userId: session.user.id },
  })

  return NextResponse.json(progress)
}

const progressSchema = z.object({
  moduleId: z.string().min(1),
  lessonId: z.string().min(1).optional(),
  completed: z.boolean(),
  score: z.number().int().min(0).max(100).optional(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = progressSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const { moduleId, lessonId, completed, score } = parsed.data

    // Only allow progress writes for modules in programs the user's org is
    // entitled to. Without this any logged-in user could fabricate
    // "completed" rows for any module — pollutes per-org reports and
    // (once cleaned up) program-completion certificates.
    const moduleRow = await prisma.module.findUnique({
      where: { id: moduleId },
      select: { programId: true },
    })
    if (!moduleRow) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 })
    }
    const hasProgramAccess =
      isCharityLevel(session) ||
      (session.user.effectivePrograms ?? []).some((p) => p.id === moduleRow.programId)
    if (!hasProgramAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const progress = await prisma.trainingProgress.upsert({
      where: {
        userId_moduleId_lessonId: {
          userId: session.user.id,
          moduleId,
          lessonId: (lessonId ?? null) as string,
        },
      },
      update: {
        completed,
        score,
        completedAt: completed ? new Date() : null,
      },
      create: {
        userId: session.user.id,
        moduleId,
        lessonId,
        completed,
        score,
        completedAt: completed ? new Date() : null,
      },
    })

    return NextResponse.json(progress, { status: 201 })
  } catch (error) {
    console.error('Training progress error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
