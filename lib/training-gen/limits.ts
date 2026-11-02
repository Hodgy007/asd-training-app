import { createRateLimiter } from '@/lib/rate-limit'

// Planning (brief + outline) and single-lesson retries each fan out into
// several AI calls, so they share a limiter separate from full-programme
// generation: 10 per 5 minutes covers real editing, 30 a day caps a runaway.
export const trainingPlanLimiter = createRateLimiter('training-plan', 5 * 60 * 1000, 10)
export const trainingPlanDailyLimiter = createRateLimiter('training-plan-daily', 24 * 60 * 60 * 1000, 30)

/** Returns a 429 response when either limit is hit, otherwise null. */
export async function checkTrainingPlanLimits(userId: string): Promise<Response | null> {
  const daily = await trainingPlanDailyLimiter.check(userId)
  if (!daily.success) {
    return new Response(
      JSON.stringify({
        error: 'You have reached today’s AI generation limit. Please try again tomorrow.',
        code: 'DAILY_LIMIT',
      }),
      { status: 429, headers: { 'Retry-After': String(Math.ceil(daily.retryAfterMs / 1000)) } },
    )
  }
  const rate = await trainingPlanLimiter.check(userId)
  if (!rate.success) {
    return new Response(
      JSON.stringify({ error: 'Too many generation requests. Please wait a few minutes before trying again.' }),
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) } },
    )
  }
  return null
}
