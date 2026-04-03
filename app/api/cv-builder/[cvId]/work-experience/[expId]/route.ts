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

const updateWorkExpSchema = z.object({
  jobTitle: z.string().min(1).max(200).optional(),
  employer: z.string().min(1).max(200).optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().nullable().optional(),
  isCurrent: z.boolean().optional(),
  description: z.string().max(5000).nullable().optional(),
  order: z.number().int().min(0).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { cvId: string; expId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const cv = await verifyCVOwnership(params.cvId, session.user.id)
  if (!cv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const body = await req.json()
    const parsed = updateWorkExpSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const experience = await prisma.cVWorkExperience.updateMany({
      where: { id: params.expId, cvId: params.cvId },
      data: parsed.data,
    })

    if (experience.count === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const updated = await prisma.cVWorkExperience.findUnique({ where: { id: params.expId } })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH /api/cv-builder/[cvId]/work-experience/[expId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { cvId: string; expId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const cv = await verifyCVOwnership(params.cvId, session.user.id)
  if (!cv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const deleted = await prisma.cVWorkExperience.deleteMany({
    where: { id: params.expId, cvId: params.cvId },
  })

  if (deleted.count === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
