import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isOrgAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { canManageChildOrg, getEffectiveOrgSettings } from '@/lib/org-hierarchy'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const createUserSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  role: z.string(),
  password: z.string().min(8).max(128).optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { orgId } = params

  const allowed = await canManageChildOrg(session, orgId)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const role = searchParams.get('role') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20')))

  const where: Record<string, unknown> = {
    organisationId: orgId,
    role: { notIn: ['SUPER_ADMIN', 'CHARITY_EMPLOYEE'] },
  }

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
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({
    users,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { orgId } = params

  const allowed = await canManageChildOrg(session, orgId)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const data = parsed.data

  // Validate role against effective settings for this child org
  const effectiveSettings = await getEffectiveOrgSettings(orgId)
  if (!effectiveSettings.allowedRoles.includes(data.role)) {
    return NextResponse.json(
      { error: 'Role not allowed for this organisation' },
      { status: 400 }
    )
  }

  // Check email uniqueness
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  })
  if (existingUser) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  }

  // Hash password if provided
  let hashedPassword: string | null = null
  if (data.password) {
    hashedPassword = await bcrypt.hash(data.password, 12)
  }

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: data.role as never,
      password: hashedPassword,
      mustChangePassword: !!data.password,
      organisationId: orgId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      mustChangePassword: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ user }, { status: 201 })
}
