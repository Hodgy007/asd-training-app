import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: { lessonId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const lesson = await prisma.lesson.findFirst({
    where: {
      id: params.lessonId,
      active: true,
      module: { active: true },
    },
    include: {
      quizQuestions: { orderBy: { order: 'asc' } },
      module: {
        select: {
          id: true,
          title: true,
          programId: true,
          order: true,
          lessons: {
            where: { active: true },
            orderBy: { order: 'asc' },
            select: { id: true, title: true, order: true },
          },
        },
      },
    },
  })

  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  return NextResponse.json(lesson)
}
