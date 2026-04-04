import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { validatePassword } from '@/lib/password-validation'
import { isEducationType } from '@/lib/rbac'
import { z } from 'zod'
import { registerLimiter, getClientIp } from '@/lib/rate-limit'

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(1).max(128),
  organisationId: z.string().cuid().optional(),
  // Only honoured when the org is EDUCATION type; ignored otherwise
  educationRole: z.enum(['STUDENT', 'CAREGIVER', 'CAREER_DEV_OFFICER']).optional(),
})

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rateLimit = registerLimiter.check(ip)
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)) } }
    )
  }

  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input. Please check your details.' },
        { status: 400 }
      )
    }

    const { name, email, password, organisationId, educationRole } = parsed.data

    const passwordCheck = validatePassword(password)
    if (!passwordCheck.valid) {
      return NextResponse.json({ error: passwordCheck.error }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'An account with that email already exists.' },
        { status: 409 }
      )
    }

    // Validate the selected organisation and derive default role from its type
    let resolvedOrgId: string | null = null
    let defaultRole: 'STUDENT' | 'EMPLOYEE' | 'CAREGIVER' | 'CAREER_DEV_OFFICER' = 'CAREGIVER'
    if (organisationId) {
      const org = await prisma.organisation.findUnique({
        where: { id: organisationId },
        select: { id: true, active: true, organisationType: true },
      })
      if (!org || !org.active) {
        return NextResponse.json({ error: 'Selected organisation not found.' }, { status: 400 })
      }
      resolvedOrgId = org.id
      if (isEducationType(org.organisationType)) {
        if (educationRole === 'CAREGIVER') defaultRole = 'CAREGIVER'
        else if (educationRole === 'CAREER_DEV_OFFICER') defaultRole = 'CAREER_DEV_OFFICER'
        else defaultRole = 'STUDENT'
      } else {
        // Employer / Business
        defaultRole = 'EMPLOYEE'
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: defaultRole,
        active: false,
        pendingApproval: true,
        organisationId: resolvedOrgId,
      },
    })

    return NextResponse.json({ id: user.id, email: user.email, name: user.name }, { status: 201 })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
