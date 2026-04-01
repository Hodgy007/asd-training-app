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

  // Fetch all documents with event counts
  const documents = await prisma.libraryDocument.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      uploadedBy: { select: { name: true } },
      events: {
        select: { action: true, organisationId: true },
      },
    },
  })

  // Fetch all organisations for name lookup
  const orgs = await prisma.organisation.findMany({
    select: { id: true, name: true },
  })
  const orgMap = Object.fromEntries(orgs.map((o) => [o.id, o.name]))

  // Build per-document stats
  const documentStats = documents.map((doc) => {
    const views = doc.events.filter((e) => e.action === 'view').length
    const downloads = doc.events.filter((e) => e.action === 'download').length

    // Per-org breakdown
    const orgBreakdown: Record<string, { views: number; downloads: number; orgName: string }> = {}
    for (const event of doc.events) {
      const orgId = event.organisationId || 'unassigned'
      if (!orgBreakdown[orgId]) {
        orgBreakdown[orgId] = {
          views: 0,
          downloads: 0,
          orgName: orgId === 'unassigned' ? 'No organisation' : (orgMap[orgId] || orgId),
        }
      }
      if (event.action === 'view') orgBreakdown[orgId].views++
      if (event.action === 'download') orgBreakdown[orgId].downloads++
    }

    return {
      id: doc.id,
      title: doc.title,
      fileName: doc.fileName,
      fileType: doc.fileType,
      active: doc.active,
      targetOrgIds: doc.targetOrgIds,
      createdAt: doc.createdAt,
      uploadedBy: doc.uploadedBy.name,
      totalViews: views,
      totalDownloads: downloads,
      orgBreakdown: Object.values(orgBreakdown).sort((a, b) => (b.views + b.downloads) - (a.views + a.downloads)),
    }
  })

  // Overall totals
  const totals = {
    totalDocuments: documents.length,
    activeDocuments: documents.filter((d) => d.active).length,
    totalViews: documentStats.reduce((sum, d) => sum + d.totalViews, 0),
    totalDownloads: documentStats.reduce((sum, d) => sum + d.totalDownloads, 0),
  }

  return NextResponse.json({ totals, documents: documentStats, organisations: orgs })
}
