import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const bulkSchema = z.object({
  members: z.array(z.object({
    name: z.string().min(1).max(200),
    email: z.string().email(),
    role: z.enum(['CAREGIVER', 'CAREER_DEV_OFFICER', 'STUDENT', 'INTERN', 'EMPLOYEE']).default('STUDENT'),
  })).min(1).max(200),
})

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pass = ''
  for (let i = 0; i < 10; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)]
  }
  return pass
}

export async function POST(
  req: NextRequest,
  { params }: { params: { cohortId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const cohort = await prisma.organisation.findFirst({
    where: { id: params.cohortId, orgType: 'COHORT' },
  })
  if (!cohort) return NextResponse.json({ error: 'Cohort not found' }, { status: 404 })

  const body = await req.json()
  const parsed = bulkSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  // Check for existing emails
  const emails = parsed.data.members.map((m) => m.email)
  const existingUsers = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { email: true },
  })
  const existingEmails = new Set(existingUsers.map((u) => u.email))

  const skipped: string[] = []
  const created: { name: string; email: string; password: string; role: string }[] = []

  for (const member of parsed.data.members) {
    if (existingEmails.has(member.email)) {
      skipped.push(member.email)
      continue
    }

    const password = generatePassword()
    const hashedPassword = await bcrypt.hash(password, 12)

    await prisma.user.create({
      data: {
        name: member.name,
        email: member.email,
        password: hashedPassword,
        role: member.role,
        organisationId: params.cohortId,
        mustChangePassword: true,
        active: true,
      },
    })

    created.push({ name: member.name, email: member.email, password, role: member.role })
  }

  return NextResponse.json({ created, skipped }, { status: 201 })
}
