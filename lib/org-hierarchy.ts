import { prisma } from './prisma'
import type { Session } from 'next-auth'

export interface EffectiveOrgSettings {
  allowedProgramIds: string[]
  allowedRoles: string[]
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
      inheritSettings: true,
      parentOrgId: true,
    },
  })

  if (!org) {
    return { allowedProgramIds: [], allowedRoles: [] }
  }

  if (org.inheritSettings && org.parentOrgId) {
    const parent = await prisma.organisation.findUnique({
      where: { id: org.parentOrgId },
      select: {
        allowedProgramIds: true,
        allowedRoles: true,
      },
    })
    if (parent) {
      return {
        allowedProgramIds: parent.allowedProgramIds,
        allowedRoles: parent.allowedRoles,
      }
    }
  }

  return {
    allowedProgramIds: org.allowedProgramIds,
    allowedRoles: org.allowedRoles,
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
 * Org admin can manage a row whose organisationId is either their own or a
 * child of theirs. Use this for any /api/admin/* detail handler that needs
 * parent-org drill-down (announcements, library collections, etc) — without
 * it, parent-org admins can list their children's rows but get 404 trying
 * to edit them.
 */
export async function canAdminManageOrg(session: Session, targetOrgId: string | null): Promise<boolean> {
  if (!targetOrgId) return false
  if (targetOrgId === session.user.organisationId) return true
  return canManageChildOrg(session, targetOrgId)
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
