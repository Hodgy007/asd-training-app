import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { validatePassword } from '@/lib/password-validation'
import { isSystemOrg } from '@/lib/cohort'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

// Roles this endpoint may create. ORG_ADMIN is the default for normal orgs;
// PARTICIPANT is used for the Independent Learners system org where there's no
// org admin role — charity staff manage the unaffiliated learner pool directly.
const CREATABLE_ROLES = ['ORG_ADMIN', 'PARTICIPANT'] as const

const createAdminSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(1).max(128),
  role: z.enum(CREATABLE_ROLES).optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const org = await prisma.organisation.findUnique({ where: { id: params.orgId } })
  if (!org) return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })

  const body = await req.json()
  const parsed = createAdminSchema.safeParse(body)
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

  // Default to ORG_ADMIN unless the caller explicitly asks for PARTICIPANT,
  // and only allow PARTICIPANT on the Independent Learners system org so we
  // don't accidentally create unaffiliated-learner accounts inside a real org.
  let role: 'ORG_ADMIN' | 'PARTICIPANT' = parsed.data.role ?? 'ORG_ADMIN'
  if (role === 'PARTICIPANT' && !isSystemOrg(org)) {
    return NextResponse.json(
      { error: 'PARTICIPANT can only be created on the Independent Learners system org.' },
      { status: 400 }
    )
  }
  // System org never has an org admin — collapse any attempt to create one.
  if (isSystemOrg(org) && role === 'ORG_ADMIN') role = 'PARTICIPANT'

  const hashedPassword = await bcrypt.hash(parsed.data.password, 12)

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: hashedPassword,
      role,
      organisationId: params.orgId,
      mustChangePassword: true,
      active: true,
    },
    select: { id: true, name: true, email: true, role: true },
  })

  return NextResponse.json(user, { status: 201 })
}
