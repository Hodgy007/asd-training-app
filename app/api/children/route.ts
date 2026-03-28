import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createChildSchema = z.object({
  name: z.string().min(1).max(100),
  dateOfBirth: z.string().refine((d) => !isNaN(Date.parse(d)), { message: 'Invalid date' }),
  notes: z.string().max(2000).optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'CAREGIVER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const children = await prisma.child.findMany({
      where: { userId: session.user.id },
      include: {
        _count: { select: { observations: true } },
        observations: {
          select: { domain: true, date: true },
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(children)
  } catch (error) {
    console.error('GET /api/children error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'CAREGIVER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const parsed = createChildSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const { name, dateOfBirth, notes } = parsed.data

    const child = await prisma.child.create({
      data: {
        name,
        dateOfBirth: new Date(dateOfBirth),
        notes,
        userId: session.user.id,
      },
    })

    return NextResponse.json(child, { status: 201 })
  } catch (error) {
    console.error('POST /api/children error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
