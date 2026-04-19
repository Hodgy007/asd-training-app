import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canManageJobs } from '@/lib/rbac'
import { autoCloseExpiredJobs } from '@/lib/jobs'
import { createJobSchema } from '@/lib/validators/jobs'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!canManageJobs(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await autoCloseExpiredJobs()

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const employer = searchParams.get('employer')

  const jobs = await prisma.jobOpening.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(employer ? { employer: { contains: employer, mode: 'insensitive' } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { employer: { contains: search, mode: 'insensitive' } },
              { summary: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { assignments: true, attachments: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ jobs })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!canManageJobs(session) || !session?.user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = createJobSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 })
  }

  const job = await prisma.jobOpening.create({
    data: { ...parsed.data, createdById: session.user.id },
  })

  return NextResponse.json({ job }, { status: 201 })
}
