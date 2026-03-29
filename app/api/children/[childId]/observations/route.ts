import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const observationSchema = z.object({
  date: z.string().refine((d) => !isNaN(Date.parse(d))),
  behaviourType: z.string().min(1).max(200),
  domain: z.enum(['SOCIAL_COMMUNICATION', 'BEHAVIOUR_AND_PLAY', 'SENSORY_RESPONSES']),
  frequency: z.enum(['RARE', 'SOMETIMES', 'OFTEN']),
  context: z.enum(['HOME', 'NURSERY', 'OUTDOORS', 'OTHER']),
  notes: z.string().max(2000).optional(),
})

export async function GET(_req: NextRequest, { params }: { params: { childId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'CAREGIVER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify ownership
  const child = await prisma.child.findFirst({
    where: { id: params.childId, userId: session.user.id },
  })
  if (!child) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const observations = await prisma.observation.findMany({
    where: { childId: params.childId },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json(observations)
}

export async function POST(req: NextRequest, { params }: { params: { childId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'CAREGIVER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const child = await prisma.child.findFirst({
    where: { id: params.childId, userId: session.user.id },
  })
  if (!child) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const body = await req.json()
    const parsed = observationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const observation = await prisma.observation.create({
      data: {
        ...parsed.data,
        date: new Date(parsed.data.date),
        childId: params.childId,
      },
    })

    return NextResponse.json(observation, { status: 201 })
  } catch (error) {
    console.error('POST observation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
