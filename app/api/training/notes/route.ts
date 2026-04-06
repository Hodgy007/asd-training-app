import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const putSchema = z.object({
  lessonId: z.string().min(1),
  content: z.string(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const lessonId = req.nextUrl.searchParams.get('lessonId')
  if (!lessonId) {
    return NextResponse.json({ error: 'Missing lessonId' }, { status: 400 })
  }

  const note = await prisma.lessonNote.findUnique({
    where: {
      userId_lessonId: {
        userId: session.user.id,
        lessonId,
      },
    },
    select: { content: true },
  })

  return NextResponse.json({ content: note?.content ?? '' })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = putSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { lessonId, content } = parsed.data

  await prisma.lessonNote.upsert({
    where: {
      userId_lessonId: {
        userId: session.user.id,
        lessonId,
      },
    },
    update: { content },
    create: {
      userId: session.user.id,
      lessonId,
      content,
    },
  })

  return NextResponse.json({ ok: true })
}
