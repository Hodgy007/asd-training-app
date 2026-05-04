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

  // Push targeting into the SQL `where` clause instead of fetching everything
  // and filtering in JS. The previous code returned every active collection
  // (including their documents and full URLs) and only stripped them at the
  // last moment — one log line, error path, or refactor that returned the
  // unfiltered list would have leaked URLs from collections the user can't
  // see. Now the DB never sees a row the user shouldn't have.
  const orgFilters = isPreview
    ? []
    : [
        { targetOrgIds: { isEmpty: true } },
        ...(userOrgId ? [{ targetOrgIds: { has: userOrgId } }] : []),
      ]
  const roleFilters = isPreview
    ? []
    : [
        { targetRoles: { isEmpty: true } },
        ...(userRole ? [{ targetRoles: { has: userRole } }] : []),
      ]

  const where = isPreview
    ? { active: true }
    : {
        active: true,
        AND: [{ OR: orgFilters }, { OR: roleFilters }],
      }

  const collections = await prisma.libraryCollection.findMany({
    where,
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

  // Replace the raw Vercel Blob URL with an auth-gated proxy. Blob URLs
  // are forever-readable once obtained; the proxy re-checks the user's
  // entitlement on every request.
  const sanitised = collections.map((col) => ({
    ...col,
    documents: col.documents.map((d) => ({
      ...d,
      fileUrl: `/api/library/documents/${d.id}/file`,
    })),
  }))

  return NextResponse.json(sanitised)
}
