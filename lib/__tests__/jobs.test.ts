import { describe, expect, it } from 'vitest'
import { isJobVisibleToUser, type JobVisibilityUser, type JobVisibilityRow } from '@/lib/jobs'

const baseUser: JobVisibilityUser = {
  id: 'u1',
  role: 'LEARNER',
  organisationId: 'org1',
  parentOrgId: null,
}

/** Charity-tier job: no owning organisation, so platform-wide by default. */
const charityJob: JobVisibilityRow = {
  id: 'j1',
  status: 'PUBLISHED',
  organisationId: null,
  targetOrgIds: [],
  targetRoles: [],
  closingDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
}

/** Organisation-tier job owned by the user's own org. */
const orgJob: JobVisibilityRow = { ...charityJob, id: 'j2', organisationId: 'org1' }

describe('isJobVisibleToUser — status rules', () => {
  it('shows PUBLISHED charity jobs with no targeting to everyone', () => {
    expect(isJobVisibleToUser(charityJob, baseUser, false)).toBe(true)
  })

  it('hides DRAFT jobs even when targeting matches', () => {
    expect(isJobVisibleToUser({ ...charityJob, status: 'DRAFT' }, baseUser, false)).toBe(false)
  })

  it('hides ARCHIVED jobs', () => {
    expect(isJobVisibleToUser({ ...charityJob, status: 'ARCHIVED' }, baseUser, false)).toBe(false)
  })

  it('still hides DRAFT jobs even when an assignment exists', () => {
    expect(isJobVisibleToUser({ ...charityJob, status: 'DRAFT' }, baseUser, true)).toBe(false)
  })

  it('shows CLOSED jobs when an assignment exists, so deep links keep working', () => {
    expect(isJobVisibleToUser({ ...charityJob, status: 'CLOSED' }, baseUser, true)).toBe(true)
  })

  it('hides CLOSED jobs from the list without an assignment', () => {
    expect(isJobVisibleToUser({ ...charityJob, status: 'CLOSED' }, baseUser, false)).toBe(false)
  })
})

describe('isJobVisibleToUser — charity tier', () => {
  it('shows an untargeted charity job to a user with no organisation', () => {
    expect(isJobVisibleToUser(charityJob, { ...baseUser, organisationId: null }, false)).toBe(true)
  })

  it('shows a charity job targeted at the user org', () => {
    expect(isJobVisibleToUser({ ...charityJob, targetOrgIds: ['org1'] }, baseUser, false)).toBe(true)
  })

  it('hides a charity job targeted at a different org', () => {
    expect(isJobVisibleToUser({ ...charityJob, targetOrgIds: ['org2'] }, baseUser, false)).toBe(false)
  })

  it('hides a targeted charity job from a user with no organisation', () => {
    expect(
      isJobVisibleToUser({ ...charityJob, targetOrgIds: ['org1'] }, { ...baseUser, organisationId: null }, false)
    ).toBe(false)
  })
})

describe('isJobVisibleToUser — organisation tier', () => {
  it("shows an org's own job to its learners", () => {
    expect(isJobVisibleToUser(orgJob, baseUser, false)).toBe(true)
  })

  it("hides another org's job", () => {
    expect(isJobVisibleToUser({ ...orgJob, organisationId: 'org2' }, baseUser, false)).toBe(false)
  })

  it('hides an org job from a user with no organisation', () => {
    expect(isJobVisibleToUser(orgJob, { ...baseUser, organisationId: null }, false)).toBe(false)
  })

  it("shows a parent org's job to a child org's learners", () => {
    const childUser = { ...baseUser, organisationId: 'child1', parentOrgId: 'trust1' }
    expect(isJobVisibleToUser({ ...orgJob, organisationId: 'trust1' }, childUser, false)).toBe(true)
  })

  it("does not show a sibling org's job to a child org's learners", () => {
    const childUser = { ...baseUser, organisationId: 'child1', parentOrgId: 'trust1' }
    expect(isJobVisibleToUser({ ...orgJob, organisationId: 'child2' }, childUser, false)).toBe(false)
  })

  it("does not leak a child org's job upward to the parent", () => {
    const parentUser = { ...baseUser, organisationId: 'trust1', parentOrgId: null }
    expect(isJobVisibleToUser({ ...orgJob, organisationId: 'child1' }, parentUser, false)).toBe(false)
  })

  it('ignores targetOrgIds on org-tier jobs — ownership alone decides', () => {
    expect(
      isJobVisibleToUser({ ...orgJob, targetOrgIds: ['org2'] }, baseUser, false)
    ).toBe(true)
  })
})

describe('isJobVisibleToUser — assignment override', () => {
  it('shows an assigned job even when the tier rule would exclude the user', () => {
    expect(
      isJobVisibleToUser({ ...orgJob, organisationId: 'org2' }, baseUser, true)
    ).toBe(true)
  })

  it('shows an assigned charity job that targets a different org', () => {
    expect(
      isJobVisibleToUser({ ...charityJob, targetOrgIds: ['org2'] }, baseUser, true)
    ).toBe(true)
  })
})

describe('isJobVisibleToUser — retired role targeting', () => {
  // targetRoles is vestigial after the role collapse: there is one learner role,
  // so it cannot narrow anything. Stale values must not hide live jobs.
  it('ignores a stale targetRoles value that no longer matches any role', () => {
    expect(
      isJobVisibleToUser({ ...charityJob, targetRoles: ['STUDENT', 'INTERN'] }, baseUser, false)
    ).toBe(true)
  })
})
