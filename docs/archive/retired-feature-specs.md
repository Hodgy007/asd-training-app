# Retired Feature Specifications

**Purpose.** This document preserves the design, data model, AI prompts and rebuild
instructions for features that have been removed from the platform. Nothing here is
live code. It exists so that if the charity later decides to bring a capability back,
it can be rebuilt to the same specification rather than reinvented from scratch.

Each section ends with a **Rebuild prompt** — a self-contained brief that can be handed
to Claude Code (or any competent developer) to recreate the feature.

## Status at a glance

| Feature | Status | Recover code from |
|---|---|---|
| Child Observations & AI Insights | Removed Apr 2026 (`8968cf0`) | `git show 8968cf0^:<path>` |
| CV Builder | Removed Jul 2026 | `git show 476089d:<path>` |
| AI Careers Advisor | Removed Jul 2026 | `git show 476089d:<path>` |

**Job Openings is NOT retired.** It was considered for removal alongside the other two
but was kept. It lives on under the simplified role model, retargeted from
`STUDENT` / `INTERN` / `EMPLOYEE` to `LEARNER`. Do not treat this document as covering it.

The two Jul 2026 removals were part of the role simplification that collapsed ten
roles into four (`SUPER_ADMIN`, `CHARITY_EMPLOYEE`, `ORG_ADMIN`, `LEARNER`). Both were
built for the `STUDENT` / `INTERN` / `EMPLOYEE` roles, which no longer exist. **Any
rebuild must first decide who the audience is under the current role model** — the
obvious candidate is a learner-facing tool used by professionals on behalf of the young
people they support.

## Cross-cutting rules that applied to all three

These constraints came from the charity and were non-negotiable. They must be carried
into any rebuild:

1. **Never diagnose.** No feature may state, imply or suggest that a person is autistic
   or has any condition. Every AI prompt carried an explicit instruction to this effect.
2. **Strength-focused language.** Describe what someone can do, not what they struggle with.
3. **UK English throughout** — organised, recognised, specialised.
4. **Never mention disabilities, diagnoses or health conditions** in generated output,
   even when the input mentions them.
5. **Workplace adjustments are framed as normal good practice**, not as accommodations
   for a condition.
6. AI failures return the `AI_FEATURE_UNAVAILABLE` sentinel from `lib/ai-runner.ts` and
   every caller must handle it.

---

# 1. CV Builder

## What it was

An eight-step, autism-friendly wizard for building a UK-format CV, at `/cv-builder`.
Users could hold multiple CVs. Careers professionals could view and download the CVs of
students in their organisation (read-only, same-org verified).

Available to `CAREER_DEV_OFFICER`, `STUDENT`, `INTERN`, `EMPLOYEE`, gated additionally
by an org-level `cvBuilderEnabled` flag that defaulted to `true`.

## Why the UX was the way it was

These were deliberate accessibility decisions, not styling preferences. They are the
most valuable thing in this document — the data model is easy to recreate, the
research behind these choices is not.

- **Step-by-step wizard, never one long form.** A single long form was overwhelming.
- **Visible example text, not placeholder text.** Placeholders vanish on focus and
  users lost the guidance exactly when they needed it. Examples sat permanently below
  the field.
- **Auto-save on a 500 ms debounce.** No save button to forget.
- **Skip and return.** `currentStep` persisted so a user could leave mid-way and resume.
- **One AI suggestion, never a list of options.** Choosing between five rewrites was a
  decision burden. One suggestion, accept or reject.
- **Inline editing, never modals.** Modals hide context and trap focus.
- **AI buttons sit *below* the textarea, not above.** Above, users pressed them before
  writing anything and got generic output.
- **Plain-text date inputs** with placeholders like "Sept 2022" — calendar pickers were
  fiddly and imposed a precision users did not have. Dates stored as `"MM/YYYY"` strings.
- **Plain language prompts** throughout — "What did you do in this job?" not
  "Role responsibilities".
- **`prefers-reduced-motion` respected.**
- **Errors use icon + text, never colour alone.**
- **Optimistic updates on sub-items.** Saved entries appeared immediately as cards with
  edit/delete buttons, with a "Saved!" confirmation shown for three seconds.
