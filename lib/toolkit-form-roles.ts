// Toolkit sign-up form roles. Client-safe: no server-only imports here, so
// components/toolkit/toolkit-lead-modal.tsx can use them directly.

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
