import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isOrgAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = session.user.organisationId
  if (!orgId) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  // Fetch collections targeted to this org (or all orgs)
  const collections = await prisma.libraryCollection.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
    include: {
      documents: {
        where: { active: true },
        include: {
          events: {
            where: { organisationId: orgId },
            select: { id: true },
          },
        },
      },
    },
  })

  // Filter to collections targeted to this org (or all)
  const targeted = collections.filter((col) => {
    return col.targetOrgIds.length === 0 || col.targetOrgIds.includes(orgId)
  })

  const collectionStats = targeted.map((col) => {
    let totalDownloads = 0

    const documents = col.documents.map((doc) => {
      const downloads = doc.events.length
      totalDownloads += downloads
      return {
        id: doc.id,
        title: doc.title,
        fileName: doc.fileName,
        downloads,
      }
    })

    return {
      id: col.id,
      title: col.title,
      documentCount: col.documents.length,
      totalDownloads,
      documents,
    }
  })

  const totals = {
    totalCollections: targeted.length,
    totalDocuments: collectionStats.reduce((sum, c) => sum + c.documentCount, 0),
    totalDownloads: collectionStats.reduce((sum, c) => sum + c.totalDownloads, 0),
  }

  return NextResponse.json({ totals, collections: collectionStats })
}