- **The completion checklist on Review was guidance only.** "Mark as Complete" was never
  gated by it — blocking completion on an incomplete checklist caused users to abandon.

## Wizard steps

1. Personal Details
2. Personal Statement
3. Work Experience
4. Education
5. Skills
6. Interests
7. References
8. Review & Download

Components lived at `components/cv-builder/steps/`. The shell was
`components/cv-builder/cv-wizard.tsx`, which rendered the step components — it did not
contain inline renderers.

## Templates

Three, in `lib/cv-templates/`:

- **Accessible** (default, recommended) — single column, 12 pt, 1.5 line spacing.
- **Modern** — two column with a sidebar.
- **Classic** — traditional centred UK CV, with extra line space between name and contact.

Export as PDF via `@react-pdf/renderer`, or Word `.docx` via the `docx` library.

## Data model

```prisma
enum CVTemplate {
  CLASSIC
  MODERN
  ACCESSIBLE
}

enum CVStatus {
  DRAFT
  COMPLETE
}

model CV {
  id                     String     @id @default(cuid())
  userId                 String
  title                  String     @default("My CV")
  template               CVTemplate @default(ACCESSIBLE)
  status                 CVStatus   @default(DRAFT)
  currentStep            Int        @default(0)
  fullName               String?
  email                  String?
  phone                  String?
  city                   String?
  postcode               String?
  linkedIn               String?
  personalStatement      String?    @db.Text
  interests              String?    @db.Text
  refsAvailableOnRequest Boolean    @default(true)
  createdAt              DateTime   @default(now())
  updatedAt              DateTime   @updatedAt

  user             User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  workExperiences  CVWorkExperience[]
  educationEntries CVEducation[]
  skills           CVSkill[]
  references       CVReference[]

  @@index([userId])
}

model CVWorkExperience {
  id          String   @id @default(cuid())
  cvId        String
  jobTitle    String
  employer    String
  startDate   String
  endDate     String?
  isCurrent   Boolean  @default(false)
  description String?  @db.Text
  order       Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  cv CV @relation(fields: [cvId], references: [id], onDelete: Cascade)

  @@index([cvId])
}

model CVEducation {
  id            String   @id @default(cuid())
  cvId          String
  institution   String
  qualification String
  grade         String?
  startDate     String
  endDate       String?
  description   String?  @db.Text
  order         Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  cv CV @relation(fields: [cvId], references: [id], onDelete: Cascade)

  @@index([cvId])
}

model CVSkill {
  id       String  @id @default(cuid())
  cvId     String
  name     String
  category String?
  order    Int     @default(0)

  cv CV @relation(fields: [cvId], references: [id], onDelete: Cascade)

  @@index([cvId])
}

model CVReference {
  id           String  @id @default(cuid())
  cvId         String
  name         String
  jobTitle     String?
  organisation String?
  email        String?
  phone        String?
  relationship String?
  order        Int     @default(0)

  cv CV @relation(fields: [cvId], references: [id], onDelete: Cascade)

  @@index([cvId])
}
```

### Implementation gotchas

- The Prisma accessor is **`prisma.cV`**, not `prisma.cv`.
- Zod schemas for sub-items must use `.nullable().optional()` for fields that can be
  `null` (e.g. `endDate`, `description`). `z.string().optional()` rejects `null` and
  produced confusing 400s.

## AI prompts

Five prompts, seeded into the `AiPrompt` registry. Endpoint was
`POST /api/cv-builder/[cvId]/ai`, rate-limited to 10 requests per 5 minutes.

### `cv.personalStatement`

- **Name:** CV Builder — Personal Statement
- **Purpose:** Write a UK CV personal statement from the user's experience and education.
- **Category:** `cv`
- **Tone:** Confident and clear; write in the first person. Strength-focused.
- **Input variables:** `name`, `roleContext`, `experience`, `education`
- **Requirements:**
  - Write 3-4 sentences in the first person.
  - Focus on strengths, skills, and what the person can offer.
  - Use simple, clear language that is easy to understand.
  - Use UK English spelling throughout (e.g. organised, recognised, specialised).
  - Never mention disabilities, diagnoses, or health conditions.
  - Do not include any headings, labels, or formatting — return ONLY the personal statement text.
