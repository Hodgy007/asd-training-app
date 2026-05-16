/**
 * External integration reports endpoint.
 *
 * Designed for Power BI, Dynamics 365 (Custom Connector), Power Automate,
 * and any BI / iPaaS tool that consumes the platform's data.
 *
 * Authentication: Bearer token (SHA-256 hashed at rest, managed at
 * `/super-admin/integrations`). Per-key rate limit: 60 req/min.
 *
 * Query parameters:
 *   ?section=training|library|surveys|cv|careers|all   (default: all)
 *   ?format=nested|flat                                (default: nested)
 *       - `nested`: v1 response shape (back-compat).
 *       - `flat`:   one row per measurement. BI-friendly long format,
 *                   every row carries a stable `rowId` for Dynamics'
 *                   Custom Connector primary-key mapping.
 *   ?since=<ISO 8601 datetime>                         (incremental refresh)
 *       - Applies to event-shaped sections (library, surveys, cv, careers).
 *       - Training aggregates are full-population; `since` is ignored
 *         and `incrementalSupported: false` appears in the response.
 *   ?limit=<n>     (surveys only, default 1000, max 5000)
 *   ?cursor=<id>   (surveys only, opaque cursor for next page)
 *
 * Response shape (single section):
 *   {
 *     apiVersion: 'v1',
 *     generatedAt: '<ISO>',
 *     section: '<id>',
 *     format: 'nested' | 'flat',
 *     incrementalSupported: boolean,
 *     since: '<ISO>' | null,
 *     // nested mode: <section>: [...]
 *     // flat mode:   rows: [...], rowCount: n, nextCursor?: string | null
 *   }
 *
 * Response shape (section=all):
 *   {
 *     apiVersion, generatedAt, format,
 *     training: { ... },
 *     library:  { ... },
 *     surveys:  { ... },
 *     cv:       { ... },
 *     careers:  { ... },
 *   }
 *
 * ETag / 304: every successful response carries a weak ETag derived from
 * the dataset's max-watermark and row counts. Pass `If-None-Match: <etag>`
 * on subsequent polls; the server returns 304 if nothing has changed.
 *
 * Schema (OpenAPI 3.0): GET /api/integrations/reports/schema
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/integration-auth'
import { logger, errMeta } from '@/lib/logger'
import { createRateLimiter } from '@/lib/rate-limit'
import {
  API_VERSION,
  ALL_SECTIONS,
  type Format,
  type SectionId,
  computeEtag,
  fetchCV,
  fetchCareers,
  fetchLibrary,
  fetchSurveys,
  fetchTraining,
  parseCursor,
  parseLimit,
  parseSince,
} from '@/lib/integration-reports'

// 60 requests per minute per API key. Survey responses contain personal
// data (pseudonymised but still per-respondent), so we cap bulk-extract.
const integrationsLimiter = createRateLimiter('integrations.reports', 60_000, 60)

function isValidSection(value: string): value is SectionId | 'all' {
  return value === 'all' || (ALL_SECTIONS as string[]).includes(value)
}

function parseFormat(value: string | null): Format {
  return value === 'flat' ? 'flat' : 'nested'
}

export async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') ?? undefined
  const startedAt = Date.now()
  const authHeader = req.headers.get('authorization')
  const keyPrefix = authHeader?.replace(/^Bearer\s+/i, '').slice(0, 8)

  const valid = await validateApiKey(authHeader)
  if (!valid) {
    logger.warn('integrations.reports.auth_failed', { requestId, keyPrefix })
    return NextResponse.json({ error: 'Invalid or expired API key' }, { status: 401 })
  }

  // Per-key rate limit (keyed by hash so we never log the raw token).
  const rate = await integrationsLimiter.check(valid.keyHash)
  if (!rate.success) {
    logger.warn('integrations.reports.rate_limited', { requestId, keyPrefix })
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) } },
    )
  }

  const sectionParam = req.nextUrl.searchParams.get('section') ?? 'all'
  if (!isValidSection(sectionParam)) {
    return NextResponse.json(
      { error: `Invalid section. Allowed: ${ALL_SECTIONS.join(', ')}, all` },
      { status: 400 },
    )
  }

  const format = parseFormat(req.nextUrl.searchParams.get('format'))
  const since = parseSince(req.nextUrl.searchParams.get('since'))
  const limit = parseLimit(req.nextUrl.searchParams.get('limit'))
  const cursor = parseCursor(req.nextUrl.searchParams.get('cursor'))
  const ifNoneMatch = req.headers.get('if-none-match')

  logger.info('integrations.reports.request', {
    requestId,
    keyPrefix,
    section: sectionParam,
    format,
    since: since?.toISOString() ?? null,
  })

  try {
    const generatedAt = new Date().toISOString()

    // ── Single-section path ──────────────────────────────────────────
    if (sectionParam !== 'all') {
      const result = await fetchSection(sectionParam, { since, limit, cursor })
      const etag = computeEtag([
        sectionParam,
        format,
        result.watermark?.toISOString() ?? null,
        result.rowCount,
        result.nextCursor ?? null,
      ])

      if (ifNoneMatch && ifNoneMatch === etag) {
        return new NextResponse(null, { status: 304, headers: { ETag: etag } })
      }

      const baseResponse = {
        apiVersion: API_VERSION,
        generatedAt,
        section: sectionParam,
        format,
        incrementalSupported: result.incrementalSupported,
        since: since?.toISOString() ?? null,
      }

      const payload: Record<string, unknown> =
        format === 'flat'
          ? {
              ...baseResponse,
              rows: result.flat,
              rowCount: result.rowCount,
              ...(sectionParam === 'surveys' ? { nextCursor: result.nextCursor } : {}),
            }
          : {
              ...baseResponse,
              [sectionParam]: result.nested,
              ...(sectionParam === 'surveys' ? { nextCursor: result.nextCursor } : {}),
            }

      logger.info('integrations.reports.success', {
        requestId,
        keyPrefix,
        section: sectionParam,
        format,
        rowCount: result.rowCount,
        durationMs: Date.now() - startedAt,
      })

      return NextResponse.json(payload, { headers: { ETag: etag } })
    }

    // ── Combined-section path ────────────────────────────────────────
    const [training, library, surveys, cv, careers] = await Promise.all([
      fetchSection('training', { since, limit, cursor }),
      fetchSection('library', { since, limit, cursor }),
      fetchSection('surveys', { since, limit, cursor }),
      fetchSection('cv', { since, limit, cursor }),
      fetchSection('careers', { since, limit, cursor }),
    ])

    const etag = computeEtag([
      'all',
      format,
      training.watermark?.toISOString() ?? null,
      library.watermark?.toISOString() ?? null,
      surveys.watermark?.toISOString() ?? null,
      cv.watermark?.toISOString() ?? null,
      careers.watermark?.toISOString() ?? null,
      training.rowCount,
      library.rowCount,
      surveys.rowCount,
      cv.rowCount,
      careers.rowCount,
      surveys.nextCursor ?? null,
    ])

    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag } })
    }

    function pack(result: SectionResult) {
      if (format === 'flat') {
        return {
          rows: result.flat,
          rowCount: result.rowCount,
          incrementalSupported: result.incrementalSupported,
        }
      }
      return {
        items: result.nested,
        rowCount: result.rowCount,
        incrementalSupported: result.incrementalSupported,
      }
    }

    logger.info('integrations.reports.success', {
      requestId,
      keyPrefix,
      section: 'all',
      format,
      rowCount:
        training.rowCount +
        library.rowCount +
        surveys.rowCount +
        cv.rowCount +
        careers.rowCount,
      durationMs: Date.now() - startedAt,
    })

    return NextResponse.json(
      {
        apiVersion: API_VERSION,
        generatedAt,
        format,
        since: since?.toISOString() ?? null,
        training: pack(training),
        library: pack(library),
        surveys: { ...pack(surveys), nextCursor: surveys.nextCursor },
        cv: pack(cv),
        careers: pack(careers),
      },
      { headers: { ETag: etag } },
    )
  } catch (error) {
    logger.error('integrations.reports.failed', {
      requestId,
      keyPrefix,
      section: sectionParam,
      format,
      durationMs: Date.now() - startedAt,
      ...errMeta(error),
    })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ─── Section dispatcher ──────────────────────────────────────────────────────

interface SectionResult {
  nested: unknown
  flat: unknown[]
  watermark: Date | null
  incrementalSupported: boolean
  rowCount: number
  nextCursor: string | null
}

interface DispatchOpts {
  since: Date | null
  limit: number
  cursor: string | null
}

async function fetchSection(section: SectionId, opts: DispatchOpts): Promise<SectionResult> {
  switch (section) {
    case 'training': {
      const r = await fetchTraining()
      return { ...r, rowCount: r.flat.length, nextCursor: null }
    }
    case 'library': {
      const r = await fetchLibrary(opts.since)
      return { ...r, rowCount: r.flat.length, nextCursor: null }
    }
    case 'surveys': {
      const r = await fetchSurveys(opts)
      return { ...r, rowCount: r.flat.length }
    }
    case 'cv': {
      const r = await fetchCV(opts.since)
      return { ...r, rowCount: r.flat.length, nextCursor: null }
    }
    case 'careers': {
      const r = await fetchCareers(opts.since)
      return { ...r, rowCount: r.flat.length, nextCursor: null }
    }
  }
}
