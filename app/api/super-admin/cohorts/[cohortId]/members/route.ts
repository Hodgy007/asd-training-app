import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { validatePassword } from '@/lib/password-validation'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'

const addMemberSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.literal('LEARNER').default('LEARNER'),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { cohortId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_COHORTS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const cohort = await prisma.organisation.findFirst({
    where: { id: params.cohortId, orgType: 'COHORT' },
  })
  if (!cohort) return NextResponse.json({ error: 'Cohort not found' }, { status: 404 })

  const body = await req.json()
  const parsed = addMemberSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const passwordCheck = validatePassword(parsed.data.password)
  if (!passwordCheck.valid) {
    return NextResponse.json({ error: passwordCheck.error }, { status: 400 })
  }

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
      role: parsed.data.role as Role,
      organisationId: params.cohortId,
      mustChangePassword: true,
      active: true,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })

  return NextResponse.json(user, { status: 201 })
}
