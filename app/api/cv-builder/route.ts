import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const ALLOWED_ROLES = ['CAREER_DEV_OFFICER', 'STUDENT', 'INTERN', 'EMPLOYEE']

const createCVSchema = z.object({
  title: z.string().min(1).max(200).optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const cvs = await prisma.cV.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        title: true,
        template: true,
        status: true,
        currentStep: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    })
    return NextResponse.json(cvs)
  } catch (error) {
    console.error('GET /api/cv-builder error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const parsed = createCVSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    })

    const cv = await prisma.cV.create({
      data: {
        userId: session.user.id,
        title: parsed.data.title ?? 'My CV',
        fullName: user?.name ?? null,
        email: user?.email ?? null,
      },
    })

    return NextResponse.json(cv, { status: 201 })
  } catch (error) {
    console.error('POST /api/cv-builder error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
