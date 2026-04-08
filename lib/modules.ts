import prisma from './prisma'
import { getEffectiveOrgSettings } from './org-hierarchy'

export interface ProgramInfo {
  id: string
  name: string
}

export async function getOrgPrograms(orgId: string): Promise<ProgramInfo[]> {
  const settings = await getEffectiveOrgSettings(orgId)
  if (settings.allowedProgramIds.length === 0) return []
  return prisma.trainingProgram.findMany({
    where: { id: { in: settings.allowedProgramIds }, active: true },
    select: { id: true, name: true },
    orderBy: { order: 'asc' },
  })
}

export async function getUserPrograms(userId: string): Promise<ProgramInfo[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organisationId: true },
  })
  if (!user?.organisationId) return []
  return getOrgPrograms(user.organisationId)
}

export function hasAccess(programIds: string[], programId: string): boolean {
  return programIds.includes(programId)
}
