import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { getLessonById } from '@/lib/training-db'
import prisma from '@/lib/prisma'
import { LessonType } from '@prisma/client'

interface Params {
  params: { lessonId: string }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const lesson = await getLessonById(params.lessonId)
  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  // Include module info
  const lessonWithModule = await prisma.lesson.findUnique({
    where: { id: params.lessonId },
    include: {
      module: true,
      quizQuestions: { orderBy: { order: 'asc' } },
    },
  })

  return NextResponse.json(lessonWithModule)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await prisma.lesson.findUnique({ where: { id: params.lessonId } })
  if (!existing) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  const body = await req.json()
  const { title, type, content, videoUrl, order, active } = body

  if (type !== undefined && !Object.values(LessonType).includes(type)) {
    return NextResponse.json({ error: `Invalid type. Must be one of: ${Object.values(LessonType).join(', ')}` }, { status: 400 })
  }

  const updated = await prisma.lesson.update({
    where: { id: params.lessonId },
    data: {
      ...(title !== undefined && { title }),
      ...(type !== undefined && { type }),
      ...(content !== undefined && { content }),
      ...(videoUrl !== undefined && { videoUrl }),
      ...(order !== undefined && { order }),
      ...(active !== undefined && { active }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await prisma.lesson.findUnique({ where: { id: params.lessonId } })
  if (!existing) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  await prisma.lesson.delete({ where: { id: params.lessonId } })
  return NextResponse.json({ success: true })
}
