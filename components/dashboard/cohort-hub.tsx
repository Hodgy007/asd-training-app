import Link from 'next/link'
import { Calendar, FileText, Megaphone, UsersRound, Video, BookOpen, ExternalLink } from 'lucide-react'
import { prisma } from '@/lib/prisma'

interface Props {
  userId: string
}

const PLATFORM_LABELS: Record<string, string> = {
  ZOOM: 'Zoom',
  TEAMS: 'Teams',
  CUSTOM: 'Custom',
  IN_PERSON: 'In person',
}

function formatWhen(d: Date): string {
  return d.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

async function loadCohorts(userId: string) {
  const memberships = await prisma.cohortMembership.findMany({
    where: { userId, status: 'ACTIVE' },
    include: {
      cohort: {
        select: {
          id: true,
          name: true,
          lifecycleStatus: true,
          archivedAt: true,
          allowedProgramIds: true,
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  })

  const now = new Date()

  const enriched = await Promise.all(
    memberships.map(async (m) => {
      const cohort = m.cohort
      const isArchived = cohort.lifecycleStatus === 'ARCHIVED'

      const [nextSession, pastSessions, libraries, announcements, programs] = await Promise.all([
        // Upcoming session — only meaningful for active cohorts
        isArchived
          ? null
          : prisma.classSession.findFirst({
              where: { organisationId: cohort.id, scheduledAt: { gte: now }, status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
              orderBy: { scheduledAt: 'asc' },
              select: { id: true, title: true, scheduledAt: true, platform: true, meetingUrl: true, recordingUrl: true, status: true },
            }),
        // Past sessions with recordings — useful for both, especially archived
        prisma.classSession.findMany({
          where: { organisationId: cohort.id, status: 'COMPLETED', recordingUrl: { not: null } },
          orderBy: { scheduledAt: 'desc' },
          take: 5,
          select: { id: true, title: true, scheduledAt: true, recordingUrl: true },
        }),
        prisma.libraryCollection.findMany({
          where: { active: true, targetOrgIds: { has: cohort.id } },
          select: { id: true, title: true, description: true },
          orderBy: { createdAt: 'desc' },
        }),
        isArchived
          ? []
          : prisma.announcement.findMany({
              where: {
                organisationId: cohort.id,
                active: true,
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
              },
              orderBy: { createdAt: 'desc' },
              take: 3,
              select: { id: true, title: true, body: true, createdAt: true },
            }),
        cohort.allowedProgramIds.length > 0
          ? prisma.trainingProgram.findMany({
              where: { id: { in: cohort.allowedProgramIds }, active: true, status: 'APPROVED' },
              select: { id: true, name: true },
              orderBy: { name: 'asc' },
            })
          : [],
      ])

      return {
        id: cohort.id,
        name: cohort.name,
        isArchived,
        archivedAt: cohort.archivedAt,
        nextSession,
        pastSessions,
        libraries,
        announcements,
        programs,
      }
    })
  )

  return enriched
}

export async function CohortHub({ userId }: Props) {
  const cohorts = await loadCohorts(userId)

  if (cohorts.length === 0) return null

  return (
    <section className="space-y-4">
      {cohorts.map((c) => (
        <article
          key={c.id}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 shadow-sm overflow-hidden"
        >
          <header className="p-5 border-b border-calm-200 dark:border-slate-700 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <UsersRound className="h-5 w-5 text-emerald-600" />
                {c.name}
                {c.isArchived && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium">
                    Ended
                  </span>
                )}
              </h2>
              {c.isArchived && c.archivedAt && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Ended on {formatDate(c.archivedAt)} — content stays available for your reference.
                </p>
              )}
            </div>
          </header>

          <div className="p-5 space-y-5">
            {/* Announcements (active only) */}
            {c.announcements.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Megaphone className="h-3.5 w-3.5" />
                  Latest from the team
                </h3>
                <ul className="space-y-2">
                  {c.announcements.map((a) => (
                    <li key={a.id} className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40 p-3">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{a.title}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-3">{a.body}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next session */}
            {c.nextSession && (
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mb-2">
                  <Video className="h-3.5 w-3.5" />
                  Next session
                </h3>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{c.nextSession.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {formatWhen(c.nextSession.scheduledAt)} · {PLATFORM_LABELS[c.nextSession.platform] ?? c.nextSession.platform}
                </p>
                {c.nextSession.meetingUrl && (
                  <a
                    href={c.nextSession.meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary mt-3 inline-flex items-center gap-2 text-xs"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Join session
                  </a>
                )}
              </div>
            )}

            {/* Past sessions (recordings) — particularly useful for archived */}
            {c.pastSessions.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Past session recordings
                </h3>
                <ul className="divide-y divide-calm-100 dark:divide-slate-700 rounded-xl border border-calm-200 dark:border-slate-700">
                  {c.pastSessions.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{s.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(s.scheduledAt)}</p>
                      </div>
                      {s.recordingUrl && (
                        <a
                          href={s.recordingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline whitespace-nowrap"
                        >
                          Watch recording →
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Toolkit downloads */}
            {c.libraries.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Your toolkit
                </h3>
                <div className="grid sm:grid-cols-2 gap-2">
                  {c.libraries.map((l) => (
                    <Link
                      key={l.id}
                      href={`/library?c=${l.id}`}
                      className="rounded-xl border border-calm-200 dark:border-slate-700 p-3 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition"
                    >
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{l.title}</p>
                      {l.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{l.description}</p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Training programs */}
            {c.programs.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  Training
                </h3>
                <div className="grid sm:grid-cols-2 gap-2">
                  {c.programs.map((p) => (
                    <Link
                      key={p.id}
                      href={`/training?program=${p.id}`}
                      className="rounded-xl border border-calm-200 dark:border-slate-700 p-3 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition flex items-center justify-between gap-2"
                    >
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{p.name}</span>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {c.announcements.length === 0 &&
              !c.nextSession &&
              c.pastSessions.length === 0 &&
              c.libraries.length === 0 &&
              c.programs.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Nothing scheduled or shared here yet. We&apos;ll let you know when there is.
                </p>
              )}
          </div>
        </article>
      ))}
    </section>
  )
}
