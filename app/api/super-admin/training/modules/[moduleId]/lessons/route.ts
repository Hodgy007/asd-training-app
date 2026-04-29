import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import prisma from '@/lib/prisma'
import { LessonType } from '@prisma/client'

interface Params {
  params: { moduleId: string }
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_TRAINING)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const module = await prisma.module.findUnique({ where: { id: params.moduleId } })
  if (!module) {
    return NextResponse.json({ error: 'Module not found' }, { status: 404 })
  }

  const body = await req.json()
  const { id, title, type, content, videoUrl, order, surveyId } = body

  if (!id || !title || !type || content == null || order == null) {
    return NextResponse.json({ error: 'Missing required fields: id, title, type, content, order' }, { status: 400 })
  }

  // IDs end up in URLs; only allow URL-safe characters to avoid encoding bugs.
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return NextResponse.json(
      { error: 'Invalid id: only letters, numbers, underscores, and hyphens are allowed (no spaces or special characters).' },
      { status: 400 },
    )
  }

  if (!Object.values(LessonType).includes(type)) {
    return NextResponse.json({ error: `Invalid type. Must be one of: ${Object.values(LessonType).join(', ')}` }, { status: 400 })
  }

  if (type === LessonType.SURVEY) {
    if (!surveyId || typeof surveyId !== 'string') {
      return NextResponse.json({ error: 'Survey lessons must be linked to a published survey.' }, { status: 400 })
    }
    const survey = await prisma.survey.findFirst({
      where: {
        id: surveyId,
        status: 'PUBLISHED',
        OR: [
          { closesAt: null },
          { closesAt: { gt: new Date() } },
        ],
      },
      select: { id: true },
    })
    if (!survey) {
      return NextResponse.json({ error: 'Linked survey must be published and open.' }, { status: 400 })
    }
  }

  const existing = await prisma.lesson.findUnique({ where: { id } })
  if (existing) {
    return NextResponse.json({ error: 'A lesson with that id already exists.' }, { status: 409 })
  }

  const lesson = await prisma.lesson.create({
    data: {
      id,
      moduleId: params.moduleId,
      title,
      type,
      content,
      order,
      ...(videoUrl !== undefined && { videoUrl }),
      ...(type === LessonType.SURVEY && { surveyId }),
    },
  })

  return NextResponse.json(lesson, { status: 201 })
}
