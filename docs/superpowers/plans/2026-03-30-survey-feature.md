# Survey Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add survey creation (manual + AI), flexible role×org targeting, dashboard completion, results analytics, and AI-generated insights to the super admin area.

**Architecture:** New Prisma models (Survey, SurveyQuestion, SurveyTarget, SurveyResponse, SurveyAnswer, SurveyInsight) with cascade deletes. Super admin API routes under `/api/super-admin/surveys/`, user-facing routes under `/api/surveys/`. AI generation and insights via Gemini in a dedicated `lib/survey-ai.ts`. Dashboard integration via a client-side `PendingSurveys` component.

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma + Neon PostgreSQL, Google Gemini (`gemini-2.5-flash` via `@google/genai`), Recharts (already installed), `date-fns` (already installed), `lucide-react` (already installed), existing `lib/file-parser.ts` for file-based AI generation.

**Spec:** `docs/superpowers/specs/2026-03-30-survey-feature-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `lib/survey-ai.ts` | Gemini prompts: generate survey from topic, generate from parsed files, generate insights (summary, comparative, recommendations) |
| `lib/survey-db.ts` | Data access layer: admin queries (list, get, results, targeting count), user queries (pending surveys, submit responses) |
| `app/api/super-admin/surveys/route.ts` | GET (list all surveys) + POST (create survey with questions + targets) |
| `app/api/super-admin/surveys/[surveyId]/route.ts` | GET (single survey) + PATCH (update draft) + DELETE (cascade delete) |
| `app/api/super-admin/surveys/[surveyId]/publish/route.ts` | POST (validate & set status to PUBLISHED) |
| `app/api/super-admin/surveys/[surveyId]/close/route.ts` | POST (set status to CLOSED) |
| `app/api/super-admin/surveys/[surveyId]/results/route.ts` | GET (aggregated results with per-question breakdowns by role/org) |
| `app/api/super-admin/surveys/[surveyId]/insights/route.ts` | GET (stored insights) + POST (generate via Gemini) |
| `app/api/super-admin/surveys/generate-ai/route.ts` | POST (AI survey from topic) |
| `app/api/super-admin/surveys/generate-ai-from-files/route.ts` | POST (AI survey from uploaded files) |
| `app/api/surveys/pending/route.ts` | GET (pending surveys for current user) |
| `app/api/surveys/[surveyId]/route.ts` | GET (survey questions for user) |
| `app/api/surveys/[surveyId]/respond/route.ts` | POST (submit responses) |
| `app/(super-admin)/super-admin/surveys/page.tsx` | Survey management page (list, create, edit, delete) |
| `app/(super-admin)/super-admin/surveys/[surveyId]/results/page.tsx` | Results + insights page |
| `components/super-admin/survey-builder.tsx` | Survey creation/edit form with question editor |
| `components/super-admin/survey-target-picker.tsx` | Role × org targeting matrix UI |
| `components/super-admin/survey-results-view.tsx` | Charts + per-question results display |
| `components/super-admin/survey-ai-modal.tsx` | AI generation modal (topic + file tabs) |
| `components/dashboard/pending-surveys.tsx` | Dashboard card showing pending surveys + completion modal |

### Modified Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add 6 new models + 3 enums + relations on User and Organisation |
| `components/layout/super-admin-sidebar.tsx` | Add "Surveys" nav item with `ClipboardList` icon |
| `app/(dashboard)/dashboard/page.tsx` | Import and render `PendingSurveys` component |

---

## Task 1: Prisma Schema — New Models and Enums

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add enums to schema**

Add after the existing `Context` enum at line 340:

```prisma
enum SurveyStatus {
  DRAFT
  PUBLISHED
  CLOSED
}

enum QuestionType {
  MULTIPLE_CHOICE
  YES_NO
  FREE_TEXT
  RATING_SCALE
  MULTI_SELECT
}

enum InsightType {
  SUMMARY
  COMPARATIVE
  RECOMMENDATIONS
}
```

- [ ] **Step 2: Add Survey model**

Add after the `OrgSsoConfig` model:

```prisma
model Survey {
  id          String       @id @default(cuid())
  title       String
  description String?      @db.Text
  status      SurveyStatus @default(DRAFT)
  closesAt    DateTime?
  createdById String
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  createdBy  User             @relation("SurveysCreated", fields: [createdById], references: [id])
  questions  SurveyQuestion[]
  targets    SurveyTarget[]
  responses  SurveyResponse[]
  insights   SurveyInsight[]
}
```

- [ ] **Step 3: Add SurveyQuestion model**

```prisma
model SurveyQuestion {
  id       String       @id @default(cuid())
  surveyId String
  type     QuestionType
  question String       @db.Text
  options  String?      @db.Text
  required Boolean      @default(true)
  order    Int

  survey  Survey         @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  answers SurveyAnswer[]
}
```

- [ ] **Step 4: Add SurveyTarget model**

```prisma
model SurveyTarget {
  id             String  @id @default(cuid())
  surveyId       String
  role           Role?
  organisationId String?

  survey       Survey        @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  organisation Organisation? @relation(fields: [organisationId], references: [id], onDelete: SetNull)
}
```

- [ ] **Step 5: Add SurveyResponse and SurveyAnswer models**

```prisma
model SurveyResponse {
  id          String    @id @default(cuid())
  surveyId    String
  userId      String
  completedAt DateTime?
  createdAt   DateTime  @default(now())

  survey  Survey         @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  user    User           @relation("SurveyResponses", fields: [userId], references: [id], onDelete: Cascade)
  answers SurveyAnswer[]

  @@unique([surveyId, userId])
}

model SurveyAnswer {
  id         String @id @default(cuid())
  responseId String
  questionId String
  value      String @db.Text

  response SurveyResponse @relation(fields: [responseId], references: [id], onDelete: Cascade)
  question SurveyQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@unique([responseId, questionId])
}
```

- [ ] **Step 6: Add SurveyInsight model**

```prisma
model SurveyInsight {
  id          String      @id @default(cuid())
  surveyId    String
  type        InsightType
  content     String      @db.Text
  generatedAt DateTime    @default(now())

  survey Survey @relation(fields: [surveyId], references: [id], onDelete: Cascade)

  @@unique([surveyId, type])
}
```

- [ ] **Step 7: Add relations on User and Organisation models**

Add to the `User` model (after `sessionAttendees` line 33):

```prisma
  surveysCreated   Survey[]         @relation("SurveysCreated")
  surveyResponses  SurveyResponse[] @relation("SurveyResponses")
```

Add to the `Organisation` model (after `ssoConfig` line 85):

```prisma
  surveyTargets SurveyTarget[]
```

- [ ] **Step 8: Push schema to database**

Run: `npx prisma db push`
Expected: "Your database is now in sync with your Prisma schema."

- [ ] **Step 9: Regenerate Prisma client**

Run: `npx prisma generate`
Expected: "✔ Generated Prisma Client"

- [ ] **Step 10: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(survey): add Survey, SurveyQuestion, SurveyTarget, SurveyResponse, SurveyAnswer, SurveyInsight models"
```

---

## Task 2: Data Access Layer — `lib/survey-db.ts`

**Files:**
- Create: `lib/survey-db.ts`

- [ ] **Step 1: Create the data access layer**

