import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { getModuleById } from '@/lib/training-db'
import prisma from '@/lib/prisma'

interface Params {
  params: { moduleId: string }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_TRAINING)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const module = await getModuleById(params.moduleId)
  if (!module) {
    return NextResponse.json({ error: 'Module not found' }, { status: 404 })
  }

  return NextResponse.json(module)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_TRAINING)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await prisma.module.findUnique({ where: { id: params.moduleId } })
  if (!existing) {
    return NextResponse.json({ error: 'Module not found' }, { status: 404 })
  }

  const body = await req.json()
  const { title, description, programId, order, active } = body

  // Validate programId if provided
  if (programId !== undefined) {
    const program = await prisma.trainingProgram.findUnique({ where: { id: programId } })
    if (!program) {
      return NextResponse.json({ error: 'Invalid programId. Program not found.' }, { status: 400 })
    }
  }

  const updated = await prisma.module.update({
    where: { id: params.moduleId },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(programId !== undefined && { programId }),
      ...(order !== undefined && { order }),
      ...(active !== undefined && { active }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_TRAINING)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await prisma.module.findUnique({ where: { id: params.moduleId } })
  if (!existing) {
    return NextResponse.json({ error: 'Module not found' }, { status: 404 })
  }

  // Cascade: remove any training progress records referencing this module first
  await prisma.trainingProgress.deleteMany({
    where: { moduleId: params.moduleId },
  })

  // Lessons and quiz questions cascade automatically via onDelete: Cascade in schema
  await prisma.module.delete({ where: { id: params.moduleId } })
  return NextResponse.json({ success: true })
}
