import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { FeedbackStatus, FeedbackType, Prisma } from '@prisma/client'

const PAGE_SIZE_DEFAULT = 25

const STATUSES: FeedbackStatus[] = ['NEW', 'IN_PROGRESS', 'RESOLVED']
const TYPES: FeedbackType[] = ['BUG', 'SUGGESTION', 'QUESTION', 'OTHER']

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const statusParam = searchParams.get('status')
  const typeParam = searchParams.get('type')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || String(PAGE_SIZE_DEFAULT), 10) || PAGE_SIZE_DEFAULT))

  const where: Prisma.FeedbackSubmissionWhereInput = {}
  if (statusParam && (STATUSES as string[]).includes(statusParam)) {
    where.status = statusParam as FeedbackStatus
  }
  if (typeParam && (TYPES as string[]).includes(typeParam)) {
    where.type = typeParam as FeedbackType
  }

  const [items, total, grouped] = await Promise.all([
    prisma.feedbackSubmission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        organisation: { select: { id: true, name: true } },
      },
    }),
    prisma.feedbackSubmission.count({ where }),
    prisma.feedbackSubmission.groupBy({ by: ['status'], _count: { _all: true } }),
  ])

  const statusCounts: Record<FeedbackStatus, number> = { NEW: 0, IN_PROGRESS: 0, RESOLVED: 0 }
  for (const row of grouped) {
    statusCounts[row.status as FeedbackStatus] = row._count._all
  }

  return NextResponse.json({ items, total, page, pageSize, statusCounts })
}
