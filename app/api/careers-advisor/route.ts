import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessCareersAdvisor } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!canAccessCareersAdvisor(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const sessions = await prisma.careerAdvisorSession.findMany({
    where: { userId: session!.user.id },
    select: {
      id: true,
      status: true,
      currentStep: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(sessions)
}

export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!canAccessCareersAdvisor(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const newSession = await prisma.careerAdvisorSession.create({
    data: {
      userId: session!.user.id,
      answers: {},
    },
  })

  return NextResponse.json(newSession, { status: 201 })
}
