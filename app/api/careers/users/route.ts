import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canManageStudents, CDO_MANAGED_ROLES } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { validatePassword } from '@/lib/password-validation'
import { Role } from '@prisma/client'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const MANAGED_ROLES: Role[] = CDO_MANAGED_ROLES as Role[]

const createSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(['STUDENT', 'INTERN', 'EMPLOYEE']),
  password: z.string().max(128).optional(),
  ssoOnly: z.boolean().default(false),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!canManageStudents(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = session!.user.organisationId
  if (!orgId) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const role = searchParams.get('role') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize = 20

  const where: Record<string, unknown> = {
    organisationId: orgId,
    role: role && (MANAGED_ROLES as string[]).includes(role) ? (role as Role) : { in: MANAGED_ROLES },
    pendingApproval: false,
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, name: true, email: true, role: true, active: true,
        mustChangePassword: true, createdAt: true, password: true,
        _count: {
          select: {
            trainingProgress: true,
            cvs: true,
            careerAdvisorSessions: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ])

  const usersOut = users.map(({ password, ...rest }) => ({
    ...rest,
    ssoOnly: password === '',
  }))

  return NextResponse.json({
    users: usersOut,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!canManageStudents(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = session!.user.organisationId
  if (!orgId) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  const org = await prisma.organisation.findUnique({
    where: { id: orgId },
    select: { allowedRoles: true },
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
  } else {
    if (!parsed.data.password) {
      return NextResponse.json({ error: 'Password is required for non-SSO users' }, { status: 400 })
    }
    const passwordCheck = validatePassword(parsed.data.password)
    if (!passwordCheck.valid) {
      return NextResponse.json({ error: passwordCheck.error }, { status: 400 })
    }
    hashedPassword = await bcrypt.hash(parsed.data.password, 12)
    mustChangePassword = true
  }

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: hashedPassword,
      role: parsed.data.role as Role,
      organisationId: orgId,
      mustChangePassword,
      active: true,
    },
    select: { id: true, name: true, email: true, role: true },
  })

  return NextResponse.json(user, { status: 201 })
}
