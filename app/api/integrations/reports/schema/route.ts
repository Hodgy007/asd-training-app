/**
 * OpenAPI 3.0 schema for the integration reports endpoint.
 *
 * Power BI Custom Connector and Dynamics 365 Custom Connector both accept
 * a Swagger / OpenAPI document as the contract for an external API. By
 * exposing one publicly (it documents shape, not data), consumers can:
 *
 *   1. Drop the URL into the "Import from URL" flow on Custom Connector
 *      builder and get auto-generated actions for each section.
 *   2. Use schema-aware validators (e.g. Postman, Insomnia) to validate
 *      responses without round-tripping through a sample call.
 *   3. Catch breaking changes on their side via diff tooling.
 *
 * This endpoint requires no auth — it returns shape, not data. The
 * actual `/api/integrations/reports` calls still require a Bearer key.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin

  const schema = {
    openapi: '3.0.3',
    info: {
      title: 'AAA Platform Integration Reports',
      description:
        'Bearer-token-authenticated read-only API for exporting platform reporting data to Power BI, Dynamics 365, Power Automate, and similar BI / iPaaS tools.\n\nAll PII is pseudonymised (HMAC-SHA-256, partitioned per feature). The combined endpoint returns aggregates across all five sections (training, library, surveys, CV Builder, Careers Advisor); request a specific section for tighter scope.',
      version: '1.0.0',
      contact: { name: 'AAA Platform', url: 'https://asd-training-app-v2.vercel.app' },
    },
    servers: [{ url: `${origin}/api/integrations`, description: 'Production' }],
    security: [{ bearerAuth: [] }],
    paths: {
      '/reports': {
        get: {
          summary: 'Export reporting data',
          description:
            'Returns aggregated or row-level data for one or all sections. Use `?format=flat` for BI-friendly long-format rows with stable `rowId` primary keys. Use `?since=<ISO>` for incremental refresh on event-shaped sections (library, surveys, cv, careers). Surveys responses are paginated via `?limit=` + `?cursor=`.',
          parameters: [
            {
              name: 'section',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
                enum: ['all', 'training', 'library', 'surveys', 'cv', 'careers'],
                default: 'all',
              },
            },
            {
              name: 'format',
              in: 'query',
              required: false,
              schema: { type: 'string', enum: ['nested', 'flat'], default: 'nested' },
            },
            {
              name: 'since',
              in: 'query',
              required: false,
              description:
                'ISO 8601 datetime. Filters event-shaped sections (library, surveys, cv, careers) to records updated/completed after this time. Training aggregates always reflect full-population state.',
              schema: { type: 'string', format: 'date-time' },
            },
            {
              name: 'limit',
              in: 'query',
              required: false,
              description: 'Page size for survey responses. Default 1000, max 5000.',
              schema: { type: 'integer', minimum: 1, maximum: 5000, default: 1000 },
            },
            {
              name: 'cursor',
              in: 'query',
              required: false,
              description: 'Opaque pagination cursor for survey responses. Echo back the `nextCursor` from the previous response.',
              schema: { type: 'string' },
            },
            {
              name: 'If-None-Match',
              in: 'header',
              required: false,
              description: 'ETag for conditional GET. Server returns 304 when no data has changed since the matching response.',
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Reports data. Shape varies by `section` and `format`.',
              headers: {
                ETag: {
                  description: 'Weak ETag derived from dataset watermark + row counts. Pass on subsequent polls.',
                  schema: { type: 'string' },
                },
              },
              content: {
                'application/json': {
                  schema: { oneOf: [{ $ref: '#/components/schemas/CombinedResponse' }, { $ref: '#/components/schemas/SectionResponse' }] },
                },
              },
            },
            '304': { description: 'Not Modified. Dataset state matches the supplied `If-None-Match` ETag.' },
            '401': { description: 'Missing, invalid, or expired API key.' },
            '429': {
              description: 'Rate limit exceeded (60 req/min per API key).',
              headers: { 'Retry-After': { schema: { type: 'integer' } } },
            },
            '500': { description: 'Internal server error.' },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', description: 'API key with `int_` prefix issued at /super-admin/integrations.' },
      },
      schemas: {
        CombinedResponse: {
          type: 'object',
          properties: {
            apiVersion: { type: 'string', enum: ['v1'] },
            generatedAt: { type: 'string', format: 'date-time' },
            format: { type: 'string', enum: ['nested', 'flat'] },
            since: { type: 'string', format: 'date-time', nullable: true },
            training: { $ref: '#/components/schemas/SectionPayload' },
            library: { $ref: '#/components/schemas/SectionPayload' },
            surveys: { $ref: '#/components/schemas/SectionPayloadPaginated' },
            cv: { $ref: '#/components/schemas/SectionPayload' },
            careers: { $ref: '#/components/schemas/SectionPayload' },
          },
        },
        SectionResponse: {
          type: 'object',
          properties: {
            apiVersion: { type: 'string', enum: ['v1'] },
            generatedAt: { type: 'string', format: 'date-time' },
            section: { type: 'string', enum: ['training', 'library', 'surveys', 'cv', 'careers'] },
            format: { type: 'string', enum: ['nested', 'flat'] },
            incrementalSupported: { type: 'boolean' },
            since: { type: 'string', format: 'date-time', nullable: true },
            rowCount: { type: 'integer' },
            rows: { type: 'array', description: 'Present when format=flat', items: { type: 'object' } },
            nextCursor: { type: 'string', nullable: true, description: 'Surveys only — opaque cursor for next page.' },
          },
        },
        SectionPayload: {
          type: 'object',
          properties: {
            rowCount: { type: 'integer' },
            incrementalSupported: { type: 'boolean' },
            items: { type: 'array', description: 'Present when format=nested', items: { type: 'object' } },
            rows: { type: 'array', description: 'Present when format=flat', items: { type: 'object' } },
          },
        },
        SectionPayloadPaginated: {
          allOf: [
            { $ref: '#/components/schemas/SectionPayload' },
            { type: 'object', properties: { nextCursor: { type: 'string', nullable: true } } },
          ],
        },
        TrainingFlatRow: {
          type: 'object',
          properties: {
            rowId: { type: 'string', description: 'Composite primary key: `<organisationId>:<moduleId>`' },
            organisationId: { type: 'string' },
            organisationName: { type: 'string' },
            organisationSlug: { type: 'string' },
            moduleId: { type: 'string' },
            moduleName: { type: 'string' },
            programName: { type: 'string' },
            gatsbyBenchmarks: { type: 'array', items: { type: 'string' }, description: 'UK Gatsby Benchmarks (1-8) the module maps to.' },
            totalUsers: { type: 'integer', description: 'Active learners in the org. Excludes SUPER_ADMIN and ORG_ADMIN.' },
            completions: { type: 'integer' },
            completionRate: { type: 'integer', description: 'Percentage 0-100.' },
          },
        },
        LibraryFlatRow: {
          type: 'object',
          properties: {
            rowId: { type: 'string', description: 'Document id (also `documentId`).' },
            collectionId: { type: 'string' },
            collectionTitle: { type: 'string' },
            collectionActive: { type: 'boolean' },
            documentId: { type: 'string' },
            documentTitle: { type: 'string' },
            fileName: { type: 'string' },
            downloads: { type: 'integer' },
          },
        },
        SurveyFlatRow: {
          type: 'object',
          properties: {
            rowId: { type: 'string', description: 'Composite: `<responseId>:<questionId>` — one row per (response × question).' },
            surveyId: { type: 'string' },
            surveyTitle: { type: 'string' },
            surveyStatus: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'CLOSED'] },
            respondentId: { type: 'string', description: 'Pseudonymised — stable per (user, survey). Never the real user id.' },
            role: { type: 'string' },
            organisation: { type: 'string' },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
            questionId: { type: 'string' },
            question: { type: 'string' },
            questionType: { type: 'string', enum: ['MULTIPLE_CHOICE', 'YES_NO', 'FREE_TEXT', 'RATING_SCALE', 'MULTI_SELECT'] },
            answer: { type: 'string' },
          },
        },
        CvFlatRow: {
          type: 'object',
          properties: {
            rowId: { type: 'string', description: 'CV id.' },
            cvId: { type: 'string' },
            userPseudonym: { type: 'string', description: 'Pseudonymised — stable per user across their CVs (namespace: `cv`). Not joinable to careers or survey pseudonyms.' },
            role: { type: 'string' },
            organisationId: { type: 'string', nullable: true },
            organisationName: { type: 'string' },
            status: { type: 'string', enum: ['DRAFT', 'COMPLETE'] },
            template: { type: 'string', enum: ['ACCESSIBLE', 'MODERN', 'CLASSIC'] },
            currentStep: { type: 'integer', minimum: 0, maximum: 8 },
            workExperienceCount: { type: 'integer' },
            educationCount: { type: 'integer' },
            skillsCount: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CareersFlatRow: {
          type: 'object',
          properties: {
            rowId: { type: 'string', description: 'Careers advisor session id.' },
            sessionId: { type: 'string' },
            userPseudonym: { type: 'string', description: 'Pseudonymised — stable per user across sessions (namespace: `careers`).' },
            role: { type: 'string' },
            organisationId: { type: 'string', nullable: true },
            organisationName: { type: 'string' },
            status: { type: 'string', enum: ['IN_PROGRESS', 'COMPLETE'] },
            currentStep: { type: 'integer' },
            hasReport: { type: 'boolean', description: 'True when the AI report has been generated and saved.' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }

  return NextResponse.json(schema, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Content-Type': 'application/json',
    },
  })
}
