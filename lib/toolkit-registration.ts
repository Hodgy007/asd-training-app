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

// Every toolkit form role now maps to the single LEARNER platform role — what a
// person sees comes from their organisation's assigned programmes, not their role.
//
// No information is lost by this: the self-declared identity is persisted verbatim
// on ToolkitRegistrant.formRole, which is what reporting reads. The platform role
// only ever decided access, and all five form roles get the same access.
export type ToolkitPlatformRole = 'LEARNER'

export function mapFormRoleToPlatformRole(_formRole: ToolkitFormRole): ToolkitPlatformRole {
  return 'LEARNER'
}

export async function getPublicToolkitOrgId(): Promise<string | null> {
  const org = await prisma.organisation.findUnique({
    where: { slug: PUBLIC_TOOLKIT_ORG_SLUG },
    select: { id: true },
  })
  return org?.id ?? null
}
