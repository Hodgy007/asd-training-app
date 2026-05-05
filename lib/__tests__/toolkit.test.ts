import { describe, expect, it, vi } from 'vitest'
import {
  getLibraryReportRangeSince,
  getToolkitLibraryReport,
  recordToolkitDocumentEvent,
} from '@/lib/toolkit'

describe('getLibraryReportRangeSince', () => {
  const now = new Date('2026-04-30T12:00:00.000Z')

  it('returns a seven day lower bound for range=7', () => {
    expect(getLibraryReportRangeSince('7', now)?.toISOString()).toBe('2026-04-23T12:00:00.000Z')
  })

  it('returns a thirty day lower bound for range=30', () => {
    expect(getLibraryReportRangeSince('30', now)?.toISOString()).toBe('2026-03-31T12:00:00.000Z')
  })

  it('returns no lower bound for all time and unknown ranges', () => {
    expect(getLibraryReportRangeSince('all', now)).toBeNull()
    expect(getLibraryReportRangeSince('unexpected', now)).toBeNull()
  })
})

describe('recordToolkitDocumentEvent', () => {
  function makePrisma() {
    return {
      libraryDocument: {
        findFirst: vi.fn().mockResolvedValue({ id: 'doc_1' }),
      },
      libraryDocumentEvent: {
        create: vi.fn().mockResolvedValue({ id: 'event_1' }),
      },
      toolkitAnonymousDocumentEvent: {
        create: vi.fn().mockResolvedValue({ id: 'anon_event_1' }),
      },
      toolkitDownload: {
        create: vi.fn().mockResolvedValue({ id: 'reg_dl_1' }),
      },
    }
  }

  it('records signed-in users in LibraryDocumentEvent after checking Toolkit eligibility', async () => {
    const prisma = makePrisma()
    const result = await recordToolkitDocumentEvent(prisma, {
      documentId: 'doc_1',
      action: 'download',
      user: { id: 'user_1', organisationId: 'org_1' },
    })

    expect(result).toEqual({ recorded: true })
    expect(prisma.libraryDocument.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'doc_1',
        active: true,
        collection: { active: true, publishedToToolkit: true },
      },
      select: { id: true },
    })
    expect(prisma.libraryDocumentEvent.create).toHaveBeenCalledWith({
      data: {
        documentId: 'doc_1',
        userId: 'user_1',
        organisationId: 'org_1',
        action: 'download',
      },
    })
    expect(prisma.toolkitAnonymousDocumentEvent.create).not.toHaveBeenCalled()
    expect(prisma.toolkitDownload.create).not.toHaveBeenCalled()
  })

  it('records identified registrants in ToolkitDownload (not the anonymous table)', async () => {
    const prisma = makePrisma()
    const result = await recordToolkitDocumentEvent(prisma, {
      documentId: 'doc_1',
      action: 'download',
      registrantId: 'reg_1',
    })

    expect(result).toEqual({ recorded: true })
    expect(prisma.toolkitDownload.create).toHaveBeenCalledWith({
      data: { documentId: 'doc_1', registrantId: 'reg_1' },
    })
    expect(prisma.libraryDocumentEvent.create).not.toHaveBeenCalled()
    expect(prisma.toolkitAnonymousDocumentEvent.create).not.toHaveBeenCalled()
  })

  it('falls back to ToolkitAnonymousDocumentEvent when no user and no registrant', async () => {
    const prisma = makePrisma()
    const result = await recordToolkitDocumentEvent(prisma, {
      documentId: 'doc_1',
      action: 'view',
      user: null,
    })

    expect(result).toEqual({ recorded: true })
    expect(prisma.toolkitAnonymousDocumentEvent.create).toHaveBeenCalledWith({
      data: { documentId: 'doc_1', action: 'view' },
    })
    expect(prisma.libraryDocumentEvent.create).not.toHaveBeenCalled()
    expect(prisma.toolkitDownload.create).not.toHaveBeenCalled()
  })

  it('does not record events for inactive or unpublished Toolkit documents', async () => {
    const prisma = makePrisma()
    prisma.libraryDocument.findFirst.mockResolvedValueOnce(null)

    const result = await recordToolkitDocumentEvent(prisma, {
      documentId: 'doc_1',
      action: 'download',
      user: null,
    })

    expect(result).toEqual({ recorded: false, reason: 'not-found' })
    expect(prisma.libraryDocumentEvent.create).not.toHaveBeenCalled()
    expect(prisma.toolkitAnonymousDocumentEvent.create).not.toHaveBeenCalled()
    expect(prisma.toolkitDownload.create).not.toHaveBeenCalled()
  })
})

