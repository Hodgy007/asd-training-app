export type ToolkitEventAction = 'view' | 'download'
export type LibraryReportRange = '7' | '30' | 'all' | string | null | undefined

type ToolkitSessionUser = {
  id: string
  organisationId?: string | null
}

type ToolkitEventPrisma = {
  libraryDocument: {
    findFirst: (args: any) => Promise<{ id: string } | null>
  }
  libraryDocumentEvent: {
    create: (args: any) => Promise<unknown>
  }
  toolkitAnonymousDocumentEvent: {
    create: (args: any) => Promise<unknown>
  }
  toolkitDownload: {
    create: (args: any) => Promise<unknown>
  }
}

type LibraryReportEvent = {
  action: string
  organisationId?: string | null
}

type AnonymousLibraryReportEvent = {
  action: string
}

type ToolkitDownloadReportEvent = {
  registrantId: string
}

type LibraryReportDocument = {
  id: string
  title: string
  fileName: string
  active?: boolean
  events: LibraryReportEvent[]
  anonymousEvents?: AnonymousLibraryReportEvent[]
  toolkitDownloads?: ToolkitDownloadReportEvent[]
}

type LibraryReportCollection = {
  id: string
  title: string
  active: boolean
  publishedToToolkit?: boolean
  targetOrgIds: string[]
  targetRoles: string[]
  createdAt: Date
  createdBy: { name: string | null }
  documents: LibraryReportDocument[]
}

type LibraryReportPrisma = {
  libraryCollection: {
    findMany: (args: any) => Promise<any[]>
  }
  organisation: {
    findMany: (args: any) => Promise<Array<{ id: string; name: string }>>
  }
  toolkitRegistrant: {
    findMany: (args: any) => Promise<any[]>
    count: (args?: any) => Promise<number>
  }
}

export function getLibraryReportRangeSince(range: LibraryReportRange, now = new Date()): Date | null {
  if (range !== '7' && range !== '30') return null

  const days = range === '7' ? 7 : 30
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
}

export async function recordToolkitDocumentEvent(
  prisma: ToolkitEventPrisma,
  input: {
    documentId: string
    action: ToolkitEventAction
    user?: ToolkitSessionUser | null
    registrantId?: string | null
  },
): Promise<{ recorded: true } | { recorded: false; reason: 'not-found' }> {
  const document = await prisma.libraryDocument.findFirst({
    where: {
      id: input.documentId,
      active: true,
      collection: {
        active: true,
        publishedToToolkit: true,
      },
    },
    select: { id: true },
  })

  if (!document) {
    return { recorded: false, reason: 'not-found' }
  }

  if (input.user?.id) {
    await prisma.libraryDocumentEvent.create({
      data: {
        documentId: input.documentId,
        userId: input.user.id,
        organisationId: input.user.organisationId ?? null,
        action: input.action,
      },
    })
  } else if (input.registrantId) {
    // Toolkit registrants get their own table so reports can split
    // identified-lead downloads from auth'd-user downloads cleanly.
    await prisma.toolkitDownload.create({
      data: {
        documentId: input.documentId,
        registrantId: input.registrantId,
      },
    })
  } else {
    await prisma.toolkitAnonymousDocumentEvent.create({
      data: {
        documentId: input.documentId,
        action: input.action,
      },
    })
  }

  return { recorded: true }
}

function countAction(events: Array<{ action: string }>, action: ToolkitEventAction) {
  return events.filter((event) => event.action === action).length
}

