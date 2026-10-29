import { describe, it, expect } from 'vitest'
import { checkTrainingPlanLimits } from '../limits'

describe('checkTrainingPlanLimits', () => {
  it('allows 10 plan requests in five minutes and refuses the 11th', async () => {
    for (let i = 0; i < 10; i++) {
      expect(await checkTrainingPlanLimits('limits-user')).toBeNull()
    }
    const blocked = await checkTrainingPlanLimits('limits-user')
    expect(blocked?.status).toBe(429)
    expect(blocked?.headers.get('Retry-After')).toBeTruthy()
  })
})
