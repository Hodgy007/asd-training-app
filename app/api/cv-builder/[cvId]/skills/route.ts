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

const createSkillSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().max(100).optional(),
  order: z.number().int().min(0).optional(),
})

const bulkSkillsSchema = z.array(
  z.object({
    name: z.string().min(1).max(100),
    category: z.string().max(100).optional(),
    order: z.number().int().min(0).optional(),
  })
)

export async function GET(_req: NextRequest, { params }: { params: { cvId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const cv = await verifyCVOwnership(params.cvId, session.user.id)
  if (!cv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const skills = await prisma.cVSkill.findMany({
      where: { cvId: params.cvId },
      orderBy: { order: 'asc' },
    })
    return NextResponse.json(skills)
  } catch (error) {
    console.error('GET /api/cv-builder/[cvId]/skills error:', error)
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
    const parsed = createSkillSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const skill = await prisma.cVSkill.create({
      data: {
        cvId: params.cvId,
        ...parsed.data,
      },
    })

    return NextResponse.json(skill, { status: 201 })
  } catch (error) {
    console.error('POST /api/cv-builder/[cvId]/skills error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { cvId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const cv = await verifyCVOwnership(params.cvId, session.user.id)
  if (!cv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const body = await req.json()
    const parsed = bulkSkillsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    // Delete all existing skills and replace with new ones
    await prisma.$transaction([
      prisma.cVSkill.deleteMany({ where: { cvId: params.cvId } }),
      ...parsed.data.map((skill, index) =>
        prisma.cVSkill.create({
          data: {
            cvId: params.cvId,
            name: skill.name,
            category: skill.category,
            order: skill.order ?? index,
          },
        })
      ),
    ])

    const skills = await prisma.cVSkill.findMany({
      where: { cvId: params.cvId },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json(skills)
  } catch (error) {
    console.error('PUT /api/cv-builder/[cvId]/skills error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