```typescript
import { prisma } from './prisma'
import type { Role, SurveyStatus } from '@prisma/client'

// ── Admin queries ──

export async function listSurveys() {
  return prisma.survey.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { questions: true, responses: true } },
      targets: {
        include: { organisation: { select: { id: true, name: true } } },
      },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  })
}

export async function getSurveyById(surveyId: string) {
  return prisma.survey.findUnique({
    where: { id: surveyId },
    include: {
      questions: { orderBy: { order: 'asc' } },
      targets: {
        include: { organisation: { select: { id: true, name: true } } },
      },
      _count: { select: { responses: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  })
}

export async function getSurveyResults(surveyId: string) {
  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: {
      questions: { orderBy: { order: 'asc' } },
      targets: {
        include: { organisation: { select: { id: true, name: true } } },
      },
      responses: {
        where: { completedAt: { not: null } },
        include: {
          answers: true,
          user: {
            select: {
              id: true,
              name: true,
              role: true,
              organisationId: true,
              organisation: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  })
  return survey
}

export async function getTargetedUserCount(surveyId: string): Promise<number> {
  const targets = await prisma.surveyTarget.findMany({
    where: { surveyId },
  })

  if (targets.length === 0) return 0

  // Build OR conditions from targets
  const orConditions: Array<Record<string, unknown>> = []
  for (const t of targets) {
    const condition: Record<string, unknown> = {
      role: { notIn: ['SUPER_ADMIN', 'ORG_ADMIN'] as Role[] },
      active: true,
    }
    if (t.role) condition.role = t.role
    if (t.organisationId) condition.organisationId = t.organisationId
    orConditions.push(condition)
  }

  return prisma.user.count({ where: { OR: orConditions } })
}

export async function getSurveyInsights(surveyId: string) {
  return prisma.surveyInsight.findMany({
    where: { surveyId },
    orderBy: { generatedAt: 'desc' },
  })
}

// ── User queries ──

export async function getPendingSurveys(userId: string, userRole: Role, userOrgId: string | null) {
  // Find all published, non-expired surveys that target this user
  const now = new Date()

  const surveys = await prisma.survey.findMany({
    where: {
      status: 'PUBLISHED',
      OR: [
        { closesAt: null },
        { closesAt: { gt: now } },
      ],
      targets: {
        some: {
          AND: [
            { OR: [{ role: null }, { role: userRole }] },
            { OR: [{ organisationId: null }, { organisationId: userOrgId }] },
          ],
        },
      },
      // Exclude already completed
      NOT: {
        responses: {
          some: { userId, completedAt: { not: null } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { questions: true } },
    },
  })

  return surveys
}

export async function getSurveyForUser(surveyId: string, userId: string, userRole: Role, userOrgId: string | null) {
  const survey = await prisma.survey.findFirst({
    where: {
      id: surveyId,
      status: 'PUBLISHED',
      OR: [
        { closesAt: null },
        { closesAt: { gt: new Date() } },
      ],
      targets: {
        some: {
          AND: [
            { OR: [{ role: null }, { role: userRole }] },
            { OR: [{ organisationId: null }, { organisationId: userOrgId }] },
          ],
        },
      },
    },
    include: {
      questions: { orderBy: { order: 'asc' } },
    },
  })

  if (!survey) return null

  // Check if already completed
  const existing = await prisma.surveyResponse.findUnique({
    where: { surveyId_userId: { surveyId, userId } },
  })
  if (existing?.completedAt) return null

  return survey
}

export async function submitSurveyResponse(
  surveyId: string,
  userId: string,
  answers: Array<{ questionId: string; value: string }>
) {
  return prisma.$transaction(async (tx) => {
    // Check for duplicate
    const existing = await tx.surveyResponse.findUnique({
      where: { surveyId_userId: { surveyId, userId } },
    })
    if (existing?.completedAt) {
      throw new Error('Survey already completed')
    }

    // Create or update response
    const response = existing
      ? await tx.surveyResponse.update({
          where: { id: existing.id },
          data: { completedAt: new Date() },
        })
      : await tx.surveyResponse.create({
          data: {
            surveyId,
            userId,
            completedAt: new Date(),
          },
        })

    // Create answers
    await tx.surveyAnswer.createMany({
      data: answers.map((a) => ({
        responseId: response.id,
        questionId: a.questionId,
        value: a.value,
      })),
    })

    return response
  })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `survey-db.ts`

- [ ] **Step 3: Commit**

```bash
git add lib/survey-db.ts
git commit -m "feat(survey): add data access layer for surveys"
```

---

## Task 3: AI Integration — `lib/survey-ai.ts`

**Files:**
- Create: `lib/survey-ai.ts`

- [ ] **Step 1: Create the AI module**

```typescript
import { GoogleGenAI } from '@google/genai'
import type { ParsedFile } from './content-generator-types'

const MODEL = 'gemini-2.5-flash'

function getAI(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured')
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) return fenced[1].trim()
  return text.trim()
}

export interface GeneratedSurvey {
  title: string
  description: string
  questions: Array<{
    type: 'MULTIPLE_CHOICE' | 'YES_NO' | 'FREE_TEXT' | 'RATING_SCALE' | 'MULTI_SELECT'
    question: string
    options?: string[]
    required: boolean
    order: number
  }>
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxRetries) throw error
      await new Promise((r) => setTimeout(r, baseDelay * Math.pow(2, attempt)))
    }
  }
  throw new Error('Unreachable')
}

// ── Survey Generation ──

export async function generateSurveyFromTopic(
  topic: string,
  audience?: string
): Promise<GeneratedSurvey> {
  const ai = getAI()

  const prompt = `You are an expert survey designer for training and education programmes.
Create a professional survey based on this topic: "${topic}"
${audience ? `Target audience: ${audience}` : ''}

Generate a survey with 8-12 questions using a good mix of these question types:
- MULTIPLE_CHOICE: single select from options (provide 3-5 options)
- YES_NO: yes or no question
- FREE_TEXT: open-ended text response
- RATING_SCALE: 1-5 rating (do NOT provide options, the scale is always 1-5)
- MULTI_SELECT: select all that apply (provide 3-6 options)

Use a natural flow: start with easier questions, put sensitive/open-ended ones later.
Include at least one FREE_TEXT question for qualitative feedback.
Include at least one RATING_SCALE question.

Return ONLY valid JSON in this exact format:
{
  "title": "Survey title",
  "description": "Brief survey description",
  "questions": [
    {
      "type": "MULTIPLE_CHOICE",
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C"],
      "required": true,
      "order": 1
    },
    {
      "type": "RATING_SCALE",
      "question": "How would you rate...?",
      "required": true,
      "order": 2
    },
    {
      "type": "FREE_TEXT",
      "question": "What suggestions do you have?",
      "required": false,
      "order": 3
    }
  ]
}

Do NOT include options for YES_NO or RATING_SCALE types.
Do NOT include markdown formatting or explanation — ONLY the JSON object.`

  return withRetry(async () => {
    const response = await ai.models.generateContent({ model: MODEL, contents: prompt })
    const text = response.text ?? ''
    const json = extractJson(text)
    return JSON.parse(json) as GeneratedSurvey
  })
}

