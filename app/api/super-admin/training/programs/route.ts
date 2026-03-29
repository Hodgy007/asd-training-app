import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import prisma from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const programs = await prisma.trainingProgram.findMany({
    orderBy: { order: 'asc' },
    include: { _count: { select: { modules: true } } },
  })

  return NextResponse.json(programs)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { name, description, version, status } = body

  if (!name) {
    return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 })
  }

  // Auto-generate order as max + 1
  const maxOrder = await prisma.trainingProgram.aggregate({ _max: { order: true } })
  const order = (maxOrder._max.order ?? 0) + 1

  const program = await prisma.trainingProgram.create({
    data: {
      name,
      description: description ?? null,
      order,
      version: version ?? '1.0',
      status: status ?? 'DRAFT',
    },
  })

  return NextResponse.json(program, { status: 201 })
}
