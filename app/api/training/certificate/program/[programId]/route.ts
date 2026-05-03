import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isCharityLevel } from '@/lib/rbac'
import { getUserPrograms } from '@/lib/modules'
import { renderProgramCertificateToBuffer } from '@/lib/certificate-template'

export async function GET(
  _req: NextRequest,
  { params }: { params: { programId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch the program with all active modules and their active lessons
    const program = await prisma.trainingProgram.findFirst({
      where: { id: params.programId, active: true },
      include: {
        modules: {
          where: { active: true },
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              where: { active: true },
              select: { id: true },
            },
          },
        },
      },
    })

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    // Check access: charity-level users can preview all; others use the canonical
    // resolver (org / cohort / per-user IL all unioned).
    if (!isCharityLevel(session)) {
      const allowed = await getUserPrograms(session.user.id)
      if (!allowed.some((p) => p.id === params.programId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Collect all lesson IDs across all modules
    const allLessonIds: string[] = []
    for (const mod of program.modules) {
      for (const lesson of mod.lessons) {
        allLessonIds.push(lesson.id)
      }
    }

    if (allLessonIds.length === 0) {
      return NextResponse.json({ error: 'No lessons found in this program' }, { status: 404 })
    }

    // Fetch user's completed progress for all modules in this program
    const moduleIds = program.modules.map((m) => m.id)
    const progress = await prisma.trainingProgress.findMany({
      where: {
        userId: session.user.id,
        moduleId: { in: moduleIds },
        completed: true,
      },
      select: { lessonId: true, completedAt: true },
    })

    const completedLessonIds = new Set(progress.map((p) => p.lessonId))
    const allCompleted = allLessonIds.every((id) => completedLessonIds.has(id))

    if (!allCompleted) {
      return NextResponse.json(
        { error: 'You must complete all modules in this program before downloading your certificate' },
        { status: 403 }
      )
    }

    // Get user's organisation name
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { organisation: { select: { name: true } } },
    })

    const orgName = user?.organisation?.name ?? ''

    // Completion date = latest completedAt across all progress records
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

    const moduleNames = program.modules.map((m) => m.title)

    const buffer = await renderProgramCertificateToBuffer({
      name: session.user.name || 'Learner',
      programName: program.name,
      modules: moduleNames,
      date: formattedDate,
      orgName,
    })

    const safeName = program.name.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-')

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="certificate-${safeName}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Program certificate generation error:', error)
    return NextResponse.json({ error: 'Failed to generate certificate' }, { status: 500 })
  }
}
