import { prisma } from './prisma'

// The form-role constants live in a client-safe module so the toolkit lead
// form can import them without pulling the database driver into the browser.
export { TOOLKIT_FORM_ROLES, TOOLKIT_FORM_ROLE_LABELS, type ToolkitFormRole } from './toolkit-form-roles'
import type { ToolkitFormRole } from './toolkit-form-roles'

export const PUBLIC_TOOLKIT_ORG_SLUG = 'public-toolkit'

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
