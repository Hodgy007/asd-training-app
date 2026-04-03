# AI Careers Advisor — Design Spec

## Context

Autistic young people often find careers guidance challenging. Standard careers questionnaires can feel overwhelming, use vague or abstract language, and rarely account for sensory preferences, communication styles, or the need for predictable routines. This feature adds a guided, autism-friendly careers advisor that asks clear, concrete questions one at a time and generates a personalised careers report using AI.

It complements the existing CV Builder — the advisor helps young people discover *what* careers suit them, then the CV Builder helps them apply.

## Who Can Access

- **STUDENT, INTERN, EMPLOYEE** — complete their own questionnaire and view their report
- **CAREER_DEV_OFFICER** — complete their own questionnaire + view their students' reports (read-only, same org)
- **SUPER_ADMIN** — enable/disable per organisation via org settings (defaults to enabled)

The feature follows the same org-level toggle pattern as CV Builder (`careersAdvisorEnabled` boolean on Organisation model, surfaced on JWT, checked in RBAC helper).

## Interaction Model

A guided Q&A wizard — one question per screen, progress bar across the top, Back/Next navigation. Same structural pattern as the CV Builder wizard but with different step content.

Users can complete the questionnaire multiple times to get updated reports (e.g. after gaining new experience or changing interests).

## Questionnaire — Core Questions (required)

All questions use plain language, reassuring prompts, and multi-select pill inputs to minimise typing pressure. Free text is always optional.

| # | Question | Prompt Text | Input Type |
|---|----------|-------------|------------|
| 1 | What are you interested in? | "Pick as many as you like. There are no wrong answers." | Multi-select pills: Animals, Technology, Art & Design, Music, Science, Sport, Nature, Food & Cooking, Numbers & Data, Building & Making, Reading & Writing, Helping People, Gaming, History, Cars & Transport + Other (free text) |
| 2 | What are you good at? | "Think about things people compliment you on, or activities where you lose track of time." | Multi-select pills: Attention to detail, Problem solving, Creative thinking, Following processes, Remembering facts, Organising things, Working with my hands, Using computers, Being reliable, Staying focused, Pattern spotting + Other (free text) |
| 3 | What kind of work environment suits you best? | "Think about where you feel most comfortable and can do your best work." | Multi-select pills: Quiet workspace, Working from home, Outdoors, Predictable routine, Working alone, Small team, Clear instructions, Flexible hours, Minimal interruptions, Hands-on / physical work |
| 4 | Is there anything about work that worries you? | "It's completely OK to have concerns. Knowing them helps us suggest the right support." | Multi-select pills + optional free text: Job interviews, Meeting new people, Noisy environments, Unexpected changes, Travelling to work, Phone calls, Tight deadlines, Not sure what I want to do, Nothing specific |
| 5 | Do you have any experience — work, volunteering, or hobbies? | "This could be a job, helping out at home, a school project, or something you do in your free time. It all counts." | Optional free text with visible example |
| 6 | What stage are you at? | "This helps us give advice that's right for where you are now." | Single-select: Still at school, College or sixth form, University, Looking for work, In an internship or placement, Currently employed, Not sure |

## Questionnaire — Optional Questions

After completing the 6 core questions, a banner says: *"You've answered enough for your report! Answer more questions below for even better suggestions, or skip straight to your results."*

| # | Question | Prompt Text | Input Type |
|---|----------|-------------|------------|
| 7 | How do you prefer to communicate? | "There's no right answer — different jobs suit different styles." | Multi-select pills: Writing (email/chat), Face to face (one-on-one), Face to face (groups), Phone/video calls, Visual aids (diagrams/pictures), I prefer to listen rather than talk |
| 8 | Are there any sensory things that affect you at work or school? | "This helps us suggest workplaces where you'd feel comfortable." | Multi-select pills: Bright or flickering lights, Loud or sudden noises, Strong smells, Crowded spaces, Uncomfortable clothing (e.g. uniforms), Sitting still for long periods, None of these |
| 9 | What matters most to you in a job? | "Pick the 2 or 3 that feel most important." | Multi-select pills (max 3): Helping others, Good pay, Learning new things, Making things, Being creative, Working with a purpose, Stability and routine, Independence, Being part of a team |
| 10 | Is there anything else you'd like us to know? | "Anything at all — a dream job, something you've been thinking about, or something that's been on your mind." | Optional free text |

## Report Structure

The AI generates a structured report with these sections:

1. **Your Strengths** — A short paragraph summarising the user's key strengths based on their answers, written in second person ("You have a strong eye for detail...")
2. **Suggested Career Areas** — 3–5 career suggestions, each as a card with the career name and a short explanation of why it suits the user. Grounded in their specific answers.
3. **Next Steps** — 3–5 concrete, actionable items (e.g. "Search for apprenticeships on gov.uk", "Ask your careers professional about work experience in X", "Update your CV to highlight Y")
4. **Workplace Support** — Suggestions based on their environment/sensory/communication preferences (e.g. Access to Work scheme, asking about reasonable adjustments, flexible working)

The report includes a disclaimer: *"This report is for guidance only and does not constitute professional careers advice. Share it with your careers professional to discuss next steps."*

## AI Prompt Principles

All prompts sent to Gemini must:
- Never mention autism, disability, or diagnosis
- Use strength-focused, positive language
- Use UK English spelling and UK-specific resources (gov.uk, apprenticeships, Access to Work)
- Suggest realistic, achievable career paths (not aspirational fantasy)
- Ground suggestions in the user's specific answers, not generic advice
- Include practical next steps, not just career names
- Reference workplace adjustments without pathologising

