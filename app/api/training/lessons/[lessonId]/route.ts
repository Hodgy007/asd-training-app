import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isCharityLevel } from '@/lib/rbac'

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
      attachments: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, fileName: true, fileSize: true, url: true },
      },
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
      survey: {
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          closesAt: true,
          questions: { orderBy: { order: 'asc' } },
          responses: {
            where: { userId: session.user.id, completedAt: { not: null } },
            select: { id: true, completedAt: true },
            take: 1,
          },
        },
      },
    },
  })

  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  const hasProgramAccess =
    isCharityLevel(session) ||
    (session.user.effectivePrograms ?? []).some((program) => program.id === lesson.module.programId)

  if (!hasProgramAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Replace raw Blob URLs with auth-gated proxy URLs so attachments stay
  // bound to live program entitlement, not whoever ever held the URL.
  const sanitised = {
    ...lesson,
    attachments: lesson.attachments.map((a) => ({
      ...a,
      url: `/api/training/attachments/${a.id}/file`,
    })),
  }

  return NextResponse.json(sanitised)
}
