# Survey Feature — Design Spec

**Date:** 2026-03-30
**Status:** Draft
**Feature:** Survey creation (manual + AI), targeting, completion, results analytics, and AI insights

---

## Summary

Add survey functionality to the super admin area. Super admins create surveys manually or via AI (topic-based or file-based), target them to any combination of roles and organisations, and publish them. Users see pending surveys on their dashboard and complete them inline. Super admins view results with charts and AI-generated insights (summary, comparisons across roles/orgs, actionable recommendations).

---

## Data Model

### New Models

**`Survey`**
- `id` — String, cuid
- `title` — String
- `description` — String (optional)
- `status` — Enum: `DRAFT`, `PUBLISHED`, `CLOSED`
- `closesAt` — DateTime (optional)
- `createdById` — String (FK → User)
- `createdAt` — DateTime
- `updatedAt` — DateTime
- Relations: questions, targets, responses, insights

**`SurveyQuestion`**
- `id` — String, cuid
- `surveyId` — String (FK → Survey, cascade delete)
- `type` — Enum: `MULTIPLE_CHOICE`, `YES_NO`, `FREE_TEXT`, `RATING_SCALE`, `MULTI_SELECT`
- `question` — String
- `options` — String (optional, JSON array for MULTIPLE_CHOICE and MULTI_SELECT)
- `required` — Boolean, default true
- `order` — Int
- Relations: answers

**`SurveyTarget`**
- `id` — String, cuid
- `surveyId` — String (FK → Survey, cascade delete)
- `role` — Role enum (optional — null means all roles)
- `organisationId` — String (optional, FK → Organisation — null means all orgs)
- Targeting logic: a user sees a survey if ANY target row matches them. Examples:
  - `role=null, organisationId=null` → everyone
  - `role=CAREGIVER, organisationId=null` → all caregivers
  - `role=null, organisationId=xyz` → everyone in org xyz
  - `role=STUDENT, organisationId=xyz` → students in org xyz

**`SurveyResponse`**
- `id` — String, cuid
- `surveyId` — String (FK → Survey, cascade delete)
- `userId` — String (FK → User)
- `status` — Enum: `IN_PROGRESS`, `COMPLETED`
- `completedAt` — DateTime (optional)
- `createdAt` — DateTime
- Unique constraint: surveyId + userId (one response per user per survey)
- Relations: answers

**`SurveyAnswer`**
- `id` — String, cuid
- `responseId` — String (FK → SurveyResponse, cascade delete)
- `questionId` — String (FK → SurveyQuestion, cascade delete)
- `value` — String (interpretation depends on question type)
- Unique constraint: responseId + questionId

**`SurveyInsight`**
- `id` — String, cuid
- `surveyId` — String (FK → Survey, cascade delete)
- `type` — Enum: `SUMMARY`, `COMPARATIVE`, `RECOMMENDATIONS`
- `content` — String (HTML)
- `generatedAt` — DateTime
- Unique constraint: surveyId + type (one insight per type per survey, replaced on regeneration)

### Answer Storage by Question Type

| Type | `options` field | `value` stored |
|------|----------------|----------------|
| MULTIPLE_CHOICE | JSON array of option strings | Selected option text |
| YES_NO | null | `"yes"` or `"no"` |
| FREE_TEXT | null | User's text response |
| RATING_SCALE | null (always 1–5) | `"1"` through `"5"` |
| MULTI_SELECT | JSON array of option strings | JSON array of selected options |

### No Changes to Existing Models

All new models. No modifications to User, Organisation, or any existing table.

---

## UI Flow

### Super Admin — Survey Management (`/super-admin/surveys`)

New sidebar item "Surveys" in super admin navigation. Page follows the same pattern as Training Content.

**Survey list:**
- Cards showing each survey: title, status badge (Draft/Published/Closed), response count, target summary (e.g. "All Practitioners" or "3 orgs, 2 roles"), created date
- "New Survey" button opens the survey builder
- "Generate with AI" button opens AI generation modal

**Survey builder (manual creation):**
- Title field
- Description field (optional)
- Close date picker (optional)
- Targeting matrix: multi-select roles × multi-select orgs, with "All" options
- Question editor: add/remove/reorder questions, each with type dropdown, question text, options editor (for MULTIPLE_CHOICE and MULTI_SELECT), required toggle
- Same up/down arrow reorder pattern as training modules
- Save as DRAFT, then Publish separately

