import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { renderCertificateToBuffer } from '@/lib/certificate-template'

export async function GET(
  _req: NextRequest,
  { params }: { params: { moduleId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch the module with its program name
    const module = await prisma.module.findUnique({
      where: { id: params.moduleId },
      include: {
        program: { select: { name: true } },
      },
    })

    if (!module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 })
    }

    // Fetch all active lessons for this module
    const lessons = await prisma.lesson.findMany({
      where: { moduleId: params.moduleId, active: true },
      select: { id: true },
    })

    if (lessons.length === 0) {
      return NextResponse.json({ error: 'No lessons found for this module' }, { status: 404 })
    }

    const lessonIds = lessons.map((l) => l.id)

    // Check user's progress for all active lessons
    const progress = await prisma.trainingProgress.findMany({
      where: {
        userId: session.user.id,
        moduleId: params.moduleId,
        lessonId: { in: lessonIds },
        completed: true,
      },
      select: { lessonId: true, completedAt: true },
    })

    const completedLessonIds = new Set(progress.map((p) => p.lessonId))
    const allCompleted = lessonIds.every((id) => completedLessonIds.has(id))

    if (!allCompleted) {
      return NextResponse.json(
        { error: 'You must complete all lessons in this module before downloading your certificate' },
        { status: 403 }
      )
    }

    // Get user's organisation name
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { organisation: { select: { name: true } } },
    })

    const orgName = user?.organisation?.name ?? ''

    // Completion date = latest completedAt from progress records
    const completionDates = progress
      .map((p) => p.completedAt)
      .filter((d): d is Date => d !== null)

    const latestDate = completionDates.length > 0
      ? new Date(Math.max(...completionDates.map((d) => d.getTime())))
      : new Date()

    const formattedDate = latestDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    const buffer = await renderCertificateToBuffer({
      name: session.user.name || 'Learner',
      moduleName: module.title,
      programName: module.program.name,
      date: formattedDate,
      orgName,
    })

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="certificate-${params.moduleId}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Certificate generation error:', error)
    return NextResponse.json({ error: 'Failed to generate certificate' }, { status: 500 })
  }
}
