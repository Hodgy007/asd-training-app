/**
 * Shared helpers for the external integration reports endpoint.
 *
 * Designed for Power BI, Dynamics 365 (Custom Connector), Power Automate,
 * and any other BI / iPaaS tool that consumes the platform's data via the
 * Bearer-token-authenticated `/api/integrations/reports` API.
 *
 * Key design decisions:
 *   - Stable `apiVersion` discriminator on every response.
 *   - Nested format (default) preserves the v1 response shape so existing
 *     consumers don't break; flat format (`?format=flat`) returns one row
 *     per measurement for tabular BI consumers.
 *   - Every flat row has a stable `rowId` so Dynamics' Custom Connector
 *     can map it to a primary key without composing one client-side.
 *   - PII is pseudonymised. `pseudonymise(userId, namespace)` is stable
 *     per (user, namespace) but uses HMAC-SHA-256 with NEXTAUTH_SECRET so
 *     it can't be reversed from the report alone. Namespaces partition
 *     re-identification: a user's survey pseudonym ≠ their CV pseudonym.
 *   - The `since` cursor filters event-shaped sections only (surveys,
 *     library, cv, careers). Training aggregates ignore it and surface
 *     `incrementalSupported: false` in the response so consumers can
 *     branch on it.
 */

import { createHash, createHmac } from 'crypto'
import { prisma } from '@/lib/prisma'

export const API_VERSION = 'v1' as const

export type SectionId = 'training' | 'library' | 'surveys'
export const ALL_SECTIONS: SectionId[] = ['training', 'library', 'surveys']

export type Format = 'nested' | 'flat'

// ─── Pseudonymisation ────────────────────────────────────────────────────────

/**
 * Pseudonymise a user id for export.
 *
 * HMAC-SHA-256 truncated to 16 hex chars, namespaced. Stable per
 * (userId, namespace) so consumers can correlate rows for the same
 * "user" within a namespace, but the pseudonym is not reversible
 * without `NEXTAUTH_SECRET` and is partitioned per namespace so a
 * leaked CV report can't be joined to a leaked survey report.
 *
 * Namespaces:
 *   - For surveys: pass `surveyId` (matches the legacy v1 contract)
 */
export function pseudonymise(userId: string, namespace: string): string {
  const secret = process.env.NEXTAUTH_SECRET ?? ''
  return createHmac('sha256', secret)
    .update(`${namespace}:${userId}`)
    .digest('hex')
    .slice(0, 16)
}

// ─── Query-param parsing ─────────────────────────────────────────────────────

/**
 * Parse `?since=<ISO datetime>`. Returns null when missing or invalid.
 * Invalid values are silently treated as null so an integration's
 * misconfigured watermark doesn't 400 a daily refresh — they just
 * temporarily get the full dataset.
 */
export function parseSince(value: string | null): Date | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d
}

/** Parse `?limit=` clamped to [1, 5000]. Default 1000. */
export function parseLimit(value: string | null, fallback = 1000): number {
  if (!value) return fallback
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.min(Math.floor(n), 5000)
}

/** Decode cursor (opaque to consumers; internally just an id). */
export function parseCursor(value: string | null): string | null {
  if (!value) return null
  // Cursors are opaque ids. Could base64-encode for future migration but
  // keeping plaintext for v1 — cursors are short cuids and not secrets.
  return value.trim() || null
}

// ─── ETag ────────────────────────────────────────────────────────────────────

/**
 * Compute an ETag from a watermark + row count. Stable per dataset state
 * so a consumer's `If-None-Match` can short-circuit to 304 when nothing
 * has changed since the last poll.
 *
 * Format: `"W/<sha256-12>"` (weak ETag — payload may differ trivially
 * between equivalent representations, e.g. property order).
 */
export function computeEtag(parts: Array<string | number | null | undefined>): string {
  const input = parts.map((p) => p ?? 'null').join('|')
  const hash = createHash('sha256').update(input).digest('hex').slice(0, 12)
  return `W/"${hash}"`
}

// ─── Section fetchers ────────────────────────────────────────────────────────
//
// Each fetcher returns:
//   { nested, flat, watermark, incrementalSupported }
//
// `nested` is the existing v1 response shape (back-compat).
// `flat` is the BI-friendly long format — one row per measurement.
// `watermark` is the max timestamp seen across the dataset (for ETag).
// `incrementalSupported` indicates whether the `since` filter is honoured.

export interface SectionResult<TNested, TFlatRow> {
  nested: TNested
  flat: TFlatRow[]
  watermark: Date | null
  incrementalSupported: boolean
}

// ── Training ────────────────────────────────────────────────────────────────

interface TrainingNestedModule {
  moduleId: string
  moduleName: string
  programName: string
  gatsbyBenchmarks: string[]
  completions: number
  totalUsers: number
  completionRate: number
}

interface TrainingNestedOrg {
  organisationId: string
  organisationName: string
  slug: string
  totalUsers: number
  modules: TrainingNestedModule[]
}