**AI generation modal:**
- Two tabs: "From Topic" and "From Files"
- "From Topic": text input for topic/description, optional audience notes, "Generate" button
- "From Files": file drop zone (reuses existing FileDropZone component), accepts PDF/DOCX/PPTX, "Generate" button
- AI-generated survey loads into the builder as DRAFT, fully editable before publishing

### Super Admin — Results & Insights (`/super-admin/surveys/[surveyId]/results`)

**Overview section:**
- Response rate (completed / targeted users)
- Completion over time

**Results section — per-question breakdown:**
- Bar charts for MULTIPLE_CHOICE and MULTI_SELECT
- Average + distribution for RATING_SCALE
- Listed responses for FREE_TEXT
- Percentage split for YES_NO

**Insights section:**
- Three subsections: Summary, Comparative Analysis, Recommendations
- "Generate Insights" button triggers AI analysis
- "Regenerate" button to refresh after more responses come in
- Insights stored in SurveyInsight — not regenerated on every page load

**Export:**
- Download results as CSV

### Dashboard — Pending Surveys

New card on the dashboard (similar to "Upcoming Sessions" card):
- Shows count of pending surveys
- Lists each with title and close date if set
- Click opens a survey completion modal — scrollable form with all questions, submit at the end
- Completed surveys disappear from the card
- Card hidden when no pending surveys

---

## API Routes

### Super Admin Routes (require SUPER_ADMIN role)

**`GET /api/super-admin/surveys`** — List all surveys with response counts and target summaries.

**`POST /api/super-admin/surveys`** — Create new survey with questions and targets. Input: `{ title, description?, closesAt?, questions: Array<{ type, question, options?, required, order }>, targets: Array<{ role?, organisationId? }> }`. Creates as DRAFT.

**`GET /api/super-admin/surveys/[surveyId]`** — Get survey with questions, targets, and response count.

**`PATCH /api/super-admin/surveys/[surveyId]`** — Update survey (only DRAFT status). Replaces questions and targets entirely.

**`DELETE /api/super-admin/surveys/[surveyId]`** — Delete survey. Cascade deletes questions, targets, responses, answers, insights.

**`POST /api/super-admin/surveys/[surveyId]/publish`** — Set status to PUBLISHED. Validates: at least one question, at least one target.

**`POST /api/super-admin/surveys/[surveyId]/close`** — Set status to CLOSED.

**`GET /api/super-admin/surveys/[surveyId]/results`** — Aggregated results: per-question distributions, response rate, breakdown by role and organisation.

**`POST /api/super-admin/surveys/[surveyId]/generate-insights`** — Trigger Gemini analysis. Generates all three insight types (summary, comparative, recommendations). Stores in SurveyInsight, replacing any existing insights.

**`GET /api/super-admin/surveys/[surveyId]/insights`** — Get stored insights.

**`POST /api/super-admin/surveys/generate-ai`** — AI survey from topic. Input: `{ topic: string, audience?: string }`. Output: `{ title, description, questions: Array<{ type, question, options?, required, order }> }`.

**`POST /api/super-admin/surveys/generate-ai-from-files`** — AI survey from files. Input: multipart form data (files). Parses files with existing `parseFiles()`, sends to Gemini. Output: same structure as topic-based.

### User Routes (require authenticated session, leaf roles only)

**`GET /api/surveys/pending`** — Get surveys targeted at the current user (matching role + org) that they haven't completed, where status is PUBLISHED and closesAt is null or in the future.

**`GET /api/surveys/[surveyId]`** — Get survey questions. Only if the survey is targeted at the user and is PUBLISHED/not expired.

**`POST /api/surveys/[surveyId]/respond`** — Submit responses. Input: `{ answers: Array<{ questionId, value }> }`. Validates all required questions are answered. Creates SurveyResponse (COMPLETED) and SurveyAnswer records in a transaction. Returns error if user already completed this survey.

---

## AI Integration

### AI Survey Generation

Lives in `lib/survey-insights.ts`, separate from observation AI (`lib/gemini.ts`) and training content AI (`lib/content-generator.ts`).

**Topic-based generation:**
- Single Gemini call with `gemini-2.5-flash`
- Prompt provides the topic and optional audience context
- Instructs Gemini to generate 8-12 questions using a mix of question types (MULTIPLE_CHOICE, YES_NO, FREE_TEXT, RATING_SCALE, MULTI_SELECT) appropriate to the topic
- Output is structured JSON matching the survey builder format
- Uses `withRetry` exponential backoff (3 retries)

**File-based generation:**
- Reuses `parseFiles()` from `lib/file-parser.ts`
- Parsed content sent to Gemini with a prompt to create a survey assessing understanding/feedback on the material
- Same retry and JSON extraction logic as content generation

