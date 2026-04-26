import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const patchSchema = z.object({
  status: z.enum(['NEW', 'IN_PROGRESS', 'RESOLVED']).optional(),
  adminNotes: z.string().max(5000).nullable().optional(),
})

interface Ctx { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await ctx.params

  const submission = await prisma.feedbackSubmission.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      organisation: { select: { id: true, name: true } },
      resolvedBy: { select: { id: true, name: true, email: true } },
    },
  })

  if (!submission) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(submission)
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await ctx.params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const existing = await prisma.feedbackSubmission.findUnique({ where: { id }, select: { status: true } })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data: {
    status?: 'NEW' | 'IN_PROGRESS' | 'RESOLVED'
    adminNotes?: string | null
    resolvedAt?: Date | null
    resolvedById?: string | null
  } = {}
  if (parsed.data.status !== undefined) data.status = parsed.data.status
  if (parsed.data.adminNotes !== undefined) data.adminNotes = parsed.data.adminNotes

  if (parsed.data.status === 'RESOLVED' && existing.status !== 'RESOLVED') {
    data.resolvedAt = new Date()
    data.resolvedById = session.user.id
  }
  if (parsed.data.status && parsed.data.status !== 'RESOLVED' && existing.status === 'RESOLVED') {
    data.resolvedAt = null
    data.resolvedById = null
  }

  const updated = await prisma.feedbackSubmission.update({
    where: { id },
    data,
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      organisation: { select: { id: true, name: true } },
      resolvedBy: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json(updated)
}
