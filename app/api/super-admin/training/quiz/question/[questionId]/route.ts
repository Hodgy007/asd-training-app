import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import prisma from '@/lib/prisma'

interface Params {
  params: { questionId: string }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await prisma.quizQuestion.findUnique({ where: { id: params.questionId } })
  if (!existing) {
    return NextResponse.json({ error: 'Quiz question not found' }, { status: 404 })
  }

  const body = await req.json()
  const { question, options, correctAnswer, explanation, order } = body

  const updated = await prisma.quizQuestion.update({
    where: { id: params.questionId },
    data: {
      ...(question !== undefined && { question }),
      ...(options !== undefined && { options: Array.isArray(options) ? JSON.stringify(options) : options }),
      ...(correctAnswer !== undefined && { correctAnswer }),
      ...(explanation !== undefined && { explanation }),
      ...(order !== undefined && { order }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await prisma.quizQuestion.findUnique({ where: { id: params.questionId } })
  if (!existing) {
    return NextResponse.json({ error: 'Quiz question not found' }, { status: 404 })
  }

  await prisma.quizQuestion.delete({ where: { id: params.questionId } })
  return NextResponse.json({ success: true })
}
