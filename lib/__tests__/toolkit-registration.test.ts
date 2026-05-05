import { describe, expect, it } from 'vitest'
import {
  TOOLKIT_FORM_ROLES,
  mapFormRoleToPlatformRole,
  PUBLIC_TOOLKIT_ORG_SLUG,
} from '@/lib/toolkit-registration'

describe('mapFormRoleToPlatformRole', () => {
  it('maps autistic → STUDENT', () => {
    expect(mapFormRoleToPlatformRole('autistic')).toBe('STUDENT')
  })

  it('maps employer → EMPLOYEE', () => {
    expect(mapFormRoleToPlatformRole('employer')).toBe('EMPLOYEE')
  })

  it('maps practitioner → CAREGIVER (Practitioner)', () => {
    expect(mapFormRoleToPlatformRole('practitioner')).toBe('CAREGIVER')
  })

  it('maps parent_carer → FAMILY_CARER', () => {
    expect(mapFormRoleToPlatformRole('parent_carer')).toBe('FAMILY_CARER')
  })

  it('maps supporter → FAMILY_CARER', () => {
    expect(mapFormRoleToPlatformRole('supporter')).toBe('FAMILY_CARER')
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
