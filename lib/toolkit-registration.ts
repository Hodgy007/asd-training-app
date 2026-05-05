import { prisma } from './prisma'

export const PUBLIC_TOOLKIT_ORG_SLUG = 'public-toolkit'

export const TOOLKIT_FORM_ROLES = [
  'autistic',
  'parent_carer',
  'practitioner',
  'employer',
  'supporter',
] as const
export type ToolkitFormRole = (typeof TOOLKIT_FORM_ROLES)[number]

export const TOOLKIT_FORM_ROLE_LABELS: Record<ToolkitFormRole, string> = {
  autistic: 'I am autistic',
  parent_carer: 'I am the parent/carer/relative of an autistic young person',
  practitioner: 'I am a professional working with autistic people',
  employer: 'I am an employer',
  supporter: 'I am a supporter',
}

// Form-role → platform role mapping for self-registration via the
// public toolkit. The Public Toolkit Users org's allowedRoles must
// include each target.
//   - autistic young person/adult → STUDENT
//   - parent/carer/relative + supporter → FAMILY_CARER (stripped-back surface)
//   - professional → CAREGIVER ("Practitioner")
//   - employer → EMPLOYEE (no dedicated EMPLOYER role exists)
export type ToolkitPlatformRole = 'CAREGIVER' | 'STUDENT' | 'EMPLOYEE' | 'FAMILY_CARER'

export function mapFormRoleToPlatformRole(formRole: ToolkitFormRole): ToolkitPlatformRole {
  if (formRole === 'autistic') return 'STUDENT'
  if (formRole === 'employer') return 'EMPLOYEE'
  if (formRole === 'practitioner') return 'CAREGIVER'
  // parent_carer + supporter
  return 'FAMILY_CARER'
}

export async function getPublicToolkitOrgId(): Promise<string | null> {
  const org = await prisma.organisation.findUnique({
    where: { slug: PUBLIC_TOOLKIT_ORG_SLUG },
    select: { id: true },
  })
  return org?.id ?? null
}
