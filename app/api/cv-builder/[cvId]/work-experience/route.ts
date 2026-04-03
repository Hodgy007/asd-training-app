import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const ALLOWED_ROLES = ['CAREER_DEV_OFFICER', 'STUDENT', 'INTERN', 'EMPLOYEE']

async function verifyCVOwnership(cvId: string, userId: string) {
  const cv = await prisma.cV.findFirst({ where: { id: cvId, userId } })
  return cv
}

const createWorkExpSchema = z.object({
  jobTitle: z.string().min(1).max(200),
  employer: z.string().min(1).max(200),
  startDate: z.string().min(1),
  endDate: z.string().nullable().optional(),
  isCurrent: z.boolean().optional(),
  description: z.string().max(5000).nullable().optional(),
  order: z.number().int().min(0).optional(),
})

export async function GET(_req: NextRequest, { params }: { params: { cvId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const cv = await verifyCVOwnership(params.cvId, session.user.id)
  if (!cv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const experiences = await prisma.cVWorkExperience.findMany({
      where: { cvId: params.cvId },
      orderBy: { order: 'asc' },
    })
    return NextResponse.json(experiences)
  } catch (error) {
    console.error('GET /api/cv-builder/[cvId]/work-experience error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { cvId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const cv = await verifyCVOwnership(params.cvId, session.user.id)
  if (!cv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const body = await req.json()
    const parsed = createWorkExpSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const experience = await prisma.cVWorkExperience.create({
      data: {
        cvId: params.cvId,
        ...parsed.data,
      },
    })

    return NextResponse.json(experience, { status: 201 })
  } catch (error) {
    console.error('POST /api/cv-builder/[cvId]/work-experience error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
