import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isPaymentsEnabled } from '@/lib/stripe'
import { createRateLimiter, getClientIp } from '@/lib/rate-limit'
import { grantFreeAccess } from '@/lib/account-provisioning'

export const runtime = 'nodejs'

// 5 claims per 15 min per IP — same envelope as forgot-password / reset.
// Anti-abuse: stops scripted enumeration of valid programIds via the email
// existence-check side channel.
const freeClaimLimiter = createRateLimiter('courses-free-claim', 15 * 60 * 1000, 5)

const schema = z.object({
  programId: z.string().min(1),
  email: z.string().email().max(254).optional(),
  name: z.string().trim().max(120).optional(),
})

export async function POST(req: NextRequest) {
  if (!isPaymentsEnabled) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const ip = getClientIp(req)
  const rl = await freeClaimLimiter.check(ip)
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const session = await getServerSession(authOptions)
  const sessionEmail = session?.user?.email ?? null
  const sessionName = session?.user?.name ?? null

  // Email comes from the session for signed-in users; the modal collects it for
  // anonymous visitors. Reject anonymous claims with no email — we can't grant
  // access to an unknown identity.
  const email = sessionEmail ?? parsed.data.email?.trim().toLowerCase() ?? null
  const name = sessionName ?? parsed.data.name ?? null
  if (!email) {
    return NextResponse.json(
      { error: 'Email is required to claim free access.' },
      { status: 400 }
    )
  }

  const program = await prisma.trainingProgram.findUnique({
    where: { id: parsed.data.programId },
    select: {
      id: true,
      name: true,
      status: true,
      active: true,
      purchasable: true,
      priceAmount: true,
      defaultLeafRole: true,
    },
  })

  if (
    !program ||
    !program.active ||
    !program.purchasable ||
    program.status !== 'APPROVED' ||
    program.priceAmount !== 0
  ) {
    return NextResponse.json(
      { error: 'This program is not available for free claim.' },
      { status: 400 }
    )
  }

  try {
    const result = await grantFreeAccess({
      programId: program.id,
      programName: program.name,
      // The PATCH validator at /api/super-admin/training/programs/[id]
      // refuses any non-leaf value, but Prisma's generated type is the full
      // Role enum — cast at the boundary.
      programDefaultLeafRole:
        (program.defaultLeafRole as
          | 'CAREGIVER'
          | 'CAREER_DEV_OFFICER'
          | 'STUDENT'
          | 'INTERN'
          | 'EMPLOYEE'
          | null) ?? null,
      email,
      name,
    })

    // Generic copy: don't leak whether the email was already in our system.
    return NextResponse.json({
      ok: true,
      message: result.created
        ? "We've sent your sign-in details to your inbox."
        : "We've emailed you a link to access this training.",
    })
  } catch (error) {
    console.error('[free-claim] Failed for program', program.id, error)
    return NextResponse.json(
      { error: 'Could not grant access. Please try again shortly.' },
      { status: 500 }
    )
  }
}
