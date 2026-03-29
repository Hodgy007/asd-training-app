import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import prisma from '@/lib/prisma'

interface Params {
  params: { lessonId: string }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const lesson = await prisma.lesson.findUnique({ where: { id: params.lessonId } })
  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  const questions = await prisma.quizQuestion.findMany({
    where: { lessonId: params.lessonId },
    orderBy: { order: 'asc' },
  })

  return NextResponse.json(questions)
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const lesson = await prisma.lesson.findUnique({ where: { id: params.lessonId } })
  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  const body = await req.json()
  const { question, options, correctAnswer, explanation, order } = body

  if (!question || !options || !correctAnswer || !explanation || order == null) {
    return NextResponse.json({ error: 'Missing required fields: question, options, correctAnswer, explanation, order' }, { status: 400 })
  }

  // options can be an array or already-stringified JSON
  const optionsString = Array.isArray(options) ? JSON.stringify(options) : options

  const created = await prisma.quizQuestion.create({
    data: {
      lessonId: params.lessonId,
      question,
      options: optionsString,
      correctAnswer,
      explanation,
      order,
    },
  })

  return NextResponse.json(created, { status: 201 })
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const lesson = await prisma.lesson.findUnique({ where: { id: params.lessonId } })
  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  const body = await req.json()
  const items = Array.isArray(body) ? body : body.questions
  if (!Array.isArray(items)) {
    return NextResponse.json({ error: 'Request body must be an array or { questions: [...] }' }, { status: 400 })
  }

  // Bulk replace: delete all then create from array
  await prisma.$transaction([
    prisma.quizQuestion.deleteMany({ where: { lessonId: params.lessonId } }),
    prisma.quizQuestion.createMany({
      data: items.map((q: { question: string; options: string[] | string; correctAnswer: string; explanation: string; order?: number }, i: number) => ({
        lessonId: params.lessonId,
        question: q.question,
        options: Array.isArray(q.options) ? JSON.stringify(q.options) : q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        order: q.order ?? i + 1,
      })),
    }),
  ])

  const questions = await prisma.quizQuestion.findMany({
    where: { lessonId: params.lessonId },
    orderBy: { order: 'asc' },
  })

  return NextResponse.json(questions)
}
