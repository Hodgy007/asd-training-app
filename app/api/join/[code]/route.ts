import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { joinCohortByCode, JoinError } from '@/lib/cohort'
import { joinLimiter, getClientIp } from '@/lib/rate-limit'

/**
 * Public lookup of an invite code — used to render the join page.
 * Returns minimal cohort details and the validity status. Never reveals member
 * counts or other internal data.
 */
export async function GET(_req: NextRequest, { params }: { params: { code: string } }) {
  const cohort = await prisma.organisation.findUnique({
    where: { inviteCode: params.code },
    select: {
      name: true,
      orgType: true,
      lifecycleStatus: true,
      inviteEnabled: true,
      inviteExpiresAt: true,
    },
  })

  if (!cohort || cohort.orgType !== 'COHORT' || !cohort.inviteEnabled) {
    return NextResponse.json({ error: 'INVALID_CODE' }, { status: 404 })
  }
  if (cohort.lifecycleStatus === 'ARCHIVED') {
    return NextResponse.json({ error: 'ARCHIVED' }, { status: 410 })
  }
  if (cohort.inviteExpiresAt && cohort.inviteExpiresAt < new Date()) {
    return NextResponse.json({ error: 'EXPIRED' }, { status: 410 })
  }

  return NextResponse.json({ name: cohort.name })
}

const joinSchema = z.object({
  email: z.string().email().max(200),
  name: z.string().min(1).max(120),
  password: z.string().min(8).max(200),
})

export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const ip = getClientIp(req)
  const limit = await joinLimiter.check(ip)
  if (!limit.success) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again in a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) } }
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = joinSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const result = await joinCohortByCode({
      code: params.code,
      email: parsed.data.email,
      name: parsed.data.name,
      password: parsed.data.password,
    })
    return NextResponse.json(result, { status: 201 })
  } catch (e) {
    if (e instanceof JoinError) {
      const status = e.code === 'INVALID_CODE' ? 404 : e.code === 'EXPIRED' || e.code === 'ARCHIVED' ? 410 : 400
      return NextResponse.json({ error: e.code, message: e.message }, { status })
    }
    throw e
  }
}
