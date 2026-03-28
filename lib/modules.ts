// lib/modules.ts

/** ASD awareness training module IDs (from lib/training-data.ts) */
export const ASD_MODULE_IDS = [
  'module-1',
  'module-2',
  'module-3',
  'module-4',
  'module-5',
] as const

/** Careers CPD module IDs (from lib/careers-training-data.ts) */
export const CAREERS_MODULE_IDS = [
  'careers-module-1',
  'careers-module-2',
  'careers-module-3',
  'careers-module-4',
] as const

/** All training module IDs */
export const ALL_MODULE_IDS = [...ASD_MODULE_IDS, ...CAREERS_MODULE_IDS] as const

/**
 * Returns the effective module IDs for a user.
 * Priority: user overrides > org defaults > ASD-only fallback.
 */
export function getEffectiveModules(
  userModuleIds: string[],
  orgModuleIds: string[]
): string[] {
  if (userModuleIds.length > 0) return userModuleIds
  if (orgModuleIds.length > 0) return orgModuleIds
  // Conservative fallback: ASD modules only
  return [...ASD_MODULE_IDS]
}

/** Check if a module list includes any ASD modules */
export function hasAsdAccess(moduleIds: string[]): boolean {
  return moduleIds.some((id) => (ASD_MODULE_IDS as readonly string[]).includes(id))
}

/** Check if a module list includes any careers modules */
export function hasCareersAccess(moduleIds: string[]): boolean {
  return moduleIds.some((id) => (CAREERS_MODULE_IDS as readonly string[]).includes(id))
}
