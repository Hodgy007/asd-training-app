import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const ALLOWED_ROLES = ['CAREER_DEV_OFFICER', 'STUDENT', 'INTERN', 'EMPLOYEE']

const updateCVSchema = z.object({
  fullName: z.string().max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  city: z.string().max(100).optional(),
  postcode: z.string().max(20).optional(),
  linkedIn: z.string().max(500).optional(),
  personalStatement: z.string().max(5000).optional(),
  interests: z.string().max(2000).optional(),
  refsAvailableOnRequest: z.boolean().optional(),
  template: z.enum(['ACCESSIBLE', 'MODERN', 'CLASSIC']).optional(),
  status: z.enum(['DRAFT', 'COMPLETE']).optional(),
  currentStep: z.number().int().min(0).optional(),
  title: z.string().min(1).max(200).optional(),
})

export async function GET(_req: NextRequest, { params }: { params: { cvId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const cv = await prisma.cV.findFirst({
      where: { id: params.cvId, userId: session.user.id },
      include: {
        workExperiences: { orderBy: { order: 'asc' } },
        educationEntries: { orderBy: { order: 'asc' } },
        skills: { orderBy: { order: 'asc' } },
        references: { orderBy: { order: 'asc' } },
      },
    })

    if (!cv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(cv)
  } catch (error) {
    console.error('GET /api/cv-builder/[cvId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { cvId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const cv = await prisma.cV.findFirst({ where: { id: params.cvId, userId: session.user.id } })
  if (!cv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const body = await req.json()
    const parsed = updateCVSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const updated = await prisma.cV.update({
      where: { id: params.cvId },
      data: parsed.data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH /api/cv-builder/[cvId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { cvId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const cv = await prisma.cV.findFirst({ where: { id: params.cvId, userId: session.user.id } })
  if (!cv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.cV.delete({ where: { id: params.cvId } })
  return NextResponse.json({ success: true })
}
