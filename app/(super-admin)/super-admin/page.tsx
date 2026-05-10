import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Building2,
  Briefcase,
  UserX,
  TrendingUp,
  Users,
  Calendar,
  Activity,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  BookOpen,
} from 'lucide-react'
import { isCharityLevel, hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { HowToPanel } from '@/components/howto/panel'
import OverviewHowTo from '@/components/howto/super-admin/overview'

type AttentionTone = 'amber' | 'sky' | 'rose' | 'slate'

const TONE_STYLES: Record<AttentionTone, { iconBg: string; iconText: string }> = {
  amber: {
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconText: 'text-amber-600 dark:text-amber-400',
  },
  sky: {
    iconBg: 'bg-sky-100 dark:bg-sky-900/30',
    iconText: 'text-sky-600 dark:text-sky-400',
  },
  rose: {
    iconBg: 'bg-rose-100 dark:bg-rose-900/30',
    iconText: 'text-rose-600 dark:text-rose-400',
  },
  slate: {
    iconBg: 'bg-slate-100 dark:bg-slate-700/50',
    iconText: 'text-slate-600 dark:text-slate-300',
  },
}

export default async function SuperAdminPage() {
  const session = await getServerSession(authOptions)
  if (!session || !isCharityLevel(session)) redirect('/login')

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const canViewReports = hasPermission(session, CHARITY_PERMISSIONS.VIEW_REPORTS)
  const canManageOrgs = hasPermission(session, CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS)
  const canManageSurveys = hasPermission(session, CHARITY_PERMISSIONS.MANAGE_SURVEYS)
  const canManageJobs = hasPermission(session, CHARITY_PERMISSIONS.MANAGE_JOBS)
  const canManageSessions = hasPermission(session, CHARITY_PERMISSIONS.MANAGE_SESSIONS)

  const [
    draftSurveyCount,
    expiringJobCount,
    deactivatedUserCount,
    completionsLast30,
    completionsPrev30,
    activeUsersLast30,
    upcomingWorkshops,
    recentUsers,
    recentOrgs,
    recentCompletions,
    recentPrograms,
    recentModules,
  ] = await Promise.all([
    canManageSurveys
      ? prisma.survey.count({ where: { status: 'DRAFT' } })
      : Promise.resolve(0),
    canManageJobs
      ? prisma.jobOpening.count({
          where: {
            status: 'PUBLISHED',
            closingDate: { gte: now, lte: sevenDaysAhead },
          },
        })
      : Promise.resolve(0),
    canManageOrgs
      ? prisma.user.count({ where: { active: false } })
      : Promise.resolve(0),
    canViewReports
      ? prisma.trainingProgress.count({
          where: { completed: true, completedAt: { gte: thirtyDaysAgo } },
        })
      : Promise.resolve(0),
    canViewReports
      ? prisma.trainingProgress.count({
          where: {
            completed: true,
            completedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
          },
        })
      : Promise.resolve(0),
    canViewReports
      ? prisma.trainingProgress.findMany({
          where: { updatedAt: { gte: thirtyDaysAgo } },
          select: { userId: true },
          distinct: ['userId'],
        })
      : Promise.resolve([] as { userId: string }[]),
    canManageSessions
      ? prisma.classSession.findMany({
          where: {
            scheduledAt: { gte: now, lte: sevenDaysAhead },
            OR: [
              { isCharitySession: true },
              { organisation: { orgType: 'COHORT' } },
            ],
          },
          include: {
            host: { select: { name: true, email: true } },
            organisation: { select: { name: true, orgType: true } },
            _count: { select: { attendees: true } },
          },
          orderBy: { scheduledAt: 'asc' },
          take: 5,
        })
      : Promise.resolve([]),
    canViewReports
      ? prisma.user.findMany({
          where: {
            createdAt: { gte: sevenDaysAgo },
            role: { notIn: ['SUPER_ADMIN'] },
          },
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            organisation: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        })
      : Promise.resolve([]),
    canViewReports
      ? prisma.organisation.findMany({
          where: { createdAt: { gte: sevenDaysAgo } },
          select: { id: true, name: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        })
      : Promise.resolve([]),
    canViewReports
      ? prisma.trainingProgress.findMany({
          where: { completed: true, completedAt: { gte: sevenDaysAgo } },
          select: {
            id: true,
            completedAt: true,
            user: {
              select: {
                name: true,
                email: true,
                organisation: { select: { name: true } },
              },
            },
          },
          orderBy: { completedAt: 'desc' },
          take: 5,
        })
      : Promise.resolve([]),
    prisma.trainingProgram.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { id: true, name: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.module.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
        // Exclude modules created at the same instant as their parent program
        // (avoids duplicate "program created" + "module added" rows for fresh imports).
        program: { createdAt: { lt: sevenDaysAgo } },
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        program: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  const activeUsers30 = activeUsersLast30.length
  const completionsDelta = completionsLast30 - completionsPrev30
  const completionsDeltaPct =
    completionsPrev30 > 0
      ? Math.round((completionsDelta / completionsPrev30) * 100)
      : null

  type ActivityEvent = {
    id: string
    when: Date
    icon: 'user' | 'org' | 'completion' | 'training'
    primary: string
    secondary?: string
  }

  const activity: ActivityEvent[] = []
  for (const u of recentUsers) {
    activity.push({
      id: `user-${u.id}`,
      when: u.createdAt,
      icon: 'user',
      primary: `${u.name || u.email} joined`,
      secondary: u.organisation?.name,
    })
  }
  for (const o of recentOrgs) {
    activity.push({
      id: `org-${o.id}`,
      when: o.createdAt,
      icon: 'org',
      primary: `${o.name} added`,
    })
  }
  for (const c of recentCompletions) {
    if (!c.completedAt) continue
    activity.push({
      id: `completion-${c.id}`,
      when: c.completedAt,
      icon: 'completion',
      primary: `${c.user.name || c.user.email} completed a lesson`,
      secondary: c.user.organisation?.name,
    })
  }
  for (const p of recentPrograms) {
    const statusLabel = p.status === 'APPROVED' ? 'published' : p.status.toLowerCase()
    activity.push({
      id: `program-${p.id}`,
      when: p.createdAt,
      icon: 'training',
      primary: `Training program "${p.name}" created`,
      secondary: statusLabel,
    })
  }
  for (const m of recentModules) {
    activity.push({
      id: `module-${m.id}`,
      when: m.createdAt,
      icon: 'training',
      primary: `Module "${m.title}" added`,
      secondary: m.program?.name,
    })
  }
  activity.sort((a, b) => b.when.getTime() - a.when.getTime())
  const recentActivity = activity.slice(0, 10)

  const attentionCards: Array<{
    key: string
    label: string
    count: number
    icon: typeof Building2
    tone: AttentionTone
    href: string
  }> = []

  if (canManageSurveys) {
    attentionCards.push({
      key: 'draft-surveys',
      label: 'Draft surveys',
      count: draftSurveyCount,
      icon: ClipboardList,
      tone: 'sky',
      href: '/super-admin/surveys',
    })
  }
  if (canManageJobs) {
    attentionCards.push({
      key: 'expiring-jobs',
      label: 'Jobs closing in 7 days',
      count: expiringJobCount,
      icon: Briefcase,
      tone: 'rose',
      href: '/super-admin/jobs',
    })
  }
  if (canManageOrgs) {
    attentionCards.push({
      key: 'deactivated-users',
      label: 'Deactivated users',
      count: deactivatedUserCount,
      icon: UserX,
      tone: 'slate',
      href: '/super-admin/users?status=inactive',
    })
  }

  const firstName = session.user?.name?.split(' ')[0]
  const greeting = firstName ? `Welcome back, ${firstName}` : 'Welcome back'

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-page-enter">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{greeting}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Here&apos;s what&apos;s happening across the platform.
        </p>
      </div>

      {/* Needs attention */}
      {attentionCards.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Needs your attention
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-stagger">
            {attentionCards.map((card) => {
              const Icon = card.icon
              const styles = TONE_STYLES[card.tone]
              const muted = card.count === 0
              return (
                <Link
                  key={card.key}
                  href={card.href}
                  className={`card group flex items-center gap-4 transition-all ${muted ? 'opacity-60 hover:opacity-100' : ''}`}
                >
                  <div className={`w-12 h-12 ${styles.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`h-6 w-6 ${styles.iconText}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{card.count}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-300 flex-shrink-0" />
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* 30-day trend */}
      {canViewReports && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Last 30 days
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Lessons completed</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{completionsLast30}</p>
                </div>
                <div className="w-10 h-10 bg-warm-100 dark:bg-warm-900/30 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-warm-500 dark:text-warm-400" />
                </div>
              </div>
              {completionsDeltaPct !== null && (
                <p className={`text-xs mt-2 ${completionsDelta >= 0 ? 'text-sage-600 dark:text-sage-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  <TrendingUp className="inline h-3 w-3" /> {completionsDelta >= 0 ? '+' : ''}
                  {completionsDeltaPct}% vs previous 30 days
                </p>
              )}
            </div>
            <div className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Active learners</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{activeUsers30}</p>
                </div>
                <div className="w-10 h-10 bg-sage-100 dark:bg-sage-900/30 rounded-xl flex items-center justify-center">
                  <Users className="h-5 w-5 text-sage-600 dark:text-sage-400" />
                </div>
              </div>
              <p className="text-xs mt-2 text-slate-400 dark:text-slate-500">
                Users with training activity in the last 30 days
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Workshops + Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {canManageSessions && (
          <section className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-4 border-b border-calm-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary-600" />
                Workshops this week
              </h2>
              <Link
                href="/super-admin/sessions"
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {upcomingWorkshops.length === 0 ? (
              <div className="px-4 py-10 text-center text-slate-400 dark:text-slate-500 text-sm">
                No charity or cohort workshops scheduled this week.
              </div>
            ) : (
              <ul className="divide-y divide-calm-100 dark:divide-slate-700">
                {upcomingWorkshops.map((w) => (
                  <li key={w.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/super-admin/sessions/${w.id}`}
                          className="font-medium text-slate-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 truncate block"
                        >
                          {w.title}
                        </Link>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {new Date(w.scheduledAt).toLocaleString('en-GB', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {' · '}
                          {w.host?.name || w.host?.email}
                          {' · '}
                          {w._count.attendees} attendee{w._count.attendees !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
                          w.isCharitySession
                            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                            : 'bg-sage-100 text-sage-700 dark:bg-sage-900/40 dark:text-sage-300'
                        }`}
                      >
                        {w.isCharitySession ? 'Charity' : `Cohort: ${w.organisation?.name ?? '—'}`}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {canViewReports && (
          <section className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-4 border-b border-calm-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary-600" />
                Recent activity
              </h2>
            </div>
            {recentActivity.length === 0 ? (
              <div className="px-4 py-10 text-center text-slate-400 dark:text-slate-500 text-sm">
                No activity in the last 7 days.
              </div>
            ) : (
              <ul className="divide-y divide-calm-100 dark:divide-slate-700">
                {recentActivity.map((event) => {
                  const Icon =
                    event.icon === 'user'
                      ? Users
                      : event.icon === 'org'
                        ? Building2
                        : event.icon === 'training'
                          ? BookOpen
                          : CheckCircle2
                  const iconColor =
                    event.icon === 'user'
                      ? 'text-sage-600 dark:text-sage-400'
                      : event.icon === 'org'
                        ? 'text-primary-600 dark:text-primary-400'
                        : event.icon === 'training'
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-warm-500 dark:text-warm-400'
                  return (
                    <li key={event.id} className="px-4 py-3 flex items-start gap-3">
                      <div className="w-8 h-8 bg-calm-100 dark:bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon className={`h-4 w-4 ${iconColor}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-900 dark:text-white truncate">{event.primary}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {event.secondary && <span>{event.secondary} · </span>}
                          {timeAgo(event.when)}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )}
      </div>

      <HowToPanel>
        <OverviewHowTo />
      </HowToPanel>
    </div>
  )
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