export async function generateSurveyFromFiles(
  files: ParsedFile[]
): Promise<GeneratedSurvey> {
  const ai = getAI()

  const fileContent = files
    .map((f) => {
      const sections = f.sections
        .map((s) => `### ${s.heading}\n${s.content}`)
        .join('\n\n')
      return `## File: ${f.fileName}\n${sections}`
    })
    .join('\n\n---\n\n')

  const prompt = `You are an expert survey designer for training and education programmes.
Based on the following training material, create a survey that assesses understanding and gathers feedback.

Training Material:
${fileContent}

Generate a survey with 8-12 questions using a good mix of these question types:
- MULTIPLE_CHOICE: single select from options (provide 3-5 options)
- YES_NO: yes or no question
- FREE_TEXT: open-ended text response
- RATING_SCALE: 1-5 rating (do NOT provide options, the scale is always 1-5)
- MULTI_SELECT: select all that apply (provide 3-6 options)

Mix comprehension questions (testing understanding of the material) with feedback questions (how useful was it, what could improve).
Start with comprehension, end with feedback.
Include at least one FREE_TEXT and one RATING_SCALE question.

Return ONLY valid JSON in this exact format:
{
  "title": "Survey title",
  "description": "Brief survey description",
  "questions": [
    {
      "type": "MULTIPLE_CHOICE",
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C"],
      "required": true,
      "order": 1
    }
  ]
}

Do NOT include options for YES_NO or RATING_SCALE types.
Do NOT include markdown formatting or explanation — ONLY the JSON object.`

  return withRetry(async () => {
    const response = await ai.models.generateContent({ model: MODEL, contents: prompt })
    const text = response.text ?? ''
    const json = extractJson(text)
    return JSON.parse(json) as GeneratedSurvey
  })
}

// ── Results Insights ──

interface ResultsData {
  surveyTitle: string
  totalResponses: number
  questions: Array<{
    question: string
    type: string
    responses: Array<{
      value: string
      role: string
      orgName: string | null
    }>
  }>
}

export async function generateSurveySummary(data: ResultsData): Promise<string> {
  const ai = getAI()

  const questionSummaries = data.questions.map((q) => {
    if (q.type === 'RATING_SCALE') {
      const values = q.responses.map((r) => parseInt(r.value)).filter((v) => !isNaN(v))
      const avg = values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : 'N/A'
      return `Q: "${q.question}" (Rating Scale) — Average: ${avg}/5, ${values.length} responses`
    }
    if (q.type === 'YES_NO') {
      const yes = q.responses.filter((r) => r.value === 'yes').length
      const no = q.responses.filter((r) => r.value === 'no').length
      return `Q: "${q.question}" (Yes/No) — Yes: ${yes}, No: ${no}`
    }
    if (q.type === 'MULTIPLE_CHOICE' || q.type === 'MULTI_SELECT') {
      const counts: Record<string, number> = {}
      for (const r of q.responses) {
        const values = q.type === 'MULTI_SELECT' ? (() => { try { return JSON.parse(r.value) } catch { return [r.value] } })() : [r.value]
        for (const v of values) {
          counts[v] = (counts[v] || 0) + 1
        }
      }
      const breakdown = Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(', ')
      return `Q: "${q.question}" (${q.type}) — ${breakdown}`
    }
    // FREE_TEXT
    const sampleResponses = q.responses.slice(0, 10).map((r) => `"${r.value.slice(0, 200)}"`).join('; ')
    return `Q: "${q.question}" (Free Text) — ${q.responses.length} responses. Samples: ${sampleResponses}`
  }).join('\n')

  const caveat = data.totalResponses < 5
    ? `\n\nNote: This survey has only ${data.totalResponses} response(s). Results may not be representative.`
    : ''

  const prompt = `You are an expert data analyst reviewing survey results for a training programme.

Survey: "${data.surveyTitle}"
Total responses: ${data.totalResponses}${caveat}

Results:
${questionSummaries}

Provide a clear, professional summary of the overall results in 3-5 paragraphs.
Identify key trends, notable patterns, and any areas of concern.
Use HTML formatting (<p>, <strong>, <ul>, <li>) for structure.
Be factual and specific — reference actual numbers and percentages.`

  const response = await ai.models.generateContent({ model: MODEL, contents: prompt })
  return response.text ?? ''
}

export async function generateSurveyComparative(data: ResultsData): Promise<string> {
  const ai = getAI()

  // Build per-role and per-org breakdowns
  const roles = [...new Set(data.questions.flatMap((q) => q.responses.map((r) => r.role)))]
  const orgs = [...new Set(data.questions.flatMap((q) => q.responses.map((r) => r.orgName).filter(Boolean)))]

  const breakdowns = data.questions.map((q) => {
    const byRole: Record<string, string[]> = {}
    const byOrg: Record<string, string[]> = {}
    for (const r of q.responses) {
      if (!byRole[r.role]) byRole[r.role] = []
      byRole[r.role].push(r.value)
      if (r.orgName) {
        if (!byOrg[r.orgName]) byOrg[r.orgName] = []
        byOrg[r.orgName].push(r.value)
      }
    }

    let detail = `Q: "${q.question}" (${q.type})\n`
    if (q.type === 'RATING_SCALE') {
      for (const [role, vals] of Object.entries(byRole)) {
        const nums = vals.map(Number).filter((v) => !isNaN(v))
        const avg = nums.length > 0 ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1) : 'N/A'
        detail += `  Role ${role}: avg ${avg}/5 (${nums.length} responses)\n`
      }
      for (const [org, vals] of Object.entries(byOrg)) {
        const nums = vals.map(Number).filter((v) => !isNaN(v))
        const avg = nums.length > 0 ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1) : 'N/A'
        detail += `  Org "${org}": avg ${avg}/5 (${nums.length} responses)\n`
      }
    } else if (q.type === 'YES_NO') {
      for (const [role, vals] of Object.entries(byRole)) {
        const yes = vals.filter((v) => v === 'yes').length
        detail += `  Role ${role}: ${yes}/${vals.length} yes\n`
      }
    }
    return detail
  }).join('\n')

  const caveat = data.totalResponses < 5
    ? `\n\nNote: This survey has only ${data.totalResponses} response(s). Comparisons may not be statistically meaningful.`
    : ''

  const prompt = `You are an expert data analyst comparing survey results across different user groups.

Survey: "${data.surveyTitle}"
Total responses: ${data.totalResponses}
Roles represented: ${roles.join(', ')}
Organisations represented: ${orgs.join(', ') || 'N/A'}${caveat}

Breakdowns:
${breakdowns}

Provide a comparative analysis highlighting meaningful differences between roles and organisations.
Focus on questions where groups diverged significantly.
Use HTML formatting (<p>, <strong>, <ul>, <li>, <table>, <tr>, <td>) for structure.
Be specific — cite numbers and percentages. Note any patterns that suggest different needs or experiences across groups.`

  const response = await ai.models.generateContent({ model: MODEL, contents: prompt })
  return response.text ?? ''
}

export async function generateSurveyRecommendations(data: ResultsData): Promise<string> {
  const ai = getAI()

  const questionSummaries = data.questions.map((q) => {
    if (q.type === 'RATING_SCALE') {
      const values = q.responses.map((r) => parseInt(r.value)).filter((v) => !isNaN(v))
      const avg = values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : 'N/A'
      return `Q: "${q.question}" — Average rating: ${avg}/5`
    }
    if (q.type === 'FREE_TEXT') {
      const samples = q.responses.slice(0, 10).map((r) => `"${r.value.slice(0, 200)}"`).join('; ')
      return `Q: "${q.question}" — Responses: ${samples}`
    }
    return `Q: "${q.question}" (${q.type}) — ${q.responses.length} responses`
  }).join('\n')

  const caveat = data.totalResponses < 5
    ? `\n\nNote: Based on limited responses (${data.totalResponses}). Recommendations should be treated as preliminary.`
    : ''

  const prompt = `You are an expert training programme advisor analysing survey results.

Survey: "${data.surveyTitle}"
Total responses: ${data.totalResponses}${caveat}

Results Summary:
${questionSummaries}

Based on these results, provide a prioritised list of 5-7 actionable recommendations.
Each recommendation should:
- Reference specific survey questions and data points
- Be concrete and implementable
- Indicate priority (High/Medium/Low)

Use HTML formatting (<p>, <strong>, <ol>, <li>) for structure.
Focus on improvements that would have the most impact on training quality and learner satisfaction.`

  const response = await ai.models.generateContent({ model: MODEL, contents: prompt })
  return response.text ?? ''
}