- **Response format:** Return ONLY the personal statement text. No headings, no labels.

### `cv.rephraseBullet`

- **Name:** CV Builder — Rephrase Bullet Point
- **Purpose:** Rephrase a CV work-experience bullet point to use a strong action verb and a concise sentence.
- **Category:** `cv`
- **Tone:** Professional and specific.
- **Input variables:** `originalText`, `jobTitle`, `employer`
- **Requirements:**
  - Start with a strong action verb (e.g. Managed, Delivered, Organised, Supported).
  - Keep it to one concise sentence.
  - Be specific and results-oriented where possible.
  - Use simple, clear language that is easy to understand.
  - Focus on strengths and achievements.
  - Use UK English spelling throughout.
  - Never mention disabilities, diagnoses, or health conditions.
  - Return ONLY the rephrased bullet point, nothing else.
- **Response format:** Return ONLY the rephrased bullet point.

### `cv.suggestSkills`

- **Name:** CV Builder — Suggest Skills
- **Purpose:** Suggest 8-12 skills for a UK CV as a JSON array, grouped into categories.
- **Category:** `cv`
- **Tone:** Practical. Prefer transferable skills over jargon.
- **Input variables:** `experience`, `education`
- **Requirements:**
  - Each skill should belong to one of these categories: Technical, Communication, Teamwork, Personal, Organisation.
  - Use simple, clear language that is easy to understand.
  - Focus on strengths and transferable skills.
  - Never mention disabilities, diagnoses, or health conditions.
- **Response format:** Return ONLY a valid JSON array with no additional text, markdown, or
  formatting. Format: `[{"name":"Skill Name","category":"Category"}]`. Example:
  `[{"name":"Microsoft Office","category":"Technical"},{"name":"Active Listening","category":"Communication"}]`

### `cv.improveDescription`

- **Name:** CV Builder — Improve Work Description
- **Purpose:** Convert a rough description of job duties into 3-5 professional CV bullet points.
- **Category:** `cv`
- **Tone:** Professional, results-oriented.
- **Input variables:** `description`, `jobTitle`, `employer`
- **Requirements:**
  - Each bullet point must start with a strong action verb (e.g. Managed, Delivered, Organised, Supported, Coordinated).
  - Be specific and results-oriented where possible.
  - Use simple, clear language that is easy to understand.
  - Focus on strengths and achievements.
  - Use UK English spelling throughout.
  - Never mention disabilities, diagnoses, or health conditions.
  - Return each bullet point on its own line, starting with "• ".
  - Return ONLY the bullet points, no headings or extra text.
- **Response format:** Return each bullet point on its own line, starting with "• ". No headings or extra text.

### `cv.expandInterests`

This one is worth reading closely. It was tightened after the model kept inventing
"transferable skill" spin that users found alienating and untrue.

- **Name:** CV Builder — Expand Interests
- **Purpose:** Rewrite a short list of interests and hobbies into a brief natural-sounding CV paragraph.
- **Category:** `cv`
- **Tone:** Plain-English, first person. Describe what the person actually enjoys.
- **Input variables:** `rawText`
- **Requirements:**
  - Write in the first person, 1-3 short sentences.
  - Describe the actual activities listed. Keep every activity named (e.g. if they say
    "golf", the result must clearly be about playing golf — not abstract qualities like
    discipline or strategy).
  - Do NOT turn the activities into action-verb bullet points.
  - Do NOT invent transferable-skill spin (no "which demonstrates teamwork", "builds resilience", etc.).
  - A light, plain detail is fine (e.g. "I play golf at weekends") but do not fabricate
    achievements, clubs, or competitions.
  - If the input is vague, keep the output vague rather than inventing specifics.
  - Use simple, clear language.
  - Use UK English spelling throughout.
  - Never mention disabilities, diagnoses, or health conditions.
  - Return ONLY the paragraph text. No headings, no labels, no bullet points.
- **Response format:** Return ONLY the paragraph text. No headings, no labels, no bullet points.

## Rebuild prompt

