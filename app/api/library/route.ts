import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userRole = session.user.role
  const userOrgId = session.user.organisationId

  const documents = await prisma.libraryDocument.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      fileUrl: true,
      fileName: true,
      fileSize: true,
      fileType: true,
      thumbnailUrl: true,
      targetOrgIds: true,
      targetRoles: true,
      createdAt: true,
    },
  })

  // Filter documents by user's org and role
  const filtered = documents.filter((doc) => {
    // Check org targeting: empty array = all orgs
    const orgMatch = doc.targetOrgIds.length === 0 || (userOrgId && doc.targetOrgIds.includes(userOrgId))
    // Check role targeting: empty array = all roles
    const roleMatch = doc.targetRoles.length === 0 || (userRole && doc.targetRoles.includes(userRole))
    return orgMatch && roleMatch
  })

  return NextResponse.json(filtered)
}
