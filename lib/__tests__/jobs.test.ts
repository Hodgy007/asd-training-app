import { describe, expect, it } from 'vitest'
import { isJobVisibleToUser, type JobVisibilityUser, type JobVisibilityRow } from '@/lib/jobs'

const baseUser: JobVisibilityUser = {
  id: 'u1',
  role: 'STUDENT',
  organisationId: 'org1',
}

const baseJob: JobVisibilityRow = {
  id: 'j1',
  status: 'PUBLISHED',
  targetOrgIds: [],
  targetRoles: [],
  closingDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
}

describe('isJobVisibleToUser', () => {
  it('shows PUBLISHED jobs with no targeting to everyone eligible', () => {
    expect(isJobVisibleToUser(baseJob, baseUser, false)).toBe(true)
  })

  it('hides DRAFT jobs even when targeting matches', () => {
    expect(isJobVisibleToUser({ ...baseJob, status: 'DRAFT' }, baseUser, false)).toBe(false)
  })

  it('hides ARCHIVED jobs', () => {
    expect(isJobVisibleToUser({ ...baseJob, status: 'ARCHIVED' }, baseUser, false)).toBe(false)
  })

  it('hides jobs where targetRoles does not include the user role', () => {
    expect(
      isJobVisibleToUser({ ...baseJob, targetRoles: ['INTERN'] }, baseUser, false),
    ).toBe(false)
  })

  it('shows jobs where targetRoles includes the user role', () => {
    expect(
      isJobVisibleToUser({ ...baseJob, targetRoles: ['STUDENT'] }, baseUser, false),
    ).toBe(true)
  })

  it('hides jobs where targetOrgIds does not include the user org', () => {
    expect(
      isJobVisibleToUser({ ...baseJob, targetOrgIds: ['org2'] }, baseUser, false),
    ).toBe(false)
  })

  it('shows jobs with assignment override even when targeting excludes user', () => {
    expect(
      isJobVisibleToUser(
        { ...baseJob, targetOrgIds: ['org2'], targetRoles: ['INTERN'] },
        baseUser,
        true,
      ),
    ).toBe(true)
  })

  it('still hides DRAFT jobs even when assignment exists', () => {
    expect(isJobVisibleToUser({ ...baseJob, status: 'DRAFT' }, baseUser, true)).toBe(false)
  })

  it('shows CLOSED jobs when assignment exists (for deep-link access)', () => {
    expect(isJobVisibleToUser({ ...baseJob, status: 'CLOSED' }, baseUser, true)).toBe(true)
  })

  it('hides CLOSED jobs from list without assignment', () => {
    expect(isJobVisibleToUser({ ...baseJob, status: 'CLOSED' }, baseUser, false)).toBe(false)
  })
})
