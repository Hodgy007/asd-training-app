import { prisma } from '@/lib/prisma'
import type { Session } from 'next-auth'
import type { Role } from '@prisma/client'

export type NotificationKind = 'survey' | 'workshop' | 'module' | 'library'

export interface NotificationItem {
  id: string
  kind: NotificationKind
  title: string
  supporting: string | null
  href: string
  createdAt: Date
  isNew: boolean
}

export interface NotificationsPayload {
  count: number
  sections: {
    forYou: NotificationItem[]
    whatsNew: NotificationItem[]
  }
}

const INFORMATIONAL_WINDOW_DAYS = 14
const UPCOMING_WORKSHOP_WINDOW_DAYS = 30
const PENDING_SURVEY_WINDOW_DAYS = 180
const SECTION_CAP = 10

export async function getNotifications(session: Session): Promise<NotificationsPayload> {
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { notificationsLastOpenedAt: true, createdAt: true },
  })

  if (!user) {
    return { count: 0, sections: { forYou: [], whatsNew: [] } }
  }

  const lastOpenedAt = user.notificationsLastOpenedAt ?? user.createdAt
  const now = new Date()

  // ── Pending surveys (actionable) ───────────────────────────────────────
  const surveyWindow = new Date(now.getTime() - PENDING_SURVEY_WINDOW_DAYS * 86_400_000)
  const surveyRecords = await prisma.survey.findMany({
    where: {
      status: 'PUBLISHED',
      createdAt: { gte: surveyWindow },
      targets: {
        some: {
          OR: [
            { role: session.user.role as Role },
            session.user.organisationId
              ? { organisationId: session.user.organisationId }
              : {},
          ],
        },
      },
      responses: { none: { userId: session.user.id } },
    },
    select: { id: true, title: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
    take: SECTION_CAP,
  })
  const surveyItems: NotificationItem[] = surveyRecords.map((s) => ({
    id: s.id,
    kind: 'survey',
    title: s.title,
    supporting: null,
    href: `/surveys/${s.id}`,
    createdAt: s.createdAt,
    isNew: s.createdAt > lastOpenedAt,
  }))

  // ── Upcoming workshops (actionable) ────────────────────────────────────
  const workshopWindowEnd = new Date(now.getTime() + UPCOMING_WORKSHOP_WINDOW_DAYS * 86_400_000)
  const workshopRecords = await prisma.classSession.findMany({
    where: {
      scheduledAt: { gte: now, lte: workshopWindowEnd },
      attendees: {
        some: {
          userId: session.user.id,
          attended: false,
        },
      },
    },
    select: { id: true, title: true, scheduledAt: true, createdAt: true },
    orderBy: { scheduledAt: 'asc' },
    take: SECTION_CAP,
  })
  const workshopItems: NotificationItem[] = workshopRecords.map((s) => ({
    id: s.id,
    kind: 'workshop',
    title: s.title,
    supporting: s.scheduledAt.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    }),
    href: '/sessions',
    createdAt: s.createdAt,
    isNew: s.createdAt > lastOpenedAt,
  }))

  // ── New training modules (informational, 14-day window) ────────────────
  const informationalWindow = new Date(
    now.getTime() - INFORMATIONAL_WINDOW_DAYS * 86_400_000,
  )
  const orgAllowedProgramIds = session.user.effectivePrograms?.map((p) => p.id) ?? []
  const isCharityLevel =
    session.user.role === 'SUPER_ADMIN' || session.user.role === 'CHARITY_EMPLOYEE'

  const moduleRecords = await prisma.module.findMany({
    where: {
      active: true,
      createdAt: { gte: informationalWindow },
      ...(isCharityLevel
        ? {}
        : orgAllowedProgramIds.length > 0
          ? { programId: { in: orgAllowedProgramIds } }
          : { id: { equals: '__none__' } }),
    },
    select: {
      id: true,
      title: true,
      programId: true,
      createdAt: true,
      program: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: SECTION_CAP,
  })
  const moduleItems: NotificationItem[] = moduleRecords.map((m) => ({
    id: m.id,
    kind: 'module',
    title: m.title,
    supporting: m.program?.name ?? null,
    href: `/training/${m.programId}/${m.id}`,
    createdAt: m.createdAt,
    isNew: m.createdAt > lastOpenedAt,
  }))

  // ── New library documents (informational, 14-day window) ───────────────
  const libraryRecords = await prisma.libraryDocument.findMany({
    where: {
      createdAt: { gte: informationalWindow },
      collection: {
        AND: [
          session.user.organisationId
            ? {
                OR: [
                  { targetOrgIds: { isEmpty: true } },
                  { targetOrgIds: { has: session.user.organisationId } },
                ],
              }
            : { targetOrgIds: { isEmpty: true } },
          {
            OR: [
              { targetRoles: { isEmpty: true } },
              { targetRoles: { has: session.user.role as Role } },
            ],
          },
        ],
      },
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
      collection: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: SECTION_CAP,
  })
  const libraryItems: NotificationItem[] = libraryRecords.map((d) => ({
    id: d.id,
    kind: 'library',
    title: d.title,
    supporting: d.collection?.title ?? null,
    href: d.collection ? `/library?c=${d.collection.id}` : '/library',
    createdAt: d.createdAt,
    isNew: d.createdAt > lastOpenedAt,
  }))

  // ── Assemble sections ──────────────────────────────────────────────────
  const forYou = [...surveyItems, ...workshopItems].slice(0, SECTION_CAP)
  const whatsNew = [...moduleItems, ...libraryItems]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, SECTION_CAP)

  const count =
    surveyItems.filter((item) => item.isNew).length +
    workshopItems.filter((item) => item.isNew).length +
    whatsNew.filter((item) => item.isNew).length

  return { count, sections: { forYou, whatsNew } }
}
