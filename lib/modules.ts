import prisma from './prisma'

export interface ProgramInfo {
  id: string
  name: string
}

export async function getOrgPrograms(orgId: string): Promise<ProgramInfo[]> {
  const org = await prisma.organisation.findUnique({
    where: { id: orgId },
    select: { allowedProgramIds: true },
  })
  if (!org || org.allowedProgramIds.length === 0) return []
  return prisma.trainingProgram.findMany({
    where: { id: { in: org.allowedProgramIds }, active: true },
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
