import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_LIBRARY)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const collections = await prisma.libraryCollection.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { name: true } },
      documents: {
        include: {
          events: { select: { action: true, organisationId: true } },
        },
      },
    },
  })

  const orgs = await prisma.organisation.findMany({ select: { id: true, name: true } })
  const orgMap = Object.fromEntries(orgs.map((o) => [o.id, o.name]))

  const collectionStats = collections.map((col) => {
    let totalDownloads = 0
    const orgBreakdown: Record<string, { downloads: number; orgName: string }> = {}

    for (const doc of col.documents) {
      for (const event of doc.events) {
        if (event.action !== 'download') continue
        totalDownloads++

        const orgId = event.organisationId || 'unassigned'
        if (!orgBreakdown[orgId]) {
          orgBreakdown[orgId] = {
            downloads: 0,
            orgName: orgId === 'unassigned' ? 'No organisation' : (orgMap[orgId] || orgId),
          }
        }
        orgBreakdown[orgId].downloads++
      }
    }

    return {
      id: col.id,
      title: col.title,
      active: col.active,
      publishedToToolkit: col.publishedToToolkit,
      targetOrgIds: col.targetOrgIds,
      targetRoles: col.targetRoles,
      documentCount: col.documents.length,
      createdAt: col.createdAt,
      createdBy: col.createdBy.name,
      totalDownloads,
      orgBreakdown: Object.values(orgBreakdown).sort((a, b) => b.downloads - a.downloads),
      documents: col.documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        fileName: doc.fileName,
        downloads: doc.events.filter((event) => event.action === 'download').length,
      })),
    }
  })

  const topToolkitDocuments = collections
    .filter((collection) => collection.active && collection.publishedToToolkit)
    .flatMap((collection) =>
      collection.documents.map((doc) => {
        const views = doc.events.filter((event) => event.action === 'view').length
        const downloads = doc.events.filter((event) => event.action === 'download').length
        return {
          id: doc.id,
          title: doc.title,
          fileName: doc.fileName,
          collectionId: collection.id,
          collectionTitle: collection.title,
          views,
          downloads,
          totalEvents: views + downloads,
        }
      })
    )
    .filter((doc) => doc.totalEvents > 0)
    .sort((a, b) => b.totalEvents - a.totalEvents)
    .slice(0, 10)

  const totals = {
    totalCollections: collections.length,
    activeCollections: collections.filter((c) => c.active).length,
    totalDocuments: collections.reduce((sum, c) => sum + c.documents.length, 0),
    totalDownloads: collectionStats.reduce((sum, c) => sum + c.totalDownloads, 0),
    toolkitViews: topToolkitDocuments.reduce((sum, doc) => sum + doc.views, 0),
    toolkitDownloads: topToolkitDocuments.reduce((sum, doc) => sum + doc.downloads, 0),
  }

  return NextResponse.json({ totals, collections: collectionStats, organisations: orgs, topToolkitDocuments })
}
