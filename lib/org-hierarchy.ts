import { prisma } from './prisma'
import type { Session } from 'next-auth'

export interface EffectiveOrgSettings {
  allowedProgramIds: string[]
  allowedRoles: string[]
  cvBuilderEnabled: boolean
  careersAdvisorEnabled: boolean
}

/**
 * Resolve effective settings for an org, respecting inheritSettings from parent.
 * Single-level inheritance only (no recursive chain).
 */
export async function getEffectiveOrgSettings(orgId: string): Promise<EffectiveOrgSettings> {
  const org = await prisma.organisation.findUnique({
    where: { id: orgId },
    select: {
      allowedProgramIds: true,
      allowedRoles: true,
      cvBuilderEnabled: true,
      careersAdvisorEnabled: true,
      inheritSettings: true,
      parentOrgId: true,
    },
  })

  if (!org) {
    return { allowedProgramIds: [], allowedRoles: [], cvBuilderEnabled: true, careersAdvisorEnabled: true }
  }

  if (org.inheritSettings && org.parentOrgId) {
    const parent = await prisma.organisation.findUnique({
      where: { id: org.parentOrgId },
      select: {
        allowedProgramIds: true,
        allowedRoles: true,
        cvBuilderEnabled: true,
        careersAdvisorEnabled: true,
      },
    })
    if (parent) {
      return {
        allowedProgramIds: parent.allowedProgramIds,
        allowedRoles: parent.allowedRoles,
        cvBuilderEnabled: parent.cvBuilderEnabled,
        careersAdvisorEnabled: parent.careersAdvisorEnabled,
      }
    }
  }

  return {
    allowedProgramIds: org.allowedProgramIds,
    allowedRoles: org.allowedRoles,
    cvBuilderEnabled: org.cvBuilderEnabled,
    careersAdvisorEnabled: org.careersAdvisorEnabled,
  }
}

/**
 * Check if the session user's org is the parent of the target org.
 */
export async function canManageChildOrg(session: Session, targetOrgId: string): Promise<boolean> {
  const parentOrgId = session.user.organisationId
  if (!parentOrgId) return false

  const child = await prisma.organisation.findUnique({
    where: { id: targetOrgId },
    select: { parentOrgId: true },
  })

  return child?.parentOrgId === parentOrgId
}

/**
 * Get all child org IDs for a parent org.
 */
export async function getChildOrgIds(parentOrgId: string): Promise<string[]> {
  const children = await prisma.organisation.findMany({
    where: { parentOrgId },
    select: { id: true },
  })
  return children.map((c) => c.id)
}

/**
 * Get all child org IDs plus the parent org ID itself.
 */
export async function getAllOrgIds(parentOrgId: string): Promise<string[]> {
  const childIds = await getChildOrgIds(parentOrgId)
  return [parentOrgId, ...childIds]
}