> Build a CV Builder for a UK training platform (Next.js 14 App Router, TypeScript,
> Prisma + PostgreSQL, Tailwind). It is an eight-step wizard at `/cv-builder` producing
> UK-format CVs. Users can hold multiple CVs.
>
> **Steps:** Personal Details, Personal Statement, Work Experience, Education, Skills,
> Interests, References, Review & Download.
>
> **Accessibility requirements — these are hard requirements, not suggestions.** The
> audience includes autistic young people.
> - Step-by-step wizard, never one long form.
> - Show permanent visible example text below each field. Never rely on placeholder text.
> - Auto-save with a 500 ms debounce. No save button.
> - Persist the current step so users can leave and resume.
> - AI returns exactly one suggestion, never a list to choose between.
> - Edit inline. No modals.
> - Put AI action buttons *below* the textarea they act on, never above.
> - Dates are plain text inputs with a placeholder like "Sept 2022", stored as
>   `"MM/YYYY"` strings. No calendar pickers.
> - Use plain language for every label and prompt.
> - Respect `prefers-reduced-motion`.
> - Signal errors with an icon plus text, never colour alone.
> - Sub-item lists (work experience, education, skills, references) update optimistically:
>   a saved entry appears immediately as a card with edit and delete buttons, plus a
>   "Saved!" confirmation for three seconds. "Add another…" sits below existing entries.
> - The Review step shows a completion checklist as guidance only. Never block
>   "Mark as Complete" on it.
>
> **Data model:** see the Prisma schema in `docs/archive/retired-feature-specs.md` §1.
> Note the Prisma accessor is `prisma.cV`. Zod schemas for sub-items must use
> `.nullable().optional()` for nullable fields — `.optional()` alone rejects `null`.
>
> **Templates:** three, rendered with `@react-pdf/renderer` — Accessible (default:
> single column, 12 pt, 1.5 line spacing), Modern (two column with sidebar), Classic
> (traditional centred UK CV). Also export Word `.docx` via the `docx` library.
>
> **AI:** five prompts — personal statement, rephrase bullet, suggest skills, improve
> description, expand interests. Full specifications in §1 of the archive document; use
> them verbatim. Route through the existing `lib/ai-runner.ts` prompt registry. Endpoint
> `POST /api/cv-builder/[cvId]/ai`, rate-limited 10 per 5 minutes.
>
> **Non-negotiable content rules:** never mention disabilities, diagnoses or health
> conditions in generated output. Strength-focused language. UK English spelling.
>
> Add a read-only view for supervising professionals to list and download the CVs of
> people in their own organisation. Verify same-organisation access server-side.

---

# 2. AI Careers Advisor

## What it was

A guided questionnaire at `/careers-advisor` that generated a personalised careers
report. Twelve steps: six core questions, an optional intro step offering to skip or
continue, four optional questions, then report generation and display.

Available to `CAREER_DEV_OFFICER`, `STUDENT`, `INTERN`, `EMPLOYEE`, gated by an
org-level `careersAdvisorEnabled` flag defaulting to `true`. Careers professionals could
view student reports at `/careers-advisor/students`.

Every question used multi-select pill inputs
(`components/careers-advisor/pill-selector.tsx`) with plain-language prompts. Answers
were stored as a single JSON blob on the session row. Reports were downloadable as PDF
via `@react-pdf/renderer`.

## The questions and their options

Preserved verbatim — the wording was iterated on with the charity and the option sets
are deliberately concrete rather than abstract.

**Core questions (6):**

*What are you interested in?*
Animals · Technology · Art & Design · Music · Science · Sport · Nature · Food & Cooking ·
Numbers & Data · Building & Making · Reading & Writing · Helping People · Gaming ·
History · Cars & Transport

*What are you good at?*
Attention to detail · Problem solving · Creative thinking · Following processes ·
Remembering facts · Organising things · Working with my hands · Using computers ·
Being reliable · Staying focused · Pattern spotting

*What kind of work environment suits you best?*
Quiet workspace · Working from home · Outdoors · Predictable routine · Working alone ·
Small team · Clear instructions · Flexible hours · Minimal interruptions ·
Hands-on / physical work

