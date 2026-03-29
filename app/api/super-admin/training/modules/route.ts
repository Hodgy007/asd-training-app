import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { getAllModules } from '@/lib/training-db'
import prisma from '@/lib/prisma'
import { ModuleType } from '@prisma/client'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const modules = await getAllModules()
  return NextResponse.json(modules)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { id, title, description, type, order } = body

  if (!id || !title || !description || !type || order == null) {
    return NextResponse.json({ error: 'Missing required fields: id, title, description, type, order' }, { status: 400 })
  }

  if (!Object.values(ModuleType).includes(type)) {
    return NextResponse.json({ error: `Invalid type. Must be one of: ${Object.values(ModuleType).join(', ')}` }, { status: 400 })
  }

  const existing = await prisma.module.findUnique({ where: { id } })
  if (existing) {
    return NextResponse.json({ error: 'A module with that id already exists.' }, { status: 409 })
  }

  const module = await prisma.module.create({
    data: { id, title, description, type, order },
  })

  return NextResponse.json(module, { status: 201 })
}
