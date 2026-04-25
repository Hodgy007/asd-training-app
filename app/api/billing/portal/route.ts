import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isPaymentsEnabled, requireStripe } from '@/lib/stripe'

export const runtime = 'nodejs'

export async function POST() {
  if (!isPaymentsEnabled) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const role = session.user.role
  const isIndividual = !session.user.organisationId
  if (role !== 'ORG_ADMIN' && !isIndividual) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let stripeCustomerId: string | null = null
  if (session.user.organisationId) {
    const org = await prisma.organisation.findUnique({
      where: { id: session.user.organisationId },
      select: { stripeCustomerId: true },
    })
    stripeCustomerId = org?.stripeCustomerId ?? null
  } else {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true },
    })
    stripeCustomerId = user?.stripeCustomerId ?? null
  }

  if (!stripeCustomerId) {
    return NextResponse.json(
      { error: 'No billing account yet. Make a purchase or subscription to set one up.' },
      { status: 400 }
    )
  }

  const stripe = requireStripe()
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: isIndividual ? `${baseUrl}/settings` : `${baseUrl}/admin/billing`,
    })
    return NextResponse.json({ url: portal.url })
  } catch (error) {
    console.error('[billing-portal] Failed to create portal session:', error)
    return NextResponse.json({ error: 'Billing portal unavailable' }, { status: 502 })
  }
}