### AI Results Insights

Three analysis types, each a separate Gemini call receiving aggregated results (not individual user data):

**Summary:** Overall trends, key takeaways, notable patterns. Receives question texts, response distributions, averages, free text responses. Output: 3-5 paragraphs of HTML.

**Comparative:** Cross-cutting analysis by role and organisation. Receives results segmented by role and org. Identifies meaningful differences (e.g. "Practitioners rated confidence at 4.2/5 vs Students at 3.1/5"). Output: structured HTML with comparison highlights.

**Recommendations:** Actionable next steps based on all results. References specific questions and data points. Follows the same pattern as `generateActionGuidance()` in observation insights. Output: prioritised list of recommendations with supporting evidence.

Each insight stored in `SurveyInsight`. Only regenerated on explicit "Regenerate" click. If fewer than 5 responses, insight includes caveat: "Based on limited responses (N). Results may not be representative."

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Publish with no questions | Block — "Add at least one question" |
| Publish with no targets | Block — "Select at least one target audience" |
| User opens closed/expired survey | "This survey is closed" message, hidden from dashboard |
| Partial responses | All required questions must be answered to submit. Optional questions can be skipped |
| Survey deleted with responses | Cascade delete responses, answers, insights |
| Close date passes | Auto-close check in pending API — `closesAt < now` treated as closed. No cron needed |
| AI generation fails | Retry 3 times with exponential backoff, then show error with "Try again" |
| AI insights with few responses | Generate with caveat about limited sample size |
| Org/role deleted after targeting | Existing responses preserved. Orphaned target row doesn't break — survey stops matching new users for that target |
| Duplicate submission | Reject — unique constraint on surveyId + userId |

---

## File Summary

### New Files

| File | Purpose |
|------|---------|
| `lib/survey-insights.ts` | Gemini prompts for survey generation + results analysis |
| `lib/survey-db.ts` | Data access layer (admin + user-facing queries) |
| `app/api/super-admin/surveys/route.ts` | List/create surveys |
| `app/api/super-admin/surveys/[surveyId]/route.ts` | Get/update/delete survey |
| `app/api/super-admin/surveys/[surveyId]/publish/route.ts` | Publish survey |
| `app/api/super-admin/surveys/[surveyId]/close/route.ts` | Close survey |
| `app/api/super-admin/surveys/[surveyId]/results/route.ts` | Aggregated results |
| `app/api/super-admin/surveys/[surveyId]/generate-insights/route.ts` | Trigger AI analysis |
| `app/api/super-admin/surveys/[surveyId]/insights/route.ts` | Get stored insights |
| `app/api/super-admin/surveys/generate-ai/route.ts` | AI survey from topic |
| `app/api/super-admin/surveys/generate-ai-from-files/route.ts` | AI survey from files |
| `app/api/surveys/pending/route.ts` | User's pending surveys |
| `app/api/surveys/[surveyId]/route.ts` | Get survey for user |
| `app/api/surveys/[surveyId]/respond/route.ts` | Submit responses |
| `app/(super-admin)/super-admin/surveys/page.tsx` | Survey management page |
| `app/(super-admin)/super-admin/surveys/[surveyId]/results/page.tsx` | Results + insights page |
| `components/super-admin/survey-builder.tsx` | Survey creation/edit form |
| `components/super-admin/survey-target-picker.tsx` | Role × org targeting matrix |
| `components/super-admin/survey-results-view.tsx` | Charts + results display |
| `components/super-admin/survey-ai-modal.tsx` | AI generation modal |
| `components/dashboard/survey-card.tsx` | Dashboard pending surveys card |
| `components/dashboard/survey-completion-modal.tsx` | Survey completion form |

### Modified Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add Survey, SurveyQuestion, SurveyTarget, SurveyResponse, SurveyAnswer, SurveyInsight models + enums |
| `components/layout/super-admin-sidebar.tsx` | Add "Surveys" nav item |
| `app/(dashboard)/dashboard/page.tsx` | Fetch pending surveys, render SurveyCard |

### New Dependencies

None. Uses existing `@google/genai` for AI, existing `lib/file-parser.ts` for file parsing, Recharts (already installed) for result charts.

---

## Out of Scope

- Anonymous surveys (all responses tied to a user)
- Survey templates/library (each survey is created fresh)
- Branching/conditional logic (question B only shown if question A answered "yes")
- Scheduled publishing (super admin publishes manually)
- Email notifications when a survey is published
- User viewing their own past responses
- Org admin survey creation (super admin only)