*Is there anything about work that worries you?*
Job interviews · Meeting new people · Noisy environments · Unexpected changes ·
Travelling to work · Phone calls · Tight deadlines · Not sure what I want to do ·
Nothing specific

*Do you have any experience — work, volunteering, or hobbies?* (free text)

*What stage are you at?*
Still at school · College or sixth form · University · Looking for work ·
In an internship or placement · Currently employed · Not sure

**Optional questions (4), behind a step that offers to skip:**

*How do you prefer to communicate?*
Writing (email/chat) · Face to face (one-on-one) · Face to face (groups) ·
Phone/video calls · Visual aids (diagrams/pictures) · I prefer to listen rather than talk

*Are there any sensory things that affect you at work or school?*
Bright or flickering lights · Loud or sudden noises · Strong smells · Crowded spaces ·
Uncomfortable clothing (e.g. uniforms) · Sitting still for long periods · None of these

*What matters most to you in a job?*
Helping others · Good pay · Learning new things · Making things · Being creative ·
Working with a purpose · Stability and routine · Independence · Being part of a team

*Is there anything else you'd like us to know?* (free text)

## Data model

```prisma
enum AdvisorSessionStatus {
  IN_PROGRESS
  COMPLETE
}

model CareerAdvisorSession {
  id          String               @id @default(cuid())
  userId      String
  status      AdvisorSessionStatus @default(IN_PROGRESS)
  currentStep Int                  @default(0)
  answers     Json?
  report      Json?
  createdAt   DateTime             @default(now())
  updatedAt   DateTime             @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

Prisma accessor: `prisma.careerAdvisorSession`.

## API routes

- `GET` / `POST /api/careers-advisor` — list, create
- `GET` / `PATCH` / `DELETE /api/careers-advisor/[sessionId]` — CRUD
- `POST /api/careers-advisor/[sessionId]/generate` — report generation, rate-limited 10 per 5 min
- `GET /api/careers-advisor/[sessionId]/pdf` — PDF download
- `GET /api/careers-advisor/students` and `/students/[userId]` — supervising professional views

## AI prompt

### `careers.report`

- **Name:** Careers Advisor — Report
- **Purpose:** Generate a personalised careers report JSON for a young person based on questionnaire answers.
- **Category:** `careers`
- **Tone:** Positive, practical, strength-focused. Written in second person ("You have…").
- **Input variables:** `formattedAnswers`
- **Requirements:**
  - Suggest 3 to 5 career areas in the `careers` array.
  - Include 3 to 5 items in the `nextSteps` array.
  - Each career suggestion must be realistic and achievable, not aspirational fantasy.
  - Ground every suggestion in the young person's specific answers — do not give generic advice.
  - Next steps should be concrete actions (e.g. "Search for apprenticeships on gov.uk",
    "Ask your careers professional about work experience in X").
  - Reference UK-specific resources: gov.uk, apprenticeships, Access to Work scheme,
    National Careers Service.
  - NEVER mention autism, disability, diagnosis, or any health condition.
  - Use strength-focused, positive language throughout.
  - Use UK English spelling (e.g. organised, recognised, specialised).
  - Reference workplace adjustments as normal good practice, not as accommodations for a condition.
  - Return ONLY the JSON object. No markdown, no code fences, no explanation.
- **Response format:**

```
You MUST respond with valid JSON matching this exact structure:
{
  "strengths": "A short paragraph (3-5 sentences) summarising the young person's key strengths based on their answers. Written in second person. Be specific to their answers, not generic.",
  "careers": [{"name": "Career Name", "explanation": "2-3 sentences grounded in their specific answers."}],
  "nextSteps": ["A concrete, actionable next step"],
  "workplaceSupport": "A paragraph about workplace support suggestions based on their environment, sensory, and communication preferences. Reference UK-specific support like Access to Work, reasonable adjustments, flexible working arrangements."
}
```

## Rebuild prompt

> Build an AI Careers Advisor for a UK training platform (Next.js 14 App Router,
> TypeScript, Prisma + PostgreSQL, Tailwind). It is a guided questionnaire at
> `/careers-advisor` that produces a personalised careers report.
>
> **Structure — 12 steps:** six core questions, then a step that offers to either finish
> now or answer four more optional questions, then the four optional questions, then
> report generation and display.
>
> **The questions and their exact option sets are in `docs/archive/retired-feature-specs.md`
> §2. Use them verbatim** — the wording was developed with the charity and the concrete
> option sets matter more than they look. Every question is a multi-select pill input
> except the two free-text ones.
>
> **Accessibility:** the audience includes autistic young people. Plain language
> throughout. One question per screen. Show progress. Make the optional section clearly
> skippable without penalty. Respect `prefers-reduced-motion`.
>
> **Data model:** a single session row per attempt storing `status`, `currentStep`,
> `answers` (JSON) and `report` (JSON). Schema in §2 of the archive document. Prisma
> accessor is `prisma.careerAdvisorSession`.
>
> **AI:** one prompt, `careers.report`, returning structured JSON with four sections —
> strengths, careers (3-5 suggestions each with an explanation), nextSteps, and
> workplaceSupport. Full specification in §2; use it verbatim. Route through the existing
> `lib/ai-runner.ts` registry. Endpoint `POST /api/careers-advisor/[sessionId]/generate`,
> rate-limited 10 per 5 minutes.
>
> **Non-negotiable content rules:** never mention autism, disability, diagnosis or any
> health condition in the report. Ground every suggestion in the specific answers given —
> generic careers advice is a failure. Reference UK resources (gov.uk, apprenticeships,
> Access to Work, National Careers Service). Frame workplace adjustments as normal good
> practice. UK English spelling.
>
> Add PDF download via `@react-pdf/renderer`, and a read-only view for supervising
> professionals to see reports for people in their own organisation.

---

# 3. Child Observations & AI Insights

**Removed April 2026 in `8968cf0`.** This one carries the most risk of the four and
should not be rebuilt without a fresh data-protection review — it stored identifiable
information about children, which none of the other features did.

## What it was

Practitioners (`CAREGIVER` role) recorded structured behavioural observations about
individual children over time. An AI layer then produced a three-part insight report —
summary, patterns, recommendations — intended to be taken to a GP, health visitor or
SENCO as a discussion aid.

Routes were `/children`, `/children/[childId]`, `/activity` and `/reports`, plus an
org-admin audit page at `/admin/audit`.

## The safeguards that made it acceptable

If this is rebuilt, these are the parts that matter most. They were not optional.

1. **It never diagnosed, and said so everywhere.** Every AI prompt carried "NEVER provide
   a diagnosis. NEVER suggest a child has autism." The `AiInsight` model carried a
   `disclaimer` column with a default value so the disclaimer could not be lost:

   > This is not a diagnosis. This tool supports observation and pattern recognition
   > only. Always consult a qualified healthcare professional.

   The narrower disclaimer appended to generated text was:

   > These observations are for discussion with your GP, health visitor, or SENCO. This
   > is not a diagnosis.

2. **Children were pseudonymised before any data left the platform.** `lib/pseudonymise.ts`
   replaced the child's name with an opaque code and the date of birth with an age
   bucket. The AI never received a real name or an exact DOB.

3. **Explicit recorded consent.** The `Child` model carried `consentObtainedAt`,
   `consentObtainedBy` and `consentDocumentedNote`. Consent was a data field, not a
   checkbox on a form.

4. **Full access audit trail.** Every read, create, update, delete, insight generation,
   insight read and export was written to `ObservationAccessLog` with actor and IP.
   Org admins could review it at `/admin/audit`.

5. **Retention limits.** Orgs configured `observationLawfulBasis` and
   `observationRetentionDays`, enforced by a cron route under `/api/cron`.

6. **A standing disclaimer banner** (`CaregiverDisclaimer`) rendered across the feature.

## Data model

```prisma
enum Domain {
  SOCIAL_COMMUNICATION
  BEHAVIOUR_AND_PLAY
  SENSORY_RESPONSES
}

