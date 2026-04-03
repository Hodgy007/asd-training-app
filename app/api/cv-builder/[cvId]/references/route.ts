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

const createReferenceSchema = z.object({
  name: z.string().min(1).max(200),
  jobTitle: z.string().max(200).optional(),
  organisation: z.string().max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  relationship: z.string().max(200).optional(),
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
    const references = await prisma.cVReference.findMany({
      where: { cvId: params.cvId },
      orderBy: { order: 'asc' },
    })
    return NextResponse.json(references)
  } catch (error) {
    console.error('GET /api/cv-builder/[cvId]/references error:', error)
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
    const parsed = createReferenceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const reference = await prisma.cVReference.create({
      data: {
        cvId: params.cvId,
        ...parsed.data,
      },
    })

    return NextResponse.json(reference, { status: 201 })
  } catch (error) {
    console.error('POST /api/cv-builder/[cvId]/references error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
