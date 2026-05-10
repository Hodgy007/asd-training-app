import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { verifyToken, EventbriteError } from '@/lib/eventbrite'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const candidate =
    typeof body?.privateToken === 'string' && body.privateToken.trim()
      ? body.privateToken.trim()
      : null

  // If no token in the body, use the saved one — lets the UI show "Test" for
  // an already-saved config without re-entering the secret.
  let token = candidate
  if (!token) {
    const config = await prisma.charityEventbriteConfig.findFirst()
    token = config?.privateToken ?? null
  }
  if (!token) {
    return NextResponse.json(
      { success: false, error: 'No token configured. Paste your Private Token first.' },
      { status: 400 },
    )
  }

  try {
    const me = await verifyToken(token)
    return NextResponse.json({
      success: true,
      message: `Connected as ${me.name ?? me.email ?? me.id}.`,
    })
  } catch (error) {
    if (error instanceof EventbriteError) {
      const reason =
        error.status === 401
          ? 'Eventbrite rejected the token. Double-check the Private Token from your account.'
          : `Eventbrite returned ${error.status}.`
      return NextResponse.json({ success: false, error: reason }, { status: 200 })
    }
    return NextResponse.json(
      { success: false, error: 'Network error reaching Eventbrite. Try again.' },
      { status: 200 },
    )
  }
}