enum Frequency {
  RARE
  SOMETIMES
  OFTEN
}

enum Context {
  HOME
  NURSERY
  OUTDOORS
  OTHER
}

enum ObservationAccessAction {
  OBSERVATION_READ
  OBSERVATION_CREATE
  OBSERVATION_UPDATE
  OBSERVATION_DELETE
  AI_INSIGHT_GENERATE
  AI_INSIGHT_READ
  EXPORT
}

model Child {
  id                    String    @id @default(cuid())
  name                  String
  dateOfBirth           DateTime
  consentObtainedAt     DateTime?
  consentObtainedBy     String?
  consentDocumentedNote String?   @db.Text
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  userId                String

  user         User                   @relation(fields: [userId], references: [id], onDelete: Cascade)
  observations Observation[]
  aiInsights   AiInsight[]
  accessLogs   ObservationAccessLog[]
}

model Observation {
  id            String    @id @default(cuid())
  childId       String
  date          DateTime
  behaviourType String
  domain        Domain
  frequency     Frequency
  context       Context
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  child Child @relation(fields: [childId], references: [id], onDelete: Cascade)

  @@index([childId])
  @@index([date])
}

model AiInsight {
  id              String   @id @default(cuid())
  childId         String
  generatedAt     DateTime @default(now())
  summary         String
  patterns        String
  recommendations String
  disclaimer      String   @default("This is not a diagnosis. This tool supports observation and pattern recognition only. Always consult a qualified healthcare professional.")

  child Child @relation(fields: [childId], references: [id], onDelete: Cascade)
}

