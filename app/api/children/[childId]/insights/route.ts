import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateInsightReport } from '@/lib/gemini'
import { subDays } from 'date-fns'

export async function GET(_req: NextRequest, { params }: { params: { childId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const child = await prisma.child.findFirst({
    where: { id: params.childId, userId: session.user.id },
  })
  if (!child) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const insight = await prisma.aiInsight.findFirst({
    where: { childId: params.childId },
    orderBy: { generatedAt: 'desc' },
  })

  return NextResponse.json(insight)
}

export async function POST(_req: NextRequest, { params }: { params: { childId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const child = await prisma.child.findFirst({
    where: { id: params.childId, userId: session.user.id },
  })
  if (!child) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Get last 4 weeks of observations
  const cutoff = subDays(new Date(), 28)
  const observations = await prisma.observation.findMany({
    where: {
      childId: params.childId,
      date: { gte: cutoff },
    },
    orderBy: { date: 'desc' },
  })

  if (observations.length === 0) {
    return NextResponse.json(
      { error: 'No observations in the last 4 weeks. Please log observations first.' },
      { status: 400 }
    )
  }

  try {
    const { summary, patterns, recommendations } = await generateInsightReport(child, observations)

    const insight = await prisma.aiInsight.create({
      data: {
        childId: params.childId,
        summary,
        patterns,
        recommendations,
        disclaimer:
          'This tool supports observation and pattern recognition only. It is not a diagnostic tool. Always discuss concerns with a qualified healthcare professional such as your GP, health visitor, or SENCO.',
      },
    })

    return NextResponse.json(insight, { status: 201 })
  } catch (error) {
    console.error('Gemini insight error:', error)
    return NextResponse.json(
      { error: 'Failed to generate AI insights. Please check your API key configuration.' },
      { status: 500 }
    )
  }
}