// Helper to build ResultsData from a survey with responses
export function buildResultsData(survey: {
  title: string
  questions: Array<{
    id: string
    question: string
    type: string
  }>
  responses: Array<{
    answers: Array<{ questionId: string; value: string }>
    user: {
      role: string
      organisation: { name: string } | null
    }
  }>
}): ResultsData {
  return {
    surveyTitle: survey.title,
    totalResponses: survey.responses.length,
    questions: survey.questions.map((q) => ({
      question: q.question,
      type: q.type,
      responses: survey.responses
        .flatMap((r) =>
          r.answers
            .filter((a) => a.questionId === q.id)
            .map((a) => ({
              value: a.value,
              role: r.user.role,
              orgName: r.user.organisation?.name ?? null,
            }))
        ),
    })),
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `survey-ai.ts`

- [ ] **Step 3: Commit**

```bash
git add lib/survey-ai.ts
git commit -m "feat(survey): add AI generation and insights via Gemini"
```

---

## Task 4: Super Admin API Routes — CRUD

**Files:**
- Create: `app/api/super-admin/surveys/route.ts`
- Create: `app/api/super-admin/surveys/[surveyId]/route.ts`

- [ ] **Step 1: Create list/create route**

Create `app/api/super-admin/surveys/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { listSurveys } from '@/lib/survey-db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const surveys = await listSurveys()
  return NextResponse.json(surveys)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { title, description, closesAt, questions, targets } = body

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  const survey = await prisma.survey.create({
    data: {
      title,
      description: description ?? null,
      closesAt: closesAt ? new Date(closesAt) : null,
      createdById: session.user.id,
      questions: {
        create: (questions ?? []).map((q: { type: string; question: string; options?: string[]; required?: boolean; order: number }) => ({
          type: q.type,
          question: q.question,
          options: q.options ? JSON.stringify(q.options) : null,
          required: q.required ?? true,
          order: q.order,
        })),
      },
      targets: {
        create: (targets ?? []).map((t: { role?: string; organisationId?: string }) => ({
          role: t.role ?? null,
          organisationId: t.organisationId ?? null,
        })),
      },
    },
    include: {
      questions: { orderBy: { order: 'asc' } },
      targets: true,
      _count: { select: { responses: true } },
    },
  })

  return NextResponse.json(survey, { status: 201 })
}
```

- [ ] **Step 2: Create get/update/delete route**

Create `app/api/super-admin/surveys/[surveyId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { getSurveyById } from '@/lib/survey-db'

export async function GET(
  _req: NextRequest,
  { params }: { params: { surveyId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const survey = await getSurveyById(params.surveyId)
  if (!survey) {
    return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
  }

  return NextResponse.json(survey)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { surveyId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await prisma.survey.findUnique({ where: { id: params.surveyId } })
  if (!existing) {
    return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
  }
  if (existing.status !== 'DRAFT') {
    return NextResponse.json({ error: 'Only draft surveys can be edited' }, { status: 400 })
  }

  const body = await req.json()
  const { title, description, closesAt, questions, targets } = body

  // Update survey fields
  const updateData: Record<string, unknown> = {}
  if (title !== undefined) updateData.title = title
  if (description !== undefined) updateData.description = description
  if (closesAt !== undefined) updateData.closesAt = closesAt ? new Date(closesAt) : null

  // Replace questions and targets in a transaction
  const survey = await prisma.$transaction(async (tx) => {
    if (questions !== undefined) {
      await tx.surveyQuestion.deleteMany({ where: { surveyId: params.surveyId } })
      await tx.surveyQuestion.createMany({
        data: questions.map((q: { type: string; question: string; options?: string[]; required?: boolean; order: number }) => ({
          surveyId: params.surveyId,
          type: q.type,
          question: q.question,
          options: q.options ? JSON.stringify(q.options) : null,
          required: q.required ?? true,
          order: q.order,
        })),
      })
    }

    if (targets !== undefined) {
      await tx.surveyTarget.deleteMany({ where: { surveyId: params.surveyId } })
      await tx.surveyTarget.createMany({
        data: targets.map((t: { role?: string; organisationId?: string }) => ({
          surveyId: params.surveyId,
          role: t.role ?? null,
          organisationId: t.organisationId ?? null,
        })),
      })
    }

    return tx.survey.update({
      where: { id: params.surveyId },
      data: updateData,
      include: {
        questions: { orderBy: { order: 'asc' } },
        targets: true,
        _count: { select: { responses: true } },
      },
    })
  })

  return NextResponse.json(survey)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { surveyId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const survey = await prisma.survey.findUnique({ where: { id: params.surveyId } })
  if (!survey) {
    return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
  }

  // Cascade delete handled by Prisma schema (onDelete: Cascade)
  await prisma.survey.delete({ where: { id: params.surveyId } })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/super-admin/surveys/route.ts app/api/super-admin/surveys/\[surveyId\]/route.ts
git commit -m "feat(survey): add super admin CRUD API routes"
```

---

## Task 5: Super Admin API Routes — Publish, Close, Results, Insights

**Files:**
- Create: `app/api/super-admin/surveys/[surveyId]/publish/route.ts`
- Create: `app/api/super-admin/surveys/[surveyId]/close/route.ts`
- Create: `app/api/super-admin/surveys/[surveyId]/results/route.ts`
- Create: `app/api/super-admin/surveys/[surveyId]/insights/route.ts`

- [ ] **Step 1: Create publish route**

Create `app/api/super-admin/surveys/[surveyId]/publish/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: NextRequest,
  { params }: { params: { surveyId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const survey = await prisma.survey.findUnique({
    where: { id: params.surveyId },
    include: {
      _count: { select: { questions: true, targets: true } },
    },
  })

  if (!survey) {
    return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
  }
  if (survey.status !== 'DRAFT') {
    return NextResponse.json({ error: 'Only draft surveys can be published' }, { status: 400 })
  }
  if (survey._count.questions === 0) {
    return NextResponse.json({ error: 'Add at least one question before publishing' }, { status: 400 })
  }
  if (survey._count.targets === 0) {
    return NextResponse.json({ error: 'Select at least one target audience before publishing' }, { status: 400 })
  }

  const updated = await prisma.survey.update({
    where: { id: params.surveyId },
    data: { status: 'PUBLISHED' },
  })

  return NextResponse.json(updated)
}
```

- [ ] **Step 2: Create close route**

Create `app/api/super-admin/surveys/[surveyId]/close/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: NextRequest,
  { params }: { params: { surveyId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const survey = await prisma.survey.findUnique({ where: { id: params.surveyId } })
  if (!survey) {
    return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
  }
  if (survey.status !== 'PUBLISHED') {
    return NextResponse.json({ error: 'Only published surveys can be closed' }, { status: 400 })
  }

  const updated = await prisma.survey.update({
    where: { id: params.surveyId },
    data: { status: 'CLOSED' },
  })

  return NextResponse.json(updated)
}
```

- [ ] **Step 3: Create results route**

Create `app/api/super-admin/surveys/[surveyId]/results/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { getSurveyResults, getTargetedUserCount } from '@/lib/survey-db'

export async function GET(
  _req: NextRequest,
  { params }: { params: { surveyId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const survey = await getSurveyResults(params.surveyId)
  if (!survey) {
    return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
  }

  const targetedCount = await getTargetedUserCount(params.surveyId)

  return NextResponse.json({
    survey,
    targetedCount,
    responseCount: survey.responses.length,
    responseRate: targetedCount > 0
      ? Math.round((survey.responses.length / targetedCount) * 100)
      : 0,
  })
}
```

- [ ] **Step 4: Create insights route**

Create `app/api/super-admin/surveys/[surveyId]/insights/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { getSurveyResults, getSurveyInsights } from '@/lib/survey-db'
import {
  generateSurveySummary,
  generateSurveyComparative,
  generateSurveyRecommendations,
  buildResultsData,
} from '@/lib/survey-ai'

export const maxDuration = 120

export async function GET(
  _req: NextRequest,
  { params }: { params: { surveyId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const insights = await getSurveyInsights(params.surveyId)
  return NextResponse.json(insights)
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { surveyId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const survey = await getSurveyResults(params.surveyId)
  if (!survey) {
    return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
  }

  if (survey.responses.length === 0) {
    return NextResponse.json({ error: 'No responses to analyse' }, { status: 400 })
  }

  const data = buildResultsData({
    title: survey.title,
    questions: survey.questions.map((q) => ({
      id: q.id,
      question: q.question,
      type: q.type,
    })),
    responses: survey.responses.map((r) => ({
      answers: r.answers.map((a) => ({ questionId: a.questionId, value: a.value })),
      user: {
        role: r.user.role,
        organisation: r.user.organisation,
      },
    })),
  })

  // Generate all three insight types
  const [summary, comparative, recommendations] = await Promise.all([
    generateSurveySummary(data),
    generateSurveyComparative(data),
    generateSurveyRecommendations(data),
  ])

  // Upsert insights (replace existing)
  const upserts = [
    { type: 'SUMMARY' as const, content: summary },
    { type: 'COMPARATIVE' as const, content: comparative },
    { type: 'RECOMMENDATIONS' as const, content: recommendations },
  ]

  const insights = await prisma.$transaction(
    upserts.map((u) =>
      prisma.surveyInsight.upsert({
        where: { surveyId_type: { surveyId: params.surveyId, type: u.type } },
        create: { surveyId: params.surveyId, type: u.type, content: u.content },
        update: { content: u.content, generatedAt: new Date() },
      })
    )
  )

  return NextResponse.json(insights)
}
```

- [ ] **Step 5: Commit**

```bash
git add app/api/super-admin/surveys/\[surveyId\]/publish/route.ts app/api/super-admin/surveys/\[surveyId\]/close/route.ts app/api/super-admin/surveys/\[surveyId\]/results/route.ts app/api/super-admin/surveys/\[surveyId\]/insights/route.ts
git commit -m "feat(survey): add publish, close, results, and insights API routes"
```

---

## Task 6: Super Admin API Routes — AI Generation

**Files:**
- Create: `app/api/super-admin/surveys/generate-ai/route.ts`
- Create: `app/api/super-admin/surveys/generate-ai-from-files/route.ts`

- [ ] **Step 1: Create topic-based AI generation route**

Create `app/api/super-admin/surveys/generate-ai/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { generateSurveyFromTopic } from '@/lib/survey-ai'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { topic, audience } = body

  if (!topic) {
    return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
  }

  try {
    const survey = await generateSurveyFromTopic(topic, audience)
    return NextResponse.json(survey)
  } catch (error) {
    console.error('AI survey generation failed:', error)
    return NextResponse.json(
      { error: 'Failed to generate survey. Please try again.' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Create file-based AI generation route**

Create `app/api/super-admin/surveys/generate-ai-from-files/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { parseFiles } from '@/lib/file-parser'
import { generateSurveyFromFiles } from '@/lib/survey-ai'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await req.formData()
  const files = formData.getAll('files') as File[]

  if (files.length === 0) {
    return NextResponse.json({ error: 'At least one file is required' }, { status: 400 })
  }

  try {
    // Parse files
    const fileBuffers = await Promise.all(
      files.map(async (file) => ({
        buffer: Buffer.from(await file.arrayBuffer()),
        name: file.name,
      }))
    )
    const parsed = await parseFiles(fileBuffers)

    // Generate survey from parsed content
    const survey = await generateSurveyFromFiles(parsed)
    return NextResponse.json(survey)
  } catch (error) {
    console.error('AI survey generation from files failed:', error)
    return NextResponse.json(
      { error: 'Failed to generate survey from files. Please try again.' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/super-admin/surveys/generate-ai/route.ts app/api/super-admin/surveys/generate-ai-from-files/route.ts
git commit -m "feat(survey): add AI survey generation routes (topic + file-based)"
```

---

## Task 7: User API Routes — Pending, View, Respond

**Files:**
- Create: `app/api/surveys/pending/route.ts`
- Create: `app/api/surveys/[surveyId]/route.ts`
- Create: `app/api/surveys/[surveyId]/respond/route.ts`

- [ ] **Step 1: Create pending surveys route**

Create `app/api/surveys/pending/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isLeafRole } from '@/lib/rbac'
import { getPendingSurveys } from '@/lib/survey-db'
import type { Role } from '@prisma/client'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isLeafRole(session)) {
    return NextResponse.json([], { status: 200 })
  }

  const surveys = await getPendingSurveys(
    session.user.id,
    session.user.role as Role,
    session.user.organisationId ?? null
  )

  return NextResponse.json(surveys)
}
```

- [ ] **Step 2: Create single survey route for users**

Create `app/api/surveys/[surveyId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSurveyForUser } from '@/lib/survey-db'
import type { Role } from '@prisma/client'

export async function GET(
  _req: NextRequest,
  { params }: { params: { surveyId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const survey = await getSurveyForUser(
    params.surveyId,
    session.user.id,
    session.user.role as Role,
    session.user.organisationId ?? null
  )

  if (!survey) {
    return NextResponse.json({ error: 'Survey not found or already completed' }, { status: 404 })
  }

  return NextResponse.json(survey)
}
```

- [ ] **Step 3: Create respond route**

Create `app/api/surveys/[surveyId]/respond/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSurveyForUser, submitSurveyResponse } from '@/lib/survey-db'
import type { Role } from '@prisma/client'

export async function POST(
  req: NextRequest,
  { params }: { params: { surveyId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify survey is accessible to user
  const survey = await getSurveyForUser(
    params.surveyId,
    session.user.id,
    session.user.role as Role,
    session.user.organisationId ?? null
  )

  if (!survey) {
    return NextResponse.json({ error: 'Survey not found or already completed' }, { status: 404 })
  }

  const body = await req.json()
  const { answers } = body as { answers: Array<{ questionId: string; value: string }> }

  if (!answers || !Array.isArray(answers)) {
    return NextResponse.json({ error: 'Answers are required' }, { status: 400 })
  }

  // Validate required questions are answered
  const requiredQuestionIds = survey.questions
    .filter((q) => q.required)
    .map((q) => q.id)

  const answeredIds = new Set(answers.map((a) => a.questionId))
  const missing = requiredQuestionIds.filter((id) => !answeredIds.has(id))

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required answers for ${missing.length} question(s)` },
      { status: 400 }
    )
  }

  try {
    const response = await submitSurveyResponse(params.surveyId, session.user.id, answers)
    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Survey already completed') {
      return NextResponse.json({ error: 'Survey already completed' }, { status: 409 })
    }
    throw error
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/surveys/pending/route.ts app/api/surveys/\[surveyId\]/route.ts app/api/surveys/\[surveyId\]/respond/route.ts
git commit -m "feat(survey): add user-facing API routes (pending, view, respond)"
```

---

## Task 8: Super Admin Sidebar — Add Surveys Nav Item

**Files:**
- Modify: `components/layout/super-admin-sidebar.tsx`

- [ ] **Step 1: Add ClipboardList import and nav item**

Add `ClipboardList` to the lucide-react import on line 8 (after `BookOpen`):

Change line 6-15 from:
```typescript
import {
  LayoutDashboard,
  Building2,
  BookOpen,
  Megaphone,
  BarChart3,
  LogOut,
  X,
  Crown,
} from 'lucide-react'
```

To:
```typescript
import {
  LayoutDashboard,
  Building2,
  BookOpen,
  ClipboardList,
  Megaphone,
  BarChart3,
  LogOut,
  X,
  Crown,
} from 'lucide-react'
```

Add the Surveys nav item after Training Content (line 28), so `NAV_ITEMS` becomes:

```typescript
const NAV_ITEMS: NavItem[] = [
  { href: '/super-admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/super-admin/organisations', label: 'Organisations', icon: Building2 },
  { href: '/super-admin/training', label: 'Training Content', icon: BookOpen },
  { href: '/super-admin/surveys', label: 'Surveys', icon: ClipboardList },
  { href: '/super-admin/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/super-admin/reports', label: 'Reports', icon: BarChart3 },
]
```

- [ ] **Step 2: Commit**

```bash
git add components/layout/super-admin-sidebar.tsx
git commit -m "feat(survey): add Surveys nav item to super admin sidebar"
```

---

## Task 9: Survey Target Picker Component

**Files:**
- Create: `components/super-admin/survey-target-picker.tsx`

- [ ] **Step 1: Create the target picker component**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Users, Building2, Check } from 'lucide-react'
import { clsx } from 'clsx'

interface Organisation {
  id: string
  name: string
}

export interface SurveyTargetConfig {
  role: string | null
  organisationId: string | null
}

const LEAF_ROLES = [
  { value: 'CAREGIVER', label: 'Practitioner' },
  { value: 'CAREER_DEV_OFFICER', label: 'Career Dev Officer' },
  { value: 'STUDENT', label: 'Student' },
  { value: 'INTERN', label: 'Intern' },
  { value: 'EMPLOYEE', label: 'Employee' },
]

interface SurveyTargetPickerProps {
  value: SurveyTargetConfig[]
  onChange: (targets: SurveyTargetConfig[]) => void
}

export function SurveyTargetPicker({ value, onChange }: SurveyTargetPickerProps) {
  const [orgs, setOrgs] = useState<Organisation[]>([])
  const [allRoles, setAllRoles] = useState(false)
  const [allOrgs, setAllOrgs] = useState(true)
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set())
  const [selectedOrgs, setSelectedOrgs] = useState<Set<string>>(new Set())

  // Load organisations
  useEffect(() => {
    fetch('/api/super-admin/organisations')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setOrgs(data)
      })
      .catch(() => {})
  }, [])

  // Initialize from value prop
  useEffect(() => {
    if (value.length === 0) return

    const hasAllRoles = value.some((t) => t.role === null)
    const hasAllOrgs = value.some((t) => t.organisationId === null)

    setAllRoles(hasAllRoles)
    setAllOrgs(hasAllOrgs)

    if (!hasAllRoles) {
      setSelectedRoles(new Set(value.map((t) => t.role).filter(Boolean) as string[]))
    }
    if (!hasAllOrgs) {
      setSelectedOrgs(new Set(value.map((t) => t.organisationId).filter(Boolean) as string[]))
    }
  }, []) // Only on mount

  // Emit targets whenever selections change
  useEffect(() => {
    const targets: SurveyTargetConfig[] = []
    const roles = allRoles ? [null] : [...selectedRoles]
    const orgIds = allOrgs ? [null] : [...selectedOrgs]

    if (roles.length === 0 || orgIds.length === 0) {
      onChange([])
      return
    }

    for (const role of roles) {
      for (const orgId of orgIds) {
        targets.push({ role, organisationId: orgId })
      }
    }

    onChange(targets)
  }, [allRoles, allOrgs, selectedRoles, selectedOrgs])

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev)
      if (next.has(role)) next.delete(role)
      else next.add(role)
      return next
    })
  }

  const toggleOrg = (orgId: string) => {
    setSelectedOrgs((prev) => {
      const next = new Set(prev)
      if (next.has(orgId)) next.delete(orgId)
      else next.add(orgId)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Roles */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          <Users className="inline h-4 w-4 mr-1" />
          Target Roles
        </label>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => { setAllRoles(!allRoles); setSelectedRoles(new Set()) }}
            className={clsx(
              'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-left transition-colors',
              allRoles
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                : 'bg-calm-50 text-slate-600 hover:bg-calm-100 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
            )}
          >
            {allRoles && <Check className="h-4 w-4" />}
            All roles
          </button>
          {!allRoles && (
            <div className="grid grid-cols-2 gap-1 mt-1">
              {LEAF_ROLES.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => toggleRole(role.value)}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors',
                    selectedRoles.has(role.value)
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'bg-calm-50 text-slate-600 hover:bg-calm-100 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                  )}
                >
                  {selectedRoles.has(role.value) && <Check className="h-4 w-4" />}
                  {role.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Organisations */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          <Building2 className="inline h-4 w-4 mr-1" />
          Target Organisations
        </label>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => { setAllOrgs(!allOrgs); setSelectedOrgs(new Set()) }}
            className={clsx(
              'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-left transition-colors',
              allOrgs
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                : 'bg-calm-50 text-slate-600 hover:bg-calm-100 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
            )}
          >
            {allOrgs && <Check className="h-4 w-4" />}
            All organisations
          </button>
          {!allOrgs && orgs.length > 0 && (
            <div className="grid grid-cols-2 gap-1 mt-1 max-h-48 overflow-y-auto">
              {orgs.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => toggleOrg(org.id)}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors',
                    selectedOrgs.has(org.id)
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'bg-calm-50 text-slate-600 hover:bg-calm-100 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                  )}
                >
                  {selectedOrgs.has(org.id) && <Check className="h-4 w-4" />}
                  {org.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/super-admin/survey-target-picker.tsx
git commit -m "feat(survey): add target picker component (role × org matrix)"
```

---

## Task 10: Survey Builder Component

**Files:**
- Create: `components/super-admin/survey-builder.tsx`

- [ ] **Step 1: Create the survey builder component**

This is a large component. Create `components/super-admin/survey-builder.tsx` with the survey creation/edit form including: title, description, close date, target picker, and question editor with add/remove/reorder/type-switch/options editing.

The component should:
- Accept `initialData` prop for editing existing surveys
- Accept `onSave` callback that receives the full survey payload
- Accept `onCancel` callback
- Use `SurveyTargetPicker` for targeting
- Support all 5 question types with appropriate editors for each
- Support reorder (up/down arrows), delete, and add question
- Validate before save (title required, at least 1 question)

Due to the file's size (~400 lines), the implementer should create this file following the patterns established in `components/super-admin/program-preview.tsx` (which has the same expand/collapse, reorder, edit pattern). Key state:

```typescript
interface QuestionDraft {
  id: string
  type: 'MULTIPLE_CHOICE' | 'YES_NO' | 'FREE_TEXT' | 'RATING_SCALE' | 'MULTI_SELECT'
  question: string
  options: string[]
  required: boolean
  order: number
}

interface SurveyBuilderProps {
  initialData?: {
    id?: string
    title: string
    description: string | null
    closesAt: string | null
    questions: Array<{
      id: string
      type: string
      question: string
      options: string | null
      required: boolean
      order: number
    }>
    targets: Array<{ role: string | null; organisationId: string | null }>
  }
  onSave: (data: {
    title: string
    description: string | null
    closesAt: string | null
    questions: Array<{ type: string; question: string; options?: string[]; required: boolean; order: number }>
    targets: Array<{ role: string | null; organisationId: string | null }>
  }) => Promise<void>
  onCancel: () => void
  saving?: boolean
}
```

The form layout: title input → description textarea → close date input → target picker → question list with add button. Each question card: type selector, question text input, options editor (for MULTIPLE_CHOICE/MULTI_SELECT), required toggle, move up/down/delete buttons.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add components/super-admin/survey-builder.tsx
git commit -m "feat(survey): add survey builder component with question editor"
```

---

## Task 11: Survey AI Modal Component

**Files:**
- Create: `components/super-admin/survey-ai-modal.tsx`

- [ ] **Step 1: Create the AI generation modal**

This modal has two tabs: "From Topic" and "From Files". It calls the AI generation endpoints and returns the generated survey to the parent via `onGenerated` callback. Follow the pattern from `components/super-admin/content-generation-modal.tsx`.

Key structure:

```typescript
interface SurveyAiModalProps {
  isOpen: boolean
  onClose: () => void
  onGenerated: (survey: {
    title: string
    description: string
    questions: Array<{
      type: string
      question: string
      options?: string[]
      required: boolean
      order: number
    }>
  }) => void
}
```

The modal should:
- Have a tab toggle ("From Topic" / "From Files")
- "From Topic" tab: topic textarea + optional audience input + Generate button
- "From Files" tab: reuse `FileDropZone` component + Generate button
- Show loading state during generation
- Show error with retry on failure
- Call `onGenerated` with the result which loads it into the survey builder

- [ ] **Step 2: Commit**

```bash
git add components/super-admin/survey-ai-modal.tsx
git commit -m "feat(survey): add AI survey generation modal (topic + files)"
```

---

## Task 12: Survey Management Page

**Files:**
- Create: `app/(super-admin)/super-admin/surveys/page.tsx`

- [ ] **Step 1: Create the survey management page**

This is the main super admin surveys page. It follows the pattern from `app/(super-admin)/super-admin/training/page.tsx`:

- List all surveys with status badges
- "New Survey" button opens SurveyBuilder inline
- "Generate with AI" button opens SurveyAiModal
- Each survey card shows: title, status (DRAFT/PUBLISHED/CLOSED), response count, target summary, creation date
- Actions per survey: Edit (draft only), Publish, Close, View Results, Delete
- Confirmation dialogs for publish/delete

State management:
```typescript
const [surveys, setSurveys] = useState<Survey[]>([])
const [loading, setLoading] = useState(true)
const [showBuilder, setShowBuilder] = useState(false)
const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null)
const [showAiModal, setShowAiModal] = useState(false)
const [aiGeneratedData, setAiGeneratedData] = useState<GeneratedSurvey | null>(null)
```

Status badge colours:
```typescript
const statusColors: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  PUBLISHED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  CLOSED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}
```

Target summary function:
```typescript
function getTargetSummary(targets: Target[]): string {
  const allRoles = targets.some((t) => !t.role)
  const allOrgs = targets.some((t) => !t.organisationId)
  const roleCount = new Set(targets.map((t) => t.role).filter(Boolean)).size
  const orgNames = [...new Set(targets.map((t) => t.organisation?.name).filter(Boolean))]

  const rolePart = allRoles ? 'All roles' : `${roleCount} role${roleCount !== 1 ? 's' : ''}`
  const orgPart = allOrgs ? 'all orgs' : orgNames.join(', ')
  return `${rolePart} · ${orgPart}`
}
```

- [ ] **Step 2: Verify the page renders**

Run: `npm run dev` and navigate to `/super-admin/surveys`
Expected: Page loads, shows empty state or list of surveys

- [ ] **Step 3: Commit**

```bash
git add "app/(super-admin)/super-admin/surveys/page.tsx"
git commit -m "feat(survey): add survey management page for super admin"
```

---

## Task 13: Survey Results Page

**Files:**
- Create: `app/(super-admin)/super-admin/surveys/[surveyId]/results/page.tsx`
- Create: `components/super-admin/survey-results-view.tsx`

- [ ] **Step 1: Create the results view component**

`components/super-admin/survey-results-view.tsx` renders per-question results:
- Bar charts (Recharts `BarChart`) for MULTIPLE_CHOICE and MULTI_SELECT
- Average + star distribution for RATING_SCALE
- Yes/No percentage bar for YES_NO
- Listed text responses for FREE_TEXT

Uses Recharts (already installed). Follow the pattern from the existing reports page which already uses Recharts.

- [ ] **Step 2: Create the results page**

`app/(super-admin)/super-admin/surveys/[surveyId]/results/page.tsx`:

Server component that fetches survey results and insights, renders:
- Back link to `/super-admin/surveys`
- Survey title + status badge
- Response rate card (completed / targeted)
- `SurveyResultsView` component for per-question breakdown
- AI Insights section with "Generate Insights" / "Regenerate" button
- Three insight cards: Summary, Comparative, Recommendations (rendered as `dangerouslySetInnerHTML` since they contain HTML from Gemini)
- CSV export button

- [ ] **Step 3: Commit**

```bash
git add components/super-admin/survey-results-view.tsx "app/(super-admin)/super-admin/surveys/[surveyId]/results/page.tsx"
git commit -m "feat(survey): add results page with charts and AI insights"
```

---

## Task 14: Dashboard — Pending Surveys Component

**Files:**
- Create: `components/dashboard/pending-surveys.tsx`
- Modify: `app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Create the pending surveys component**

Create `components/dashboard/pending-surveys.tsx`:

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { ClipboardList, Loader2, X, ChevronRight, Star, Check, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { clsx } from 'clsx'

interface PendingSurvey {
  id: string
  title: string
  description: string | null
  closesAt: string | null
  _count: { questions: number }
}

interface SurveyQuestion {
  id: string
  type: 'MULTIPLE_CHOICE' | 'YES_NO' | 'FREE_TEXT' | 'RATING_SCALE' | 'MULTI_SELECT'
  question: string
  options: string | null
  required: boolean
  order: number
}

export function PendingSurveys() {
  const [surveys, setSurveys] = useState<PendingSurvey[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSurvey, setActiveSurvey] = useState<{ id: string; title: string; questions: SurveyQuestion[] } | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const fetchPending = useCallback(() => {
    fetch('/api/surveys/pending')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSurveys(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchPending() }, [fetchPending])

  const openSurvey = async (surveyId: string) => {
    try {
      const res = await fetch(`/api/surveys/${surveyId}`)
      if (!res.ok) throw new Error('Failed to load survey')
      const data = await res.json()
      setActiveSurvey({ id: data.id, title: data.title, questions: data.questions })
      setAnswers({})
      setError(null)
      setSubmitted(false)
    } catch {
      setError('Failed to load survey')
    }
  }

  const setAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleSubmit = async () => {
    if (!activeSurvey) return
    setSubmitting(true)
    setError(null)

    const answerArray = Object.entries(answers).map(([questionId, value]) => ({
      questionId,
      value,
    }))

    try {
      const res = await fetch(`/api/surveys/${activeSurvey.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answerArray }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit')
      }

      setSubmitted(true)
      // Refresh pending list
      fetchPending()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit survey')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      </div>
    )
  }

  if (surveys.length === 0 && !activeSurvey) return null

  return (
    <>
      {/* Pending surveys card */}
      {surveys.length > 0 && !activeSurvey && (
        <div className="card space-y-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Pending Surveys
              <span className="ml-2 text-sm font-normal text-slate-500">({surveys.length})</span>
            </h2>
          </div>
          <div className="space-y-2">
            {surveys.map((s) => (
              <button
                key={s.id}
                onClick={() => openSurvey(s.id)}
                className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-xl transition-colors w-full text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {s.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {s._count.questions} question{s._count.questions !== 1 ? 's' : ''}
                    {s.closesAt && ` · Closes ${format(new Date(s.closesAt), 'MMM d')}`}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-amber-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Survey completion modal */}
      {activeSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-calm-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{activeSurvey.title}</h3>
              <button
                onClick={() => setActiveSurvey(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-calm-100 dark:hover:bg-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {submitted ? (
              <div className="p-6 text-center space-y-3">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                  <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-lg font-medium text-slate-900 dark:text-white">Thank you!</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Your response has been recorded.</p>
                <button
                  onClick={() => setActiveSurvey(null)}
                  className="mt-4 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {activeSurvey.questions.map((q) => (
                  <div key={q.id} className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      {q.question}
                      {q.required && <span className="text-red-500 ml-1">*</span>}
                    </label>

                    {q.type === 'MULTIPLE_CHOICE' && (
                      <div className="space-y-1">
                        {(JSON.parse(q.options || '[]') as string[]).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setAnswer(q.id, opt)}
                            className={clsx(
                              'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-left transition-colors',
                              answers[q.id] === opt
                                ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-300 dark:bg-primary-900/30 dark:text-primary-400 dark:ring-primary-700'
                                : 'bg-calm-50 text-slate-600 hover:bg-calm-100 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                            )}
                          >
                            <div className={clsx(
                              'w-4 h-4 rounded-full border-2 flex-shrink-0',
                              answers[q.id] === opt
                                ? 'border-primary-500 bg-primary-500'
                                : 'border-slate-300 dark:border-slate-500'
                            )}>
                              {answers[q.id] === opt && <Check className="h-3 w-3 text-white" />}
                            </div>
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}

                    {q.type === 'YES_NO' && (
                      <div className="flex gap-2">
                        {['yes', 'no'].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setAnswer(q.id, val)}
                            className={clsx(
                              'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                              answers[q.id] === val
                                ? 'bg-primary-500 text-white'
                                : 'bg-calm-50 text-slate-600 hover:bg-calm-100 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                            )}
                          >
                            {val.charAt(0).toUpperCase() + val.slice(1)}
                          </button>
                        ))}
                      </div>
                    )}

                    {q.type === 'FREE_TEXT' && (
                      <textarea
                        value={answers[q.id] || ''}
                        onChange={(e) => setAnswer(q.id, e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-300 focus:border-primary-300 resize-none"
                        rows={3}
                        placeholder="Type your response..."
                      />
                    )}

                    {q.type === 'RATING_SCALE' && (
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setAnswer(q.id, String(val))}
                            className="flex flex-col items-center gap-1"
                          >
                            <Star
                              className={clsx(
                                'h-8 w-8 transition-colors',
                                Number(answers[q.id]) >= val
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-300 dark:text-slate-500'
                              )}
                            />
                            <span className="text-xs text-slate-500">{val}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {q.type === 'MULTI_SELECT' && (
                      <div className="space-y-1">
                        {(JSON.parse(q.options || '[]') as string[]).map((opt) => {
                          const selected: string[] = (() => { try { return JSON.parse(answers[q.id] || '[]') } catch { return [] } })()
                          const isSelected = selected.includes(opt)
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                const next = isSelected
                                  ? selected.filter((s) => s !== opt)
                                  : [...selected, opt]
                                setAnswer(q.id, JSON.stringify(next))
                              }}
                              className={clsx(
                                'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-left transition-colors',
                                isSelected
                                  ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-300 dark:bg-primary-900/30 dark:text-primary-400 dark:ring-primary-700'
                                  : 'bg-calm-50 text-slate-600 hover:bg-calm-100 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                              )}
                            >
                              <div className={clsx(
                                'w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center',
                                isSelected
                                  ? 'border-primary-500 bg-primary-500'
                                  : 'border-slate-300 dark:border-slate-500'
                              )}>
                                {isSelected && <Check className="h-3 w-3 text-white" />}
                              </div>
                              {opt}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}

                <div className="pt-4 border-t border-calm-200 dark:border-slate-700 flex justify-end gap-3">
                  <button
                    onClick={() => setActiveSurvey(null)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Submit Survey
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Add PendingSurveys to dashboard**

In `app/(dashboard)/dashboard/page.tsx`, add the import at the top (after line 18):

```typescript
import { PendingSurveys } from '@/components/dashboard/pending-surveys'
```

Add `<PendingSurveys />` after the `<UpcomingSessions />` component (after line 103):

```typescript
      {/* Upcoming Sessions */}
      <UpcomingSessions />

      {/* Pending Surveys */}
      <PendingSurveys />
```

- [ ] **Step 3: Verify the dashboard renders**

Run: `npm run dev` and navigate to `/dashboard`
Expected: Page loads. If no pending surveys, the card is hidden. If surveys exist, they appear.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/pending-surveys.tsx "app/(dashboard)/dashboard/page.tsx"
git commit -m "feat(survey): add pending surveys card to dashboard with completion modal"
```

---

## Task 15: Build Verification and Final Commit

**Files:** None new

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit --pretty`
Expected: No errors. Fix any that appear.

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: Build completes successfully with all new pages listed in output.

- [ ] **Step 3: Push to GitHub**

Run: `git push origin main`
Expected: Push succeeds.

- [ ] **Step 4: Deploy to Vercel**

Run: `npx vercel deploy --prod --yes`
Expected: Deployment succeeds, available at https://asd-training-app-v2.vercel.app

- [ ] **Step 5: Push schema to production database**

Run: `npx prisma db push`
Expected: Schema synced with production Neon database.

---

## Summary

| Task | Description | Estimated Complexity |
|------|-------------|---------------------|
| 1 | Prisma schema (6 models, 3 enums) | Small |
| 2 | Data access layer (`lib/survey-db.ts`) | Medium |
| 3 | AI integration (`lib/survey-ai.ts`) | Medium |
| 4 | Admin CRUD routes (list, create, get, update, delete) | Medium |
| 5 | Admin action routes (publish, close, results, insights) | Medium |
| 6 | AI generation routes (topic + files) | Small |
| 7 | User routes (pending, view, respond) | Small |
| 8 | Sidebar nav item | Tiny |
| 9 | Target picker component | Medium |
| 10 | Survey builder component | Large |
| 11 | AI modal component | Medium |
| 12 | Survey management page | Large |
| 13 | Results page + results view component | Large |
| 14 | Dashboard pending surveys + completion modal | Medium |
| 15 | Build verification + deploy | Small |