model ObservationAccessLog {
  id        String                  @id @default(cuid())
  childId   String
  actorId   String
  action    ObservationAccessAction
  metadata  Json?
  ipAddress String?
  createdAt DateTime                @default(now())

  child Child @relation(fields: [childId], references: [id], onDelete: Cascade)

  @@index([childId, createdAt])
  @@index([actorId])
}
```

## Observation formatting for the AI

Observations were flattened to one line each before being passed to the model:

```
- [DD/MM/YYYY] {behaviourType} ({Domain Title Case} | {Frequency} | {Context})
```

## AI prompts

Four prompts. The full report prompt returned labelled plain-text sections which were
then split with regular expressions on `SUMMARY:`, `PATTERNS:` and `RECOMMENDATIONS:`.

### `observations.summary`

- **Name:** Observations — Summary
- **Purpose:** Summarise observational data for a child to help identify patterns for
  discussion with healthcare professionals.
- **Category:** `observations`
- **Tone:** Warm, accessible, non-clinical, practitioner-friendly.
- **Input variables:** `childName` (pseudonymised code), `age` (bucket), `observationText`
- **Requirements:**
  - Provide a brief summary (2-3 sentences) of the observed patterns in practitioner-friendly language.
  - Focus only on what has been observed — do not speculate or diagnose.
  - NEVER provide a diagnosis. NEVER suggest a child has autism.
  - End with: "These observations are for discussion with your GP, health visitor, or SENCO. This is not a diagnosis."
- **Response format:** Plain text, 2-3 sentences, ending with the disclaimer verbatim.

### `observations.patterns`

- **Name:** Observations — Pattern Detection
- **Purpose:** Identify specific behaviour patterns in observational data.
- **Category:** `observations`
- **Tone:** Factual, carer-friendly.
- **Input variables:** `observationText`
- **Requirements:**
  - Identify which domains (Social Communication, Behaviour and Play, Sensory Responses)
    show the most frequent patterns.
  - List 2-4 specific behaviour patterns using carer-friendly language.
  - Format as a brief bulleted list.
  - Do not speculate beyond what the data shows.
  - NEVER provide a diagnosis. NEVER suggest a child has autism.
- **Response format:** Bulleted list of 2-4 observed patterns.

### `observations.actions`

- **Name:** Observations — Action Guidance
- **Purpose:** Suggest practical next steps for a practitioner based on observed behavioural patterns.
- **Category:** `observations`
- **Tone:** Warm, encouraging, non-alarming.
- **Input variables:** `patterns`
- **Requirements:**
  - Provide 3-4 practical, actionable next steps for the practitioner.
  - Include suggestions about who to speak to (GP, health visitor, SENCO, speech therapist etc.).
  - Format as a bulleted list.
  - NEVER provide a diagnosis. NEVER suggest a child has autism.
  - End with: "These observations are for discussion with your GP, health visitor, or SENCO. This is not a diagnosis."
- **Response format:** Bulleted list of 3-4 actions, ending with the disclaimer verbatim.

### `observations.report`

- **Name:** Observations — Full Insight Report
- **Purpose:** Produce a full three-section insight report (summary, patterns,
  recommendations) from observational data.
- **Category:** `observations`
- **Tone:** Warm, accessible, non-clinical.
- **Input variables:** `childName`, `age`, `observationCount`, `observationText`
- **Requirements:**
  - Structure the response with three labelled sections: SUMMARY, PATTERNS, RECOMMENDATIONS.
  - SUMMARY: 2-3 sentences of the overall observation picture.
  - PATTERNS: bullet points of the main behavioural patterns observed across domains.
  - RECOMMENDATIONS: 3-4 practical next steps including who to speak to.
  - NEVER provide a diagnosis. NEVER suggest a child has autism.
  - Always end the RECOMMENDATIONS section with: "These observations are for discussion
    with your GP, health visitor, or SENCO. This is not a diagnosis."
- **Response format:**

```
SUMMARY:
[2-3 sentences]

