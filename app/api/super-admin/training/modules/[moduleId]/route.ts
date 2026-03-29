import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { getModuleById } from '@/lib/training-db'
import prisma from '@/lib/prisma'
import { ModuleType } from '@prisma/client'

interface Params {
  params: { moduleId: string }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
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
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await prisma.module.findUnique({ where: { id: params.moduleId } })
  if (!existing) {
    return NextResponse.json({ error: 'Module not found' }, { status: 404 })
  }

  const body = await req.json()
  const { title, description, type, order, active } = body

  if (type !== undefined && !Object.values(ModuleType).includes(type)) {
    return NextResponse.json({ error: `Invalid type. Must be one of: ${Object.values(ModuleType).join(', ')}` }, { status: 400 })
  }

  const updated = await prisma.module.update({
    where: { id: params.moduleId },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(type !== undefined && { type }),
      ...(order !== undefined && { order }),
      ...(active !== undefined && { active }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await prisma.module.findUnique({ where: { id: params.moduleId } })
  if (!existing) {
    return NextResponse.json({ error: 'Module not found' }, { status: 404 })
  }

  // Safety check: block deletion if any TrainingProgress records reference this module
  const progressCount = await prisma.trainingProgress.count({
    where: { moduleId: params.moduleId },
  })
  if (progressCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete module: ${progressCount} training progress record(s) reference it.` },
      { status: 400 }
    )
  }

  await prisma.module.delete({ where: { id: params.moduleId } })
  return NextResponse.json({ success: true })
}
