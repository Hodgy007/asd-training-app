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

  // Fetch all collections with documents and events
  const collections = await prisma.libraryCollection.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { name: true } },
      documents: {
        include: {
          events: { select: { organisationId: true } },
        },
      },
    },
  })

  // Fetch orgs for name lookup
  const orgs = await prisma.organisation.findMany({ select: { id: true, name: true } })
  const orgMap = Object.fromEntries(orgs.map((o) => [o.id, o.name]))

  // Build per-collection stats
  const collectionStats = collections.map((col) => {
    let totalDownloads = 0
    const orgBreakdown: Record<string, { downloads: number; orgName: string }> = {}

    for (const doc of col.documents) {
      for (const event of doc.events) {
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
        downloads: doc.events.length,
      })),
    }
  })

  // Overall totals
  const totals = {
    totalCollections: collections.length,
    activeCollections: collections.filter((c) => c.active).length,
    totalDocuments: collections.reduce((sum, c) => sum + c.documents.length, 0),
    totalDownloads: collectionStats.reduce((sum, c) => sum + c.totalDownloads, 0),
  }

  return NextResponse.json({ totals, collections: collectionStats, organisations: orgs })
}
