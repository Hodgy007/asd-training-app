import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isOrgAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { validatePassword } from '@/lib/password-validation'
import { canManageChildOrg } from '@/lib/org-hierarchy'
import { Role } from '@prisma/client'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const createSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.string(),
  password: z.string().max(128).optional(),
  ssoOnly: z.boolean().default(false),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const sessionOrgId = session.user.organisationId
  if (!sessionOrgId) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  const { searchParams } = new URL(req.url)

  // Parent org drill-down: if ?orgId is provided and session org is a parent, verify relationship
  const targetOrgId = searchParams.get('orgId')
  let orgId = sessionOrgId
  if (targetOrgId && session.user.isParentOrg) {
    const canManage = await canManageChildOrg(session, targetOrgId)
    if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    orgId = targetOrgId
  }

  const search = searchParams.get('search') ?? ''
  const role = searchParams.get('role') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize = 20

  const where: Record<string, unknown> = { organisationId: orgId, pendingApproval: false }

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
        mustChangePassword: true, createdAt: true,
        _count: { select: { trainingProgress: true } },
      },
    }),
    prisma.user.count({ where }),
  ])

  // Don't read the bcrypt hash to compute ssoOnly. A separate id-only
  // query asks the DB which of these users have no password (SSO users
  // have password: null; legacy rows may have ''), and we merge the
  // boolean back. Avoids the risk of a future logger / refactor leaking
  // the hash that was sitting on the response object.
  const ssoOnlyIds = users.length > 0
    ? new Set(
        (
          await prisma.user.findMany({
            where: {
              id: { in: users.map((u) => u.id) },
              OR: [{ password: null }, { password: '' }],
            },
            select: { id: true },
          })
        ).map((u) => u.id),
      )
    : new Set<string>()

  const usersWithSso = users.map((u) => ({ ...u, ssoOnly: ssoOnlyIds.has(u.id) }))

  return NextResponse.json({ users: usersWithSso, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const sessionOrgId = session.user.organisationId
  if (!sessionOrgId) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  // Parent-org drill-down: parent admins can create users in any of their
  // child orgs by passing ?orgId=. GET already supports this — without the
  // matching POST support a parent admin could only LIST child-org users
  // but never create them, breaking the flow.
  const { searchParams } = new URL(req.url)
  const targetOrgId = searchParams.get('orgId')
  let orgId = sessionOrgId
  if (targetOrgId && targetOrgId !== sessionOrgId) {
    if (!session.user.isParentOrg) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const canManage = await canManageChildOrg(session, targetOrgId)
    if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    orgId = targetOrgId
  }

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
    mustChangePassword = false
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