describe('getToolkitLibraryReport', () => {
  it('returns range-filtered signed-in, anonymous, and registrant Toolkit totals', async () => {
    const prisma = {
      libraryCollection: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'col_1',
            title: 'Toolkit Collection',
            active: true,
            publishedToToolkit: true,
            targetOrgIds: [],
            targetRoles: [],
            createdAt: new Date('2026-04-01T00:00:00.000Z'),
            createdBy: { name: 'Admin' },
            documents: [
              {
                id: 'doc_1',
                title: 'Interview Guide',
                fileName: 'interview.pdf',
                events: [
                  { action: 'view', organisationId: 'org_1' },
                  { action: 'download', organisationId: 'org_1' },
                ],
                anonymousEvents: [
                  { action: 'view' },
                  { action: 'download' },
                  { action: 'download' },
                ],
                toolkitDownloads: [
                  { registrantId: 'reg_1' },
                  { registrantId: 'reg_2' },
                ],
              },
            ],
          },
        ]),
      },
      organisation: {
        findMany: vi.fn().mockResolvedValue([{ id: 'org_1', name: 'Example School' }]),
      },
      toolkitRegistrant: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'reg_1', formRole: 'parent', organisation: 'School A', userId: null, marketingConsent: true, createdAt: new Date('2026-04-25') },
          { id: 'reg_2', formRole: 'parent', organisation: 'School A', userId: 'user_x', marketingConsent: false, createdAt: new Date('2026-04-26') },
          { id: 'reg_3', formRole: 'teacher', organisation: null, userId: null, marketingConsent: true, createdAt: new Date('2026-04-27') },
        ]),
        count: vi.fn().mockImplementation(({ where }: { where: any }) => {
          if (where?.marketingConsent === true) return Promise.resolve(2)
          return Promise.resolve(3)
        }),
      },
    }

    const report = await getToolkitLibraryReport(prisma, {
      range: '7',
      now: new Date('2026-04-30T12:00:00.000Z'),
    })

    expect(prisma.libraryCollection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          documents: expect.objectContaining({
            include: {
              events: {
                where: { createdAt: { gte: new Date('2026-04-23T12:00:00.000Z') } },
                select: { action: true, organisationId: true },
              },
              anonymousEvents: {
                where: { createdAt: { gte: new Date('2026-04-23T12:00:00.000Z') } },
                select: { action: true },
              },
              toolkitDownloads: {
                where: { createdAt: { gte: new Date('2026-04-23T12:00:00.000Z') } },
                select: { registrantId: true },
              },
            },
          }),
        }),
      }),
    )
    expect(report.totals.toolkitViews).toBe(1)
    expect(report.totals.toolkitDownloads).toBe(1)
    expect(report.totals.anonymousToolkitViews).toBe(1)
    expect(report.totals.anonymousToolkitDownloads).toBe(2)
    expect(report.totals.registrantDownloads).toBe(2)

    expect(report.topToolkitDocuments).toEqual([
      {
        id: 'doc_1',
        title: 'Interview Guide',
        fileName: 'interview.pdf',
        collectionId: 'col_1',
        collectionTitle: 'Toolkit Collection',
        views: 1,
        downloads: 1,
        anonymousViews: 1,
        anonymousDownloads: 2,
        registrantDownloads: 2,
        totalEvents: 7,
      },
    ])

    expect(report.registrantStats.total).toBe(3)
    expect(report.registrantStats.registeredAccounts).toBe(1)
    expect(report.registrantStats.leadOnly).toBe(2)
    expect(report.registrantStats.marketingConsent).toBe(2)
    expect(report.registrantStats.formRoleCounts).toEqual({ parent: 2, teacher: 1 })
    expect(report.registrantStats.topOrganisations[0]).toEqual({ name: 'school a', count: 2 })
  })
})
