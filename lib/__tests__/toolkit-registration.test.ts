import { describe, expect, it } from 'vitest'
import {
  TOOLKIT_FORM_ROLES,
  mapFormRoleToPlatformRole,
  PUBLIC_TOOLKIT_ORG_SLUG,
} from '@/lib/toolkit-registration'

describe('mapFormRoleToPlatformRole', () => {
  // Every form role now maps to the single LEARNER platform role. The
  // self-declared identity is not lost — it is persisted verbatim on
  // ToolkitRegistrant.formRole, which is what reporting reads.
  it.each([...TOOLKIT_FORM_ROLES])('maps %s → LEARNER', (formRole) => {
    expect(mapFormRoleToPlatformRole(formRole)).toBe('LEARNER')
  })

  it('exposes exactly the five expected form roles', () => {
    expect([...TOOLKIT_FORM_ROLES]).toEqual([
      'autistic',
      'parent_carer',
      'practitioner',
      'employer',
      'supporter',
    ])
  })

  it('keeps the public-toolkit org slug stable', () => {
    expect(PUBLIC_TOOLKIT_ORG_SLUG).toBe('public-toolkit')
  })
})
