import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessCareersAdvisor } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  answers: z.record(z.unknown()).optional(),
  currentStep: z.number().int().min(0).max(12).optional(),
  status: z.enum(['IN_PROGRESS', 'COMPLETE']).optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!canAccessCareersAdvisor(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const advisorSession = await prisma.careerAdvisorSession.findUnique({
    where: { id: params.sessionId },
  })

  if (!advisorSession || advisorSession.userId !== session!.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(advisorSession)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!canAccessCareersAdvisor(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const advisorSession = await prisma.careerAdvisorSession.findUnique({
    where: { id: params.sessionId },
  })

  if (!advisorSession || advisorSession.userId !== session!.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {}
  if (parsed.data.answers !== undefined) updateData.answers = parsed.data.answers
  if (parsed.data.currentStep !== undefined) updateData.currentStep = parsed.data.currentStep
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status

  const updated = await prisma.careerAdvisorSession.update({
    where: { id: params.sessionId },
    data: updateData,
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!canAccessCareersAdvisor(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const advisorSession = await prisma.careerAdvisorSession.findUnique({
    where: { id: params.sessionId },
  })

  if (!advisorSession || advisorSession.userId !== session!.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.careerAdvisorSession.delete({
    where: { id: params.sessionId },
  })

  return NextResponse.json({ success: true })
}
