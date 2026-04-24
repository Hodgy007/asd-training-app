import Stripe from 'stripe'

export const isPaymentsEnabled = process.env.ENABLE_PAYMENTS === 'true'

const secretKey = process.env.STRIPE_SECRET_KEY

export const stripe = secretKey
  ? new Stripe(secretKey, {
      apiVersion: '2026-03-25.dahlia',
      typescript: true,
      appInfo: {
        name: 'asd-training-app',
        url: 'https://asd-training-app-v2.vercel.app',
      },
    })
  : (null as unknown as Stripe)

export function requireStripe(): Stripe {
  if (!stripe) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in env.')
  }
  return stripe
}

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? ''
export const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY ?? ''
export const STRIPE_SUBSCRIPTION_PRICE_MONTHLY =
  process.env.STRIPE_SUBSCRIPTION_PRICE_MONTHLY ?? ''
export const STRIPE_SUBSCRIPTION_PRICE_YEARLY =
  process.env.STRIPE_SUBSCRIPTION_PRICE_YEARLY ?? ''
