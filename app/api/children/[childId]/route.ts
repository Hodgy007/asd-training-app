import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

async function getChildOrFail(childId: string, userId: string) {
  const child = await prisma.child.findFirst({
    where: { id: childId, userId },
  })
  return child
}

export async function GET(_req: NextRequest, { params }: { params: { childId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'CAREGIVER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const child = await getChildOrFail(params.childId, session.user.id)
  if (!child) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(child)
}

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  dateOfBirth: z
    .string()
    .refine((d) => !isNaN(Date.parse(d)))
    .optional(),
  notes: z.string().max(2000).optional(),
})

export async function PUT(req: NextRequest, { params }: { params: { childId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'CAREGIVER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const child = await getChildOrFail(params.childId, session.user.id)
  if (!child) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const updated = await prisma.child.update({
      where: { id: params.childId },
      data: {
        ...parsed.data,
        ...(parsed.data.dateOfBirth ? { dateOfBirth: new Date(parsed.data.dateOfBirth) } : {}),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { childId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'CAREGIVER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const child = await getChildOrFail(params.childId, session.user.id)
  if (!child) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.child.delete({ where: { id: params.childId } })
  return NextResponse.json({ success: true })
}