interface TrainingFlatRow {
  rowId: string
  organisationId: string
  organisationName: string
  organisationSlug: string
  moduleId: string
  moduleName: string
  programName: string
  gatsbyBenchmarks: string[]
  totalUsers: number
  completions: number
  completionRate: number
}

export async function fetchTraining(): Promise<SectionResult<TrainingNestedOrg[], TrainingFlatRow>> {
  const allModules = await prisma.module.findMany({
    where: { active: true },
    orderBy: [{ programId: 'asc' }, { order: 'asc' }],
    select: {
      id: true,
      title: true,
      programId: true,
      gatsbyBenchmarks: true,
      updatedAt: true,
      program: { select: { name: true } },
    },
  })

  const orgs = await prisma.organisation.findMany({
    // Exclude cohorts so the integration training pull matches the
    // in-app super-admin reports. Cohorts are workshop attendee
    // groups, not registered organisations, and should not skew
    // org-level completion stats.
    where: { orgType: 'ORGANISATION' },
    select: {
      id: true,
      name: true,
      slug: true,
      allowedProgramIds: true,
      updatedAt: true,
      users: {
        // Exclude admin roles so the denominator reflects learners only.
        // Documented in the schema endpoint.
        where: { role: { notIn: ['SUPER_ADMIN', 'ORG_ADMIN'] } },
        select: {
          id: true,
          trainingProgress: {
            where: { completed: true },
            select: { moduleId: true, updatedAt: true },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Watermark — most-recent module or completion timestamp.
  let watermark: Date | null = null
  for (const m of allModules) if (!watermark || m.updatedAt > watermark) watermark = m.updatedAt
  for (const o of orgs) {
    if (!watermark || o.updatedAt > watermark) watermark = o.updatedAt
    for (const u of o.users) {
      for (const p of u.trainingProgress) {
        if (!watermark || p.updatedAt > watermark) watermark = p.updatedAt
      }
    }
  }

  const nested: TrainingNestedOrg[] = orgs.map((org) => {
    const totalUsers = org.users.length
    const orgModuleIds = allModules
      .filter((m) => org.allowedProgramIds.includes(m.programId))
      .map((m) => m.id)

    const modules = orgModuleIds.map((moduleId) => {
      const mod = allModules.find((m) => m.id === moduleId)
      const completions = org.users.filter((u) =>
        u.trainingProgress.some((p) => p.moduleId === moduleId),
      ).length
      return {
        moduleId,
        moduleName: mod?.title ?? moduleId,
        programName: mod?.program?.name ?? 'Unknown',
        gatsbyBenchmarks: mod?.gatsbyBenchmarks ?? [],
        completions,
        totalUsers,
        completionRate: totalUsers > 0 ? Math.round((completions / totalUsers) * 100) : 0,
      }
    })
    return {
      organisationId: org.id,
      organisationName: org.name,
      slug: org.slug,
      totalUsers,
      modules,
    }
  })

  const flat: TrainingFlatRow[] = nested.flatMap((org) =>
    org.modules.map((m) => ({
      rowId: `${org.organisationId}:${m.moduleId}`,
      organisationId: org.organisationId,
      organisationName: org.organisationName,
      organisationSlug: org.slug,
      moduleId: m.moduleId,
      moduleName: m.moduleName,
      programName: m.programName,
      gatsbyBenchmarks: m.gatsbyBenchmarks,
      totalUsers: m.totalUsers,
      completions: m.completions,
      completionRate: m.completionRate,
    })),
  )

  // Training stats are full-population aggregates — applying `since`
  // would produce misleading completion rates, so we always return the
  // full state and flag that incremental refresh isn't applicable.
  return { nested, flat, watermark, incrementalSupported: false }
}

// ── Library ─────────────────────────────────────────────────────────────────

interface LibraryNestedDocument {
  documentId: string
  title: string
  fileName: string
  downloads: number
}

interface LibraryNestedCollection {
  collectionId: string
  collectionTitle: string
  active: boolean
  documentCount: number
  totalDownloads: number
  documents: LibraryNestedDocument[]
}

interface LibraryFlatRow {
  rowId: string
  collectionId: string
  collectionTitle: string
  collectionActive: boolean
  documentId: string
  documentTitle: string
  fileName: string
  downloads: number
}

export async function fetchLibrary(since: Date | null): Promise<SectionResult<LibraryNestedCollection[], LibraryFlatRow>> {
  const collections = await prisma.libraryCollection.findMany({
    include: {
      _count: { select: { documents: true } },
      documents: {
        include: {
          events: {
            where: {
              action: 'download',
              ...(since ? { createdAt: { gte: since } } : {}),
            },
          },
        },
      },
    },
  })

  let watermark: Date | null = null
  for (const c of collections) {
    for (const d of c.documents) {
      for (const e of d.events) {
        if (!watermark || e.createdAt > watermark) watermark = e.createdAt
      }
    }
  }

  const nested: LibraryNestedCollection[] = collections.map((col) => ({
    collectionId: col.id,
    collectionTitle: col.title,
    active: col.active,
    documentCount: col._count.documents,
    totalDownloads: col.documents.reduce((s, d) => s + d.events.length, 0),
    documents: col.documents.map((doc) => ({
      documentId: doc.id,
      title: doc.title,
      fileName: doc.fileName,
      downloads: doc.events.length,
    })),
  }))

  const flat: LibraryFlatRow[] = nested.flatMap((col) =>
    col.documents.map((doc) => ({
      rowId: doc.documentId,
      collectionId: col.collectionId,
      collectionTitle: col.collectionTitle,
      collectionActive: col.active,
      documentId: doc.documentId,
      documentTitle: doc.title,
      fileName: doc.fileName,
      downloads: doc.downloads,
    })),
  )

  return { nested, flat, watermark, incrementalSupported: true }
}

// ── Surveys ─────────────────────────────────────────────────────────────────

interface SurveyNestedAnswer {
  question: string
  type: string
  answer: string
}

interface SurveyNestedResponse {
  respondentId: string
  role: string
  organisation: string
  completedAt: Date | null
  answers: SurveyNestedAnswer[]
}

interface SurveyNestedSurvey {
  surveyId: string
  title: string
  status: string
  createdAt: Date
  closesAt: Date | null
  questionCount: number
  responseCount: number
  responses: SurveyNestedResponse[]
}

interface SurveyFlatRow {
  rowId: string
  surveyId: string
  surveyTitle: string
  surveyStatus: string
  respondentId: string
  role: string
  organisation: string
  completedAt: string | null
  questionId: string
  question: string
  questionType: string
  answer: string
}

export interface FetchSurveysOptions {
  since: Date | null
  limit: number
  cursor: string | null
}

export interface SurveysResult extends SectionResult<SurveyNestedSurvey[], SurveyFlatRow> {
  nextCursor: string | null
}

export async function fetchSurveys({ since, limit, cursor }: FetchSurveysOptions): Promise<SurveysResult> {
  // Pagination is at the *response* level (the largest fan-out). We over-
  // fetch by one to detect the "more pages exist" boundary, then trim.
  const responses = await prisma.surveyResponse.findMany({
    where: {
      completedAt: { not: null, ...(since ? { gte: since } : {}) },
      ...(cursor ? { id: { gt: cursor } } : {}),
    },
    orderBy: { id: 'asc' },
    take: limit + 1,
    include: {
      answers: true,
      survey: {
        include: { questions: { orderBy: { order: 'asc' } } },
      },
      user: {
        select: {
          id: true,
          role: true,
          organisation: { select: { name: true } },
        },
      },
    },
  })

  const hasMore = responses.length > limit
  const page = hasMore ? responses.slice(0, limit) : responses
  const nextCursor = hasMore ? page[page.length - 1].id : null

  // Group page rows by survey for the nested representation.
  const bySurveyId = new Map<string, typeof page[number][]>()
  for (const r of page) {
    const arr = bySurveyId.get(r.surveyId) ?? []
    arr.push(r)
    bySurveyId.set(r.surveyId, arr)
  }

  let watermark: Date | null = null
  for (const r of page) {
    if (r.completedAt && (!watermark || r.completedAt > watermark)) watermark = r.completedAt
  }

  const nested: SurveyNestedSurvey[] = []
  for (const [, surveyResponses] of bySurveyId) {
    const survey = surveyResponses[0].survey
    nested.push({
      surveyId: survey.id,
      title: survey.title,
      status: survey.status,
      createdAt: survey.createdAt,
      closesAt: survey.closesAt,
      questionCount: survey.questions.length,
      responseCount: surveyResponses.length, // page-scoped count
      responses: surveyResponses.map((r) => ({
        respondentId: pseudonymise(r.user.id, survey.id),
        role: r.user.role,
        organisation: r.user.organisation?.name ?? '',
        completedAt: r.completedAt,
        answers: survey.questions.map((q) => ({
          question: q.question,
          type: q.type,
          answer: r.answers.find((a) => a.questionId === q.id)?.value ?? '',
        })),
      })),
    })
  }

  // Flat: one row per (response × question). Power BI's preferred shape.
  const flat: SurveyFlatRow[] = []
  for (const r of page) {
    const survey = r.survey
    const respondentId = pseudonymise(r.user.id, survey.id)
    for (const q of survey.questions) {
      flat.push({
        rowId: `${r.id}:${q.id}`,
        surveyId: survey.id,
        surveyTitle: survey.title,
        surveyStatus: survey.status,
        respondentId,
        role: r.user.role,
        organisation: r.user.organisation?.name ?? '',
        completedAt: r.completedAt ? r.completedAt.toISOString() : null,
        questionId: q.id,
        question: q.question,
        questionType: q.type,
        answer: r.answers.find((a) => a.questionId === q.id)?.value ?? '',
      })
    }
  }

  return { nested, flat, watermark, incrementalSupported: true, nextCursor }
}