## PDF Export

Report is downloadable as PDF using `@react-pdf/renderer` (same approach as CV Builder). Single template — clean, structured layout matching the on-screen report sections.

## Data Model

### New models

- **`CareerAdvisorSession`** — userId, status (`IN_PROGRESS` / `COMPLETE`), currentStep (Int), answers (Json — stores all question responses as a structured object), report (Text — the generated report as structured JSON), createdAt, updatedAt. `@@index([userId])`

Answers are stored as a single JSON field rather than normalised into separate tables, because the questions are fixed (not user-configurable) and the structure is simple. Example:

```json
{
  "interests": ["Technology", "Numbers & Data", "Gaming"],
  "strengths": ["Attention to detail", "Problem solving", "Using computers"],
  "environment": ["Quiet workspace", "Predictable routine", "Clear instructions"],
  "concerns": ["Job interviews", "Noisy environments"],
  "experience": "I help my neighbour with their computer...",
  "stage": "College or sixth form",
  "communication": ["Writing (email/chat)"],
  "sensory": ["Loud or sudden noises", "Crowded spaces"],
  "values": ["Learning new things", "Stability and routine"],
  "other": ""
}
```

Report is stored as structured JSON with sections (strengths, careers, nextSteps, workplaceSupport) so the UI can render it with formatting, and the PDF template can access individual sections.

### Organisation model

Add `careersAdvisorEnabled Boolean @default(true)` to Organisation — same pattern as `cvBuilderEnabled`.

## Feature Gating

Follows the exact `cvBuilderEnabled` pattern:

1. `careersAdvisorEnabled` boolean on Organisation model (default true)
2. `canAccessCareersAdvisor(session)` RBAC helper — checks role + org flag
3. `careersAdvisorEnabled` added to JWT in auth.ts callbacks
4. Sidebar conditionally shows nav item
5. API routes check `canAccessCareersAdvisor(session)`

## Pages

- `/careers-advisor` — list page showing past sessions (empty state with "Get Started" or cards for existing reports)
- `/careers-advisor/[sessionId]` — wizard shell (progress bar + active step + navigation)
- `/careers-advisor/students` — CDO view: list students with report counts (same pattern as CV Builder students page)
- `/careers-advisor/students/[userId]` — CDO view: read-only student report

## API Routes

- `GET /api/careers-advisor` — list user's sessions
- `POST /api/careers-advisor` — create new session
- `GET /api/careers-advisor/[sessionId]` — get session detail (answers + report)
- `PATCH /api/careers-advisor/[sessionId]` — update answers, currentStep
- `DELETE /api/careers-advisor/[sessionId]` — delete a session
- `POST /api/careers-advisor/[sessionId]/generate` — trigger AI report generation (rate limited: 10/5min per user)
- `GET /api/careers-advisor/[sessionId]/pdf` — download report as PDF
- `GET /api/careers-advisor/students` — CDO: list org students with session counts
- `GET /api/careers-advisor/students/[userId]` — CDO: get student's sessions

## Components

- `components/careers-advisor/advisor-wizard.tsx` — wizard shell with progress bar, renders active step
- `components/careers-advisor/advisor-step-layout.tsx` — consistent step wrapper (reuse pattern from CV Builder's `cv-step-layout.tsx`)
- `components/careers-advisor/steps/interests-step.tsx` — Q1
- `components/careers-advisor/steps/strengths-step.tsx` — Q2
- `components/careers-advisor/steps/environment-step.tsx` — Q3
- `components/careers-advisor/steps/concerns-step.tsx` — Q4
- `components/careers-advisor/steps/experience-step.tsx` — Q5
- `components/careers-advisor/steps/stage-step.tsx` — Q6
- `components/careers-advisor/steps/optional-intro-step.tsx` — banner offering optional questions or skip to report
- `components/careers-advisor/steps/communication-step.tsx` — Q7 (optional)
- `components/careers-advisor/steps/sensory-step.tsx` — Q8 (optional)
- `components/careers-advisor/steps/values-step.tsx` — Q9 (optional)
- `components/careers-advisor/steps/other-step.tsx` — Q10 (optional)
- `components/careers-advisor/steps/report-step.tsx` — generates and displays the report, PDF download button
- `components/careers-advisor/pill-selector.tsx` — reusable multi-select pill component (shared across question steps)

## Sidebar

Add nav item for career roles (same block as CV Builder), gated by `careersAdvisorEnabled`:

```typescript
if (careersAdvisorEnabled) {
  items.push({ href: '/careers-advisor', label: 'Careers Advisor', icon: Compass })
}
```

## Admin Reports

Add careers advisor stats to both super admin and org admin reports pages (same pattern as CV Builder stats):
- Total sessions, by status (in progress / complete), last 30 days

## How to Guide

Add a "Careers Advisor" section to the guide page for career roles, explaining how to use the questionnaire and what to expect in the report.

## Verification

1. `npm run prisma:push` — schema applies without errors
2. `npm run build` — compiles, all existing tests pass
3. Create a session as STUDENT — complete all 6 core questions
4. Skip optional questions → generate report → verify structured sections
5. Complete optional questions → generate report → verify richer content
6. Download PDF — report renders correctly
7. Login as CAREER_DEV_OFFICER — view student reports from same org
8. Login as CAREGIVER — confirm Careers Advisor nav item does NOT appear
9. Super admin → org settings → uncheck Careers Advisor → verify access removed
10. Re-enable → verify access restored after re-login
