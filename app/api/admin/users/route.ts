import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isOrgAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const createSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.string(),
  password: z.string().min(8).max(128).optional(),
  ssoOnly: z.boolean().default(false),
  allowedModuleIds: z.array(z.string()).default([]),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = session.user.organisationId
  if (!orgId) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const role = searchParams.get('role') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize = 20

  const where: Record<string, unknown> = { organisationId: orgId }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (role) {
    where.role = role
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, name: true, email: true, role: true, active: true,
        allowedModuleIds: true, mustChangePassword: true, createdAt: true,
        _count: { select: { children: true, trainingProgress: true } },
      },
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({ users, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = session.user.organisationId
  if (!orgId) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  const org = await prisma.organisation.findUnique({
    where: { id: orgId },
    select: { allowedRoles: true, allowedModuleIds: true },
  })
  if (!org) return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  if (!org.allowedRoles.includes(parsed.data.role)) {
    return NextResponse.json({ error: 'Role not permitted for this organisation' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (existing) {
    return NextResponse.json({ error: 'A user with that email already exists.' }, { status: 409 })
  }

  let hashedPassword = ''
  let mustChangePassword = false

  if (parsed.data.ssoOnly) {
    hashedPassword = ''
    mustChangePassword = false
  } else {
    if (!parsed.data.password) {
      return NextResponse.json({ error: 'Password is required for non-SSO users' }, { status: 400 })
    }
    hashedPassword = await bcrypt.hash(parsed.data.password, 12)
    mustChangePassword = true
  }

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: hashedPassword,
      role: parsed.data.role as any,
      organisationId: orgId,
      allowedModuleIds: parsed.data.allowedModuleIds,
      mustChangePassword,
      active: true,
    },
    select: { id: true, name: true, email: true, role: true },
  })

  return NextResponse.json(user, { status: 201 })
}
