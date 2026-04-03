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

const updateReferenceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  jobTitle: z.string().max(200).nullable().optional(),
  organisation: z.string().max(200).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  relationship: z.string().max(200).nullable().optional(),
  order: z.number().int().min(0).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { cvId: string; refId: string } }
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
    const parsed = updateReferenceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const result = await prisma.cVReference.updateMany({
      where: { id: params.refId, cvId: params.cvId },
      data: parsed.data,
    })

    if (result.count === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const updated = await prisma.cVReference.findUnique({ where: { id: params.refId } })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH /api/cv-builder/[cvId]/references/[refId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { cvId: string; refId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const cv = await verifyCVOwnership(params.cvId, session.user.id)
  if (!cv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const deleted = await prisma.cVReference.deleteMany({
    where: { id: params.refId, cvId: params.cvId },
  })

  if (deleted.count === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
