// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createJobSchema, updateJobSchema } from '../jobs'

const validJob = {
  title: 'Junior Developer',
  employer: 'Acme',
  location: 'London',
  locationType: 'HYBRID',
  employmentType: 'FULL_TIME',
  summary: 'Build things.',
  description: 'Build things with us.',
  applyUrl: 'https://example.com/apply',
  closingDate: '2026-12-31',
}

describe('createJobSchema', () => {
  it('fills in defaults for status, skills and targeting', () => {
    const job = createJobSchema.parse(validJob)
    expect(job.status).toBe('DRAFT')
    expect(job.skills).toEqual([])
    expect(job.targetOrgIds).toEqual([])
    expect(job.targetRoles).toEqual([])
  })

  it('requires exactly one of applyUrl or applyEmail', () => {
    const both = createJobSchema.safeParse({ ...validJob, applyEmail: 'jobs@example.com' })
    expect(both.success).toBe(false)
    const neither = createJobSchema.safeParse({ ...validJob, applyUrl: null })
    expect(neither.success).toBe(false)
  })
})

describe('updateJobSchema', () => {
  // zod 4 applies a .default() inside .partial() when the key is missing.
  // A partial edit must never reset a published job to DRAFT or clear its
  // skills and targeting.
  it('returns only the keys that were sent', () => {
    expect(updateJobSchema.parse({ title: 'Senior Developer' })).toEqual({ title: 'Senior Developer' })
  })

  it('does not add status, skills or targeting defaults', () => {
    const update = updateJobSchema.parse({ salary: '£30k' })
    expect(update).not.toHaveProperty('status')
    expect(update).not.toHaveProperty('skills')
    expect(update).not.toHaveProperty('targetOrgIds')
    expect(update).not.toHaveProperty('targetRoles')
  })

  it('still validates the keys that are sent', () => {
    expect(updateJobSchema.safeParse({ status: 'NOT_A_STATUS' }).success).toBe(false)
    expect(updateJobSchema.safeParse({ applyUrl: 'not a url' }).success).toBe(false)
  })
})
