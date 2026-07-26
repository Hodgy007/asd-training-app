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
// any leaf role can be created on the Independent Learners system org so
// charity staff can provision practitioners / students / etc directly.
const SYSTEM_ORG_ROLES = ['LEARNER'] as const
const CREATABLE_ROLES = ['ORG_ADMIN', ...SYSTEM_ORG_ROLES] as const

const createAdminSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(1).max(128),
  role: z.enum(CREATABLE_ROLES).optional(),
  // Per-user program assignment for Independent Learners users (empty = no access).
  // Ignored for normal orgs (those inherit from the org's allowedProgramIds).
  allowedProgramIds: z.array(z.string()).optional(),
  // Per-user feature toggles + survey picks (system org only — ignored elsewhere).
  surveyIds: z.array(z.string()).optional(),
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

  const isSystem = isSystemOrg(org)
  // Default to ORG_ADMIN for normal orgs and PARTICIPANT for the system org.
  let role: typeof CREATABLE_ROLES[number] = parsed.data.role ?? (isSystem ? 'LEARNER' : 'ORG_ADMIN')

  if (!isSystem && role !== 'ORG_ADMIN') {
    return NextResponse.json(
      { error: 'Leaf roles can only be created on the Independent Learners system org.' },
      { status: 400 }
    )
  }
  if (isSystem && role === 'ORG_ADMIN') {
    return NextResponse.json(
      { error: 'The Independent Learners org does not have org admins — pick a leaf role.' },
      { status: 400 }
    )
  }

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
      // System-org-only fields: per-user program list, per-user feature toggles.
      // Other orgs ignore these (they inherit from the org row).
      allowedProgramIds: isSystem ? (parsed.data.allowedProgramIds ?? []) : [],
    },
    select: { id: true, name: true, email: true, role: true },
  })

  // System org: optional per-user survey assignments.
  if (isSystem && parsed.data.surveyIds && parsed.data.surveyIds.length > 0) {
    await prisma.surveyTarget.createMany({
      data: parsed.data.surveyIds.map((surveyId) => ({ surveyId, userId: user.id })),
      skipDuplicates: true,
    })
  }

  return NextResponse.json(user, { status: 201 })
}
