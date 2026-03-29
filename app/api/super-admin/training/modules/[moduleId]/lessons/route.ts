import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import prisma from '@/lib/prisma'
import { LessonType } from '@prisma/client'

interface Params {
  params: { moduleId: string }
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const module = await prisma.module.findUnique({ where: { id: params.moduleId } })
  if (!module) {
    return NextResponse.json({ error: 'Module not found' }, { status: 404 })
  }

  const body = await req.json()
  const { id, title, type, content, videoUrl, order } = body

  if (!id || !title || !type || content == null || order == null) {
    return NextResponse.json({ error: 'Missing required fields: id, title, type, content, order' }, { status: 400 })
  }

  if (!Object.values(LessonType).includes(type)) {
    return NextResponse.json({ error: `Invalid type. Must be one of: ${Object.values(LessonType).join(', ')}` }, { status: 400 })
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
    },
  })

  return NextResponse.json(lesson, { status: 201 })
}