export async function getToolkitLibraryReport(
  prisma: LibraryReportPrisma,
  options: { range?: LibraryReportRange; now?: Date } = {},
) {
  const now = options.now ?? new Date()
  const since = getLibraryReportRangeSince(options.range ?? 'all', now)
  const eventWhere = since ? { createdAt: { gte: since } } : undefined

  const collections = await prisma.libraryCollection.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { name: true } },
      documents: {
        include: {
          events: {
            where: eventWhere,
            select: { action: true, organisationId: true },
          },
          anonymousEvents: {
            where: eventWhere,
            select: { action: true },
          },
          toolkitDownloads: {
            where: eventWhere,
            select: { registrantId: true },
          },
        },
      },
    },
  }) as LibraryReportCollection[]

  const orgs = await prisma.organisation.findMany({ select: { id: true, name: true } })
  const orgMap = Object.fromEntries(orgs.map((org) => [org.id, org.name]))

  let toolkitViews = 0
  let toolkitDownloads = 0
  let anonymousToolkitViews = 0
  let anonymousToolkitDownloads = 0
  let registrantDownloads = 0

  const collectionStats = collections.map((collection) => {
    let totalDownloads = 0
    const orgBreakdown: Record<string, { downloads: number; orgName: string }> = {}

    for (const document of collection.documents) {
      const downloads = countAction(document.events, 'download')
      totalDownloads += downloads

      for (const event of document.events) {
        if (event.action !== 'download') continue

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
      id: collection.id,
      title: collection.title,
      active: collection.active,
      publishedToToolkit: collection.publishedToToolkit ?? false,
      targetOrgIds: collection.targetOrgIds,
      targetRoles: collection.targetRoles,
      documentCount: collection.documents.length,
      createdAt: collection.createdAt,
      createdBy: collection.createdBy.name,
      totalDownloads,
      orgBreakdown: Object.values(orgBreakdown).sort((a, b) => b.downloads - a.downloads),
      documents: collection.documents.map((document) => ({
        id: document.id,
        title: document.title,
        fileName: document.fileName,
        views: countAction(document.events, 'view'),
        downloads: countAction(document.events, 'download'),
        registrantDownloads: (document.toolkitDownloads ?? []).length,
      })),
    }
  })

  const topToolkitDocuments = collections
    .filter((collection) => collection.active && collection.publishedToToolkit)
    .flatMap((collection) => (
      collection.documents
        .filter((document) => document.active !== false)
        .map((document) => {
          const views = countAction(document.events, 'view')
          const downloads = countAction(document.events, 'download')
          const anonymousEvents = document.anonymousEvents ?? []
          const anonymousViews = countAction(anonymousEvents, 'view')
          const anonymousDownloads = countAction(anonymousEvents, 'download')
          const registrantDls = (document.toolkitDownloads ?? []).length

          toolkitViews += views
          toolkitDownloads += downloads
          anonymousToolkitViews += anonymousViews
          anonymousToolkitDownloads += anonymousDownloads
          registrantDownloads += registrantDls

          return {
            id: document.id,
            title: document.title,
            fileName: document.fileName,
            collectionId: collection.id,
            collectionTitle: collection.title,
            views,
            downloads,
            anonymousViews,
            anonymousDownloads,
            registrantDownloads: registrantDls,
            totalEvents: views + downloads + anonymousViews + anonymousDownloads + registrantDls,
          }
        })
    ))
    .filter((document) => document.totalEvents > 0)
    .sort((a, b) => b.totalEvents - a.totalEvents)

  // Lead-capture stats (across all time + last-30-days). Doesn't use the
  // range filter for views/downloads so the section always answers "how
  // many people have we captured so far"; the range affects download counts
  // (which use eventWhere above) but not lifetime registrant totals.
  const registrantWhere: any = since ? { createdAt: { gte: since } } : undefined
  const [registrantsAll, registrantsInRange, registrantsRoleSplit, marketingOptInTotal] = await Promise.all([
    prisma.toolkitRegistrant.findMany({
      select: {
        id: true,
        formRole: true,
        organisation: true,
        userId: true,
        marketingConsent: true,
        createdAt: true,
      },
    }),
    registrantWhere
      ? prisma.toolkitRegistrant.count({ where: registrantWhere })
      : prisma.toolkitRegistrant.count(),
    Promise.resolve([]) as Promise<unknown[]>,
    prisma.toolkitRegistrant.count({ where: { marketingConsent: true } }),
  ])

  const formRoleCounts: Record<string, number> = {}
  const orgCounts: Record<string, number> = {}
  let registeredAccountCount = 0
  for (const reg of registrantsAll as Array<{ formRole: string; organisation: string | null; userId: string | null }>) {
    formRoleCounts[reg.formRole] = (formRoleCounts[reg.formRole] ?? 0) + 1
    if (reg.organisation) {
      const k = reg.organisation.trim().toLowerCase()
      orgCounts[k] = (orgCounts[k] ?? 0) + 1
    }
    if (reg.userId) registeredAccountCount++
  }

  const topRegistrantOrgs = Object.entries(orgCounts)
    .map(([key, count]) => ({ name: key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const totals = {
    totalCollections: collections.length,
    activeCollections: collections.filter((collection) => collection.active).length,
    totalDocuments: collections.reduce((sum, collection) => sum + collection.documents.length, 0),
    totalDownloads: collectionStats.reduce((sum, collection) => sum + collection.totalDownloads, 0),
    toolkitViews,
    toolkitDownloads,
    anonymousToolkitViews,
    anonymousToolkitDownloads,
    registrantDownloads,
  }

  const registrantStats = {
    total: registrantsAll.length,
    inRange: registrantsInRange,
    registeredAccounts: registeredAccountCount,
    leadOnly: registrantsAll.length - registeredAccountCount,
    marketingConsent: marketingOptInTotal,
    formRoleCounts,
    topOrganisations: topRegistrantOrgs,
  }

  return {
    totals,
    collections: collectionStats,
    organisations: orgs,
    topToolkitDocuments,
    registrantStats,
  }
}