PATTERNS:
[bullet points]

RECOMMENDATIONS:
[3-4 next steps ending with the disclaimer]
```

## Rebuild prompt

> **Before building this, commission a data-protection impact assessment.** This feature
> stores identifiable information about children and generates AI output about them.
> Nothing below substitutes for that review.
>
> Build a structured child-observation tool for a UK training platform (Next.js 14 App
> Router, TypeScript, Prisma + PostgreSQL). Practitioners record behavioural observations
> about a child over time and generate an insight report to take to a GP, health visitor
> or SENCO.
>
> **Observations** are structured, not free text: a date, a behaviour type, a domain
> (Social Communication / Behaviour and Play / Sensory Responses), a frequency
> (Rare / Sometimes / Often) and a context (Home / Nursery / Outdoors / Other).
>
> **The insight report** has three sections — summary, patterns, recommendations —
> generated by AI from the observation history.
>
> **Mandatory safeguards. Do not ship without every one of these:**
> 1. The tool must never diagnose. Every prompt carries "NEVER provide a diagnosis.
>    NEVER suggest a child has autism." Store the disclaimer as a column with a default
>    value so it cannot be lost, and render a standing disclaimer banner across the feature.
> 2. Pseudonymise before any data reaches the AI provider: replace the child's name with
>    an opaque code and the date of birth with an age bucket. The model never receives a
>    real name or exact DOB.
> 3. Record consent as data — who obtained it, when, and a documented note. Not a checkbox.
> 4. Log every access to an append-only audit table: read, create, update, delete,
>    insight generation, insight read, export — with actor and IP. Give organisation
>    admins a page to review it.
> 5. Enforce a configurable retention period per organisation, with a scheduled job that
>    deletes expired records, and record the lawful basis for processing.
>
> **Data model and the four AI prompt specifications are in
> `docs/archive/retired-feature-specs.md` §3. Use the prompts verbatim** — the disclaimer
> wording and the anti-diagnosis instructions were agreed with the charity.
>
> Format observations for the prompt as one line each:
> `- [DD/MM/YYYY] {behaviourType} ({Domain} | {Frequency} | {Context})`

---

## Recovering the original code

The removals were clean commits, so the full implementation is recoverable:

```bash
# Child observations — list everything the removal touched
git show --stat 8968cf0

# Read any file as it was immediately before removal
git show 8968cf0^:lib/gemini.ts
git show 8968cf0^:app/\(dashboard\)/children/\[childId\]/page.tsx

# CV Builder / Careers Advisor — as they were at the last commit before removal
git show 476089d:components/cv-builder/cv-wizard.tsx
git show 476089d:lib/careers-advisor-ai.ts

# Restore a whole directory
git checkout 476089d -- components/cv-builder/
```

The AI prompt seeds for all three features are in `prisma/seed-ai-prompts.ts` at the
relevant commit — `git show 8968cf0^:prisma/seed-ai-prompts.ts` has the observation
prompts, `git show 476089d:prisma/seed-ai-prompts.ts` has the CV and careers prompts.
