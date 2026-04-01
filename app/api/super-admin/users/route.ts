import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin, ALL_CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { validatePassword } from '@/lib/password-validation'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Valid email required'),
  password: z.string().min(1),
  role: z.enum(['SUPER_ADMIN', 'CHARITY_EMPLOYEE']),
  charityPermissions: z.array(z.string()).default([]),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    where: { role: { in: ['SUPER_ADMIN', 'CHARITY_EMPLOYEE'] } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      charityPermissions: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  // Validate permissions are real permission keys
  const invalidPerms = parsed.data.charityPermissions.filter(
    (p) => !ALL_CHARITY_PERMISSIONS.includes(p as any)
  )
  if (invalidPerms.length > 0) {
    return NextResponse.json({ error: `Invalid permissions: ${invalidPerms.join(', ')}` }, { status: 400 })
  }

  // Validate password complexity
  const passwordCheck = validatePassword(parsed.data.password)
  if (!passwordCheck.valid) {
    return NextResponse.json({ error: passwordCheck.error }, { status: 400 })
  }

  // Check email uniqueness
  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (existing) {
    return NextResponse.json({ error: 'A user with that email already exists.' }, { status: 409 })
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 12)

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: hashedPassword,
      role: parsed.data.role,
      charityPermissions: parsed.data.role === 'SUPER_ADMIN' ? [] : parsed.data.charityPermissions,
      mustChangePassword: true,
      organisationId: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      charityPermissions: true,
      createdAt: true,
    },
  })

  return NextResponse.json(user, { status: 201 })
}
