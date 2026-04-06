import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const saveSchema = z.object({
  lessonId: z.string().min(1),
  moduleId: z.string().min(1),
  blockId: z.string().min(1),
  completed: z.boolean(),
  attempts: z.number().int().min(1),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = saveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { lessonId, moduleId, blockId, completed, attempts } = parsed.data

  // Upsert the TrainingProgress record for this lesson
  const existing = await prisma.trainingProgress.findUnique({
    where: {
      userId_moduleId_lessonId: {
        userId: session.user.id,
        moduleId,
        lessonId,
      },
    },
  })

  const currentData = (existing?.interactionData ?? {}) as Record<string, Record<string, unknown>>
  const updatedData = {
    ...currentData,
    [blockId]: { completed, attempts },
  }

  await prisma.trainingProgress.upsert({
    where: {
      userId_moduleId_lessonId: {
        userId: session.user.id,
        moduleId,
        lessonId,
      },
    },
    update: { interactionData: updatedData as any },  // eslint-disable-line @typescript-eslint/no-explicit-any
    create: {
      userId: session.user.id,
      moduleId,
      lessonId,
      interactionData: updatedData as any,  // eslint-disable-line @typescript-eslint/no-explicit-any
    },
  })

  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const lessonId = req.nextUrl.searchParams.get('lessonId')
  const moduleId = req.nextUrl.searchParams.get('moduleId')
  if (!lessonId || !moduleId) {
    return NextResponse.json({ error: 'Missing lessonId or moduleId' }, { status: 400 })
  }

  const progress = await prisma.trainingProgress.findUnique({
    where: {
      userId_moduleId_lessonId: {
        userId: session.user.id,
        moduleId,
        lessonId,
      },
    },
    select: { interactionData: true },
  })

  return NextResponse.json({ interactionData: progress?.interactionData ?? {} })
}
