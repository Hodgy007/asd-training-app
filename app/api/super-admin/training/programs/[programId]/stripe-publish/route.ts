import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { isPaymentsEnabled, requireStripe } from '@/lib/stripe'

export const runtime = 'nodejs'

export async function POST(
  _req: NextRequest,
  { params }: { params: { programId: string } }
) {
  if (!isPaymentsEnabled) {
    return NextResponse.json({ error: 'Payments are not enabled' }, { status: 404 })
  }

  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_TRAINING)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { programId } = params

  const program = await prisma.trainingProgram.findUnique({
    where: { id: programId },
    select: {
      id: true,
      name: true,
      description: true,
      priceAmount: true,
      currency: true,
      stripeProductId: true,
      stripePriceId: true,
    },
  })

  if (!program) {
    return NextResponse.json({ error: 'Program not found' }, { status: 404 })
  }

  if (!program.priceAmount || program.priceAmount <= 0) {
    return NextResponse.json(
      { error: 'Set a price (in pence) before publishing to Stripe.' },
      { status: 400 }
    )
  }

  const stripe = requireStripe()

  try {
    let productId = program.stripeProductId
    if (productId) {
      await stripe.products.update(productId, {
        name: program.name,
        description: program.description?.slice(0, 500) || undefined,
      })
    } else {
      const product = await stripe.products.create({
        name: program.name,
        description: program.description?.slice(0, 500) || undefined,
        metadata: { programId: program.id },
      })
      productId = product.id
    }

    let priceId = program.stripePriceId
    let priceChanged = false
    if (priceId) {
      const existingPrice = await stripe.prices.retrieve(priceId)
      if (
        existingPrice.unit_amount !== program.priceAmount ||
        existingPrice.currency !== program.currency.toLowerCase()
      ) {
        priceChanged = true
      }
    } else {
      priceChanged = true
    }

    if (priceChanged) {
      if (priceId) {
        try {
          await stripe.prices.update(priceId, { active: false })
        } catch (error) {
          console.error('[stripe-publish] Failed to deactivate old price', priceId, error)
        }
      }
      const price = await stripe.prices.create({
        product: productId,
        unit_amount: program.priceAmount,
        currency: program.currency.toLowerCase(),
        metadata: { programId: program.id },
      })
      priceId = price.id
    }

    const updated = await prisma.trainingProgram.update({
      where: { id: program.id },
      data: {
        stripeProductId: productId,
        stripePriceId: priceId,
      },
    })

    return NextResponse.json({
      stripeProductId: updated.stripeProductId,
      stripePriceId: updated.stripePriceId,
    })
  } catch (error) {
    console.error('[stripe-publish] Failed for program', program.id, error)
    return NextResponse.json(
      { error: 'Failed to publish to Stripe. Check server logs.' },
      { status: 502 }
    )
  }
}
