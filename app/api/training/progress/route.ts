import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
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
