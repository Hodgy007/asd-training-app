import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import prisma from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: { programId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { programId } = params

  const program = await prisma.trainingProgram.findUnique({
    where: { id: programId },
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: { _count: { select: { lessons: true } } },
      },
    },
  })

  if (!program) {
    return NextResponse.json({ error: 'Program not found' }, { status: 404 })
  }

  return NextResponse.json(program)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { programId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { programId } = params

  const existing = await prisma.trainingProgram.findUnique({ where: { id: programId } })
  if (!existing) {
    return NextResponse.json({ error: 'Program not found' }, { status: 404 })
  }

  const body = await req.json()
  const allowedFields = [
    'name', 'description', 'order', 'active', 'version',
    'status', 'reviewedAt', 'reviewedBy', 'reviewNotes',
  ]

  const data: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      data[field] = body[field]
    }
  }

  const program = await prisma.trainingProgram.update({
    where: { id: programId },
    data,
  })

  return NextResponse.json(program)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { programId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { programId } = params

  const program = await prisma.trainingProgram.findUnique({
    where: { id: programId },
    include: { _count: { select: { modules: true } } },
  })

  if (!program) {
    return NextResponse.json({ error: 'Program not found' }, { status: 404 })
  }

  if (program._count.modules > 0) {
    return NextResponse.json(
      { error: 'Cannot delete a program that has modules. Remove all modules first.' },
      { status: 400 }
    )
  }

  await prisma.trainingProgram.delete({ where: { id: programId } })

  return NextResponse.json({ success: true })
}
