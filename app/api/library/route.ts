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
  // Charity-level admins can preview the learner library — they see every
  // active collection regardless of role/org targeting.
  const isPreview = userRole === 'SUPER_ADMIN' || userRole === 'CHARITY_EMPLOYEE'

  const collections = await prisma.libraryCollection.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
    include: {
      // (themeKey + thumbnailUrl are top-level fields — included automatically)
      documents: {
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
          videoUrl: true,
          createdAt: true,
        },
      },
      _count: {
        select: { documents: { where: { active: true } } },
      },
    },
  })

  // Filter collections by user's org and role (preview mode skips the filter)
  const filtered = isPreview
    ? collections
    : collections.filter((col) => {
        const orgMatch = col.targetOrgIds.length === 0 || (userOrgId && col.targetOrgIds.includes(userOrgId))
        const roleMatch = col.targetRoles.length === 0 || (userRole && col.targetRoles.includes(userRole))
        return orgMatch && roleMatch
      })

  return NextResponse.json(filtered)
}
