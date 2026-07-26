# AAA Digital Platform — Data Dictionary

**Version 3.0 · 11 May 2026 · Confidential — Ambitious about Autism**

Database schema reference for every Prisma model used by the Next.js 14 application deployed at `asd-training-app-v2.vercel.app`. Database backend: Neon PostgreSQL accessed via Prisma ORM.

This document is regenerated from markdown via `npm run handover:build` — see `docs/handover/README.md` for the build process.

> **Changes since v2.0 (4 May 2026):** Added Cohort (modelled as `Organisation` rows with `orgType = COHORT`), `CohortMembership`, `CohortEventbriteEvent`, `BrandAsset`, `OAuthSsoConfig`, `LibrarySection`, `SamlAuthnRequest`, toolkit models (`ToolkitRegistrant`, `ToolkitDownload`, `ToolkitAnonymousDocumentEvent`). Flagged `pendingApproval` columns as deprecated (still on schema, no longer read/written).

## 1. Database Overview

| Environment | URL type | Notes |
|---|---|---|
| Production | Pooler (port 6543) | `pgbouncer=true` required — use `DATABASE_URL` |
| Production migrations | Direct (port 5432) | Used by Prisma CLI only — use `DIRECT_URL` |
| Development | Neon dev branch pooler | Endpoint `ep-lucky-cherry-a8toqlw5`; pulled via `vercel env pull .env.local` |

**Prisma accessor gotchas:**
1. Model `ClassSession` → accessor `prisma.classSession` — avoids collision with NextAuth `Session` table.
2. `Child` / `Observation` / `AiInsight` / `ObservationAccessLog` were removed in commit `8968cf0` (21 April 2026). Do not reference them.
3. `CV` / `CVWorkExperience` / `CVEducation` / `CVSkill` / `CVReference` / `CareerAdvisorSession` were removed in July 2026 with the CV Builder and Careers Advisor features. Their specifications and AI prompts are preserved in `docs/archive/retired-feature-specs.md` if either is ever rebuilt.
4. `HomePage` is keyed by `id`, not by role. The platform default uses the fixed id `'default'`; a row with an `organisationId` overrides it for that organisation's members.

## 2. Core Models

### User

| Field | Type | Nullable | Description |
|---|---|---|---|
| id | String (UUID) | No | Primary key |
| email | String | No | Unique — used for login |
| name | String | Yes | |
| password | String | Yes | bcrypt hash (cost 12). Null for SSO-only users. |
| role | Role enum | No | `SUPER_ADMIN` / `CHARITY_EMPLOYEE` / `ORG_ADMIN` / `LEARNER` |
| organisationId | String | Yes | FK → Organisation; SET NULL on org delete |
| active | Boolean | No | Default true. Deactivated users cannot sign in. |
| pendingApproval | Boolean | No | **Deprecated** (May 2026). Column retained; not read or written by current code. Always written as false on new rows. |
| mustChangePassword | Boolean | No | Forces `/change-password` redirect via middleware |
| totpSecret | String | Yes | Encrypted TOTP secret for MFA |
| totpEnabled | Boolean | No | True once MFA setup is complete |
| charityPermissions | String[] | No | Scoped permissions for CHARITY_EMPLOYEE role; SUPER_ADMIN has all implicitly |
| notificationsLastOpenedAt | DateTime | Yes | Unread-badge timestamp on the bell icon |
| invitedAt / invitedBy | DateTime / String | Yes | Invite audit metadata |
| createdAt / updatedAt | DateTime | No | Auto-managed |

### Organisation

| Field | Type | Nullable | Description |
|---|---|---|---|
| id | String | No | Primary key |
| name | String | No | |
| slug | String | No | Unique URL identifier |
| organisationType | Enum | Yes | `SCHOOL` / `COLLEGE` / `ACADEMY` / `UNIVERSITY` / `EMPLOYER` (+ legacy `EDUCATION` / `BUSINESS`) |
| orgType | Enum | No | `ORGANISATION` or `COHORT` (cohorts share the same table) |
| allowedProgramIds | String[] | No | IDs of `TrainingProgram` records the org can access |
| allowedRoles | Role[] | No | Roles that can be assigned within this org |
| active | Boolean | No | |
| pendingApproval | Boolean | No | **Deprecated** (May 2026). See User notes. |
| logoUrl | String | Yes | Vercel Blob URL |
| parentOrgId / isParentOrg / inheritSettings | String / Boolean / Boolean | mix | Single-level org hierarchy |
| contactName / contactEmail / contactPhone | String | Yes | Primary contact details |
| addressLine1 / addressLine2 / city / county / postcode / country | String | Yes | UK postal address fields |
| createdAt / updatedAt | DateTime | No | Auto-managed |

### Account (SSO linking)

| Field | Type | Nullable | Description |
|---|---|---|---|
| id | String | No | Primary key |
| userId | String | No | FK → User |
| provider | String | No | `google` / `azure-ad` / `credentials` |
| providerAccountId | String | No | ID from the OAuth provider |
| type | String | No | `oauth` / `credentials` |
| createdAt | DateTime | No | Auto-set |

Unique constraint on `(provider, providerAccountId)`. Account rows are created manually in the NextAuth `signIn` callback — no `PrismaAdapter` is used.

### CohortMembership

Adds learners to an `Organisation` row whose `orgType` is `COHORT`. Lets the platform manage walk-in / event / public cohorts without polluting the registered-orgs list.

| Field | Type | Nullable | Description |
|---|---|---|---|
| id | String | No | Primary key |
| organisationId | String | No | FK → Organisation (where `orgType = COHORT`) |
| userId | String | No | FK → User |
| status | Enum | No | `ACTIVE` / `INACTIVE` |
| joinedAt | DateTime | No | |
| sourceEventId | String | Yes | Optional FK → `CohortEventbriteEvent` if imported from Eventbrite |

Unique constraint on `(organisationId, userId)`.

### CohortEventbriteEvent

Records that a cohort was imported (or refreshed) from an Eventbrite event. Used to dedupe imports and surface a "synced from Eventbrite" badge in the admin UI.

| Field | Type | Description |
|---|---|---|
| id | String | Primary key |
| organisationId | String | FK → Organisation (cohort row) |
| eventbriteEventId | String | Eventbrite event id |
| importedAt | DateTime | When the import ran |
| importedById | String | FK → User (admin who triggered the import) |

### OAuthSsoConfig

Single-row config that gates the Google / Microsoft SSO buttons on the login page. Replaced the `ENABLE_OAUTH_SSO` env switch in May 2026.

| Field | Type | Default | Description |
|---|---|---|---|
| id | String | — | Primary key |
| googleEnabled | Boolean | false | Show Google button & accept Google sign-ins |
| microsoftEnabled | Boolean | false | Show Microsoft button & accept Microsoft sign-ins |
| updatedAt | DateTime | — | Auto-managed |

The `signIn` callback re-checks this row on every OAuth sign-in so direct hits on `/api/auth/signin/google` are rejected when the toggle is off, even though the provider is registered with NextAuth.

## 3. Training Models

### TrainingProgram

| Field | Type | Nullable | Description |
|---|---|---|---|
| id | String | No | Primary key |
| name | String | No | e.g. "ASD Awareness Training" |
| description | Text | Yes | Rich HTML (sanitised) |
| order | Int | No | Display sort order |
| status | Enum | No | `DRAFT` / `UNDER_REVIEW` / `APPROVED` / `ARCHIVED` |
| version | String | No | Default `"1.0"` |
| audience | Enum | No | `ASD_PRACTITIONER` / `CAREERS` |
| active | Boolean | No | |
| createdAt / updatedAt | DateTime | No | Auto-managed |

### Module

| Field | Type | Nullable | Description |
|---|---|---|---|
| id | String | No | Primary key |
| title | String | No | |
| description | Text | Yes | Rich HTML |
| order | Int | No | Sort order within program |
| active | Boolean | No | |
| programId | String | No | FK → TrainingProgram (CASCADE delete) |
| createdAt / updatedAt | DateTime | No | Auto-managed |

### Lesson

| Field | Type | Nullable | Description |
|---|---|---|---|
| id | String | No | Primary key |
| title | String | No | |
| type | Enum | No | `TEXT` / `VIDEO` / `SCORM` |
| order | Int | No | Sort order within module |
| content | Text | Yes | HTML (sanitised via `sanitize-html`). Used for TEXT lessons |
| videoUrl | String | Yes | Embed URL for VIDEO lessons |
| transcript | Text | Yes | Plain-text transcript for TTS fallback |
| interactiveBlocks | Json | Yes | Hotspot, carousel, video-embed blocks — see `lib/interactive-blocks.ts` |
| moduleId | String | No | FK → Module (CASCADE delete) |
| active | Boolean | No | |
| scormBlobPrefix | String | Yes | Vercel Blob path prefix for SCORM assets |
| scormEntryPath | String | Yes | Relative path to the SCORM launch file |
| scormVersion | String | Yes | `"1.2"` / `"2004"` |
| scormToc | Json | Yes | Parsed `<organization><item>` tree for multi-SCO navigation |
| createdAt / updatedAt | DateTime | No | Auto-managed |

### QuizQuestion

| Field | Type | Nullable | Description |
|---|---|---|---|
| id | String | No | Primary key |
| question | Text | No | |
| options | Json | No | Array of answer strings |
| correctAnswer | String | No | Must match one entry in `options` |
| explanation | Text | Yes | Shown after answering |
| lessonId | String | No | FK → Lesson (CASCADE delete) |
| order | Int | No | Sort order |

### TrainingProgress

| Field | Type | Nullable | Description |
|---|---|---|---|
| id | String | No | Primary key |
| userId | String | No | FK → User (CASCADE delete) |
| moduleId | String | No | Module ID string |
| lessonId | String | No | Lesson ID string |
| completed | Boolean | No | |
| score | Float | Yes | 0–100 percentage |
| interactionData | Json | Yes | SCORM CMI snapshot; `navLocation` for resume; interactive-block interactions |
| completedAt | DateTime | Yes | |

Unique constraint on `(userId, moduleId, lessonId)`.

### LessonAttachment

| Field | Type | Description |
|---|---|---|
| id | String | Primary key |
| lessonId | String | FK → Lesson (CASCADE delete) |
| name | String | Display filename |
| url | String | Vercel Blob URL |
| mimeType | String | |
| sizeBytes | Int? | |
| createdAt | DateTime | |

### LessonNote

| Field | Type | Description |
|---|---|---|
| id | String | Primary key |
| userId | String | FK → User |
| lessonId | String | |
| content | Text | Learner personal notes — plain text |
| updatedAt | DateTime | |

Unique constraint on `(userId, lessonId)`.

## 4. Sessions, Announcements, Reset Tokens

### ClassSession

Always use `prisma.classSession` — NOT `prisma.session` (that's the NextAuth `Session` table).

| Field | Type | Nullable | Description |
|---|---|---|---|
| id | String | No | Primary key |
| title | String | No | |
| organisationId | String | No | FK → Organisation (the host org or charity) |
| hostId | String | Yes | FK → User (session host) |
| dateTime | DateTime | No | UTC start time |
| durationMinutes | Int | No | |
| platform | Enum | No | `ZOOM` / `TEAMS` / `CUSTOM` |
| meetingUrl | String | Yes | Pasted or auto-generated join link |
| status | Enum | No | `SCHEDULED` / `IN_PROGRESS` / `COMPLETED` / `CANCELLED` |
| recordingUrl | String | Yes | Added after session completes |
| notes | Text | Yes | |
| isCharitySession | Boolean | No | True for charity-level workshops |
| createdAt / updatedAt | DateTime | No | Auto-managed |

### SessionAttendee

| Field | Type | Description |
|---|---|---|
| id | String | Primary key |
| sessionId | String | FK → ClassSession (CASCADE delete) |
| userId | String | FK → User |
| attended | Boolean | Default false; toggled by host |
| invitedAt | DateTime | Auto-set at record creation |

Unique constraint on `(sessionId, userId)`.

### Announcement

| Field | Type | Description |
|---|---|---|
| id | String | Primary key |
| title | String | |
| body | Text | Rich HTML content |
| organisationId | String? | Null = global announcement visible to all |
| targetRoles | Role[] | Empty = all roles |
| expiresAt | DateTime? | Hidden after this date |
| createdById | String | FK → User |
| createdAt / updatedAt | DateTime | Auto-managed |

### PasswordResetToken

Used for both password reset (1h expiry) and welcome / magic-link self-registration (24h expiry).

| Field | Type | Description |
|---|---|---|
| id | String | Primary key |
| userId | String | FK → User |
| token | String | Unique **SHA-256 hashed** at rest (`lib/reset-token.ts`). Single-use. |
| expiresAt | DateTime | |
| usedAt | DateTime? | Set on redemption; second use rejected |
| createdAt | DateTime | |

## 5. Survey Models

### Survey

| Field | Type | Description |
|---|---|---|
| id | String | Primary key |
| title | String | |
| description | Text? | |
| status | Enum | `DRAFT` / `PUBLISHED` / `CLOSED` |
| createdById | String | FK → User |
| createdAt / updatedAt | DateTime | Auto-managed |

### SurveyQuestion

| Field | Type | Description |
|---|---|---|
| id | String | Primary key |
| surveyId | String | FK → Survey (CASCADE delete) |
| type | Enum | `MULTIPLE_CHOICE` / `YES_NO` / `FREE_TEXT` / `RATING_SCALE` / `MULTI_SELECT` |
| text | Text | Question text |
| options | Json? | Array of option strings; required for `MULTIPLE_CHOICE` and `MULTI_SELECT` |
| order | Int | Sort order |

### SurveyTarget, SurveyResponse, SurveyAnswer, SurveyInsight

- **SurveyTarget** — `{ surveyId, targetType (ORG|ROLE), targetValue }`. Determines which orgs / roles see a survey.
- **SurveyResponse** — one row per respondent per survey. Respondent identity is pseudonymised with a per-survey key (security-audit hardening, May 2026) so a respondent cannot be cross-referenced across surveys.
- **SurveyAnswer** — one row per question in a response.
- **SurveyInsight** — AI-generated analysis. `{ surveyId, type (SUMMARY | COMPARATIVE | RECOMMENDATIONS), content }`.

All cascade on Survey delete.

## 6. Document Library

### LibraryCollection

| Field | Type | Description |
|---|---|---|
| id | String | Primary key |
| title | String | |
| description | Text? | |
| targetOrgIds | String[] | Orgs that can see this collection |
| targetRoles | Role[] | Roles that can see this collection |
| thumbnailUrl | String? | AI-generated thumbnail on Vercel Blob |
| createdById | String | FK → User |
| createdAt / updatedAt | DateTime | Auto-managed |

### LibrarySection

Optional sub-grouping inside a collection. Added April 2026.

| Field | Type | Description |
|---|---|---|
| id | String | Primary key |
| collectionId | String | FK → LibraryCollection (CASCADE delete) |
| title | String | |
| order | Int | Display order |

### LibraryDocument

| Field | Type | Description |
|---|---|---|
| id | String | Primary key |
| collectionId | String | FK → LibraryCollection (CASCADE delete) |
| sectionId | String? | FK → LibrarySection (optional grouping) |
| name | String | Display filename |
| url | String | Vercel Blob URL. **Served via auth-gated proxy `/api/library/documents/[docId]/file` — never linked directly.** |
| mimeType | String | |
| sizeBytes | Int | |
| order | Int | Sort order within section or collection |
| createdAt | DateTime | |

### LibraryDocumentEvent

| Field | Type | Description |
|---|---|---|
| id | String | Primary key |
| documentId | String | FK → LibraryDocument (CASCADE delete) |
| userId | String | FK → User |
| organisationId | String | Denormalised for reporting |
| eventType | Enum | `VIEW` / `DOWNLOAD` |
| createdAt | DateTime | |

## 7. Jobs Models

### JobOpening

| Field | Type | Description |
|---|---|---|
| id | String | Primary key |
| title | String | |
| employerName | String | |
| description | Text | Rich HTML |
| locationType | Enum | `ONSITE` / `HYBRID` / `REMOTE` |
| employmentType | Enum | `INTERNSHIP` / `APPRENTICESHIP` / `PART_TIME` / `FULL_TIME` / `VOLUNTEER` |
| status | Enum | `DRAFT` / `PUBLISHED` / `CLOSED` / `ARCHIVED` |
| closingDate | DateTime? | Auto-closes past this date (`lib/jobs.ts`) |
| autismFriendlyNotes | Text? | |
| skills | String[] | Tag strings |
| targetOrgIds | String[] | Visibility: restrict to these orgs |
| targetRoles | Role[] | Visibility: restrict to these roles |
| logoUrl | String? | Employer logo on Vercel Blob |
| createdById | String | FK → User |
| createdAt / updatedAt | DateTime | Auto-managed |

### JobAttachment

| Field | Type | Description |
|---|---|---|
| id | String | Primary key |
| jobId | String | FK → JobOpening (CASCADE delete) |
| name | String | |
| url | String | Vercel Blob URL — served via auth-gated proxy `/api/jobs/[jobId]/attachments/[attachmentId]/file` |
| mimeType | String | |
| sizeBytes | Int | |
| createdAt | DateTime | |

### JobAssignment

| Field | Type | Description |
|---|---|---|
| id | String | Primary key |
| jobId | String | FK → JobOpening (CASCADE delete) |
| userId | String | FK → User (target learner) |

Unique constraint on `(jobId, userId)`.

## 8. AI & Integration

### AiPrompt

| Field | Type | Description |
|---|---|---|
| id | String | Primary key |
| key | String | Unique string key used by `runPrompt(key, values)` |
| name | String | Human-readable name shown in admin UI |
| purpose / category / tone | Text / String / String | Metadata |
| requirements | String[] | Bullet-point requirements prepended to prompt |
| inputVariables | String[] | Expected `{{variable}}` placeholders |
| responseFormat | Text | Instructions for the model output format |
| model | String | Provider/model string e.g. `google/gemini-2.5-flash` |
| defaultFields | Json? | Fallback seed values for `inputVariables` |
| previousFields | Json? | Undo buffer — last saved values |
| createdAt / updatedAt | DateTime | Auto-managed |

### AiPromptContextFile

| Field | Type | Description |
|---|---|---|
| id | String | Primary key |
| promptId | String | FK → AiPrompt (CASCADE delete) |
| filename | String | |
| url | String | Vercel Blob URL |
| mimeType | String | `application/pdf` / `application/vnd.openxmlformats…` / `text/plain` |
| sizeBytes | Int | |
| parsedText | Text? | Extracted text prepended to the prompt at runtime |
| createdAt | DateTime | |

### IntegrationApiKey

| Field | Type | Description |
|---|---|---|
| id | String | Primary key |
| name | String | Friendly label |
| keyHash | String | SHA-256 hash of the raw key — raw key never stored |
| keyPrefix | String | First chars for display (e.g. `"rw_abc12"`) |
| expiresAt | DateTime? | |
| lastUsedAt | DateTime? | Updated on every successful API call |
| createdById | String | FK → User |
| createdAt / updatedAt | DateTime | Auto-managed |

The raw API key is displayed only once on creation and then discarded. Authentication on `/api/integrations/reports` uses Bearer token; the handler hashes the incoming token and compares against `keyHash`.

### BrandAsset

Charity-owned brand assets (logos, banners, illustrations). Used by the AI banner-generation feature and the library/AI Assist tools as context.

| Field | Type | Description |
|---|---|---|
| id | String | Primary key |
| type | Enum | `BrandAssetType` — `LOGO` / `BANNER` / `ICON` / `ILLUSTRATION` / `OTHER` |
| name | String | Display name |
| url | String | Vercel Blob URL |
| mimeType | String | |
| sizeBytes | Int | |
| description | Text? | |
| aiTags | String[] | Auto-generated tags for AI context lookups |
| createdById | String | FK → User |
| createdAt / updatedAt | DateTime | Auto-managed |

### SSO & Meeting Config

- **OrgSsoConfig** — per-org SAML 2.0. Fields: `emailDomain`, `ssoUrl`, `entityId`, `certificate` (X.509 PEM), `autoProvision`, `defaultRole`. One row per org.
- **CharitySsoConfig** — charity-level SAML. Same fields plus `enforceForCharityUsers` (forces all charity employees through SSO). Managed at `/super-admin/settings/sso`.
- **OAuthSsoConfig** — see §2. Single-row toggle for Google + Microsoft OAuth.
- **SamlAuthnRequest** — short-lived (5 min) record of an outbound SAML AuthnRequest. Used by the callback to verify InResponseTo and prevent SAML replay attacks.
- **OrgMeetingConfig** — per-org Zoom or Microsoft Teams API credentials for auto-generating meeting links on `ClassSession` creation. Fields: `provider` (ZOOM | TEAMS), `clientId`, `clientSecret`, `accountId` (Zoom), `tenantId` (Teams). Managed at `/admin/settings/meetings`.
- **CharityMeetingConfig** — charity-level equivalent. Used for charity-wide workshops (`isCharitySession = true`).

### Public toolkit models (anonymous downloads)

- **ToolkitRegistrant** — captures email + name when a visitor downloads from the public toolkit without an account. Used for follow-up communications.
- **ToolkitDownload** — per-document download event linked to a `ToolkitRegistrant`.
- **ToolkitAnonymousDocumentEvent** — view/download event with no registrant attached (anonymous metric only).

## 9. Key Relationships

| Parent model | Relationship | Child model | Foreign key | On delete |
|---|---|---|---|---|
| Organisation | 1 : many | User | organisationId | SET NULL |
| Organisation | 1 : many | CohortMembership | organisationId | CASCADE |
| Organisation | 1 : many | Organisation (self-ref) | parentOrgId | SET NULL |
| TrainingProgram | 1 : many | Module | programId | CASCADE |
| Module | 1 : many | Lesson | moduleId | CASCADE |
| Lesson | 1 : many | QuizQuestion | lessonId | CASCADE |
| Lesson | 1 : many | LessonAttachment | lessonId | CASCADE |
| User | 1 : many | TrainingProgress | userId | CASCADE |
| User | 1 : many | LessonNote | userId | CASCADE |
| ClassSession | 1 : many | SessionAttendee | sessionId | CASCADE |
| Survey | 1 : many | SurveyQuestion | surveyId | CASCADE |
| Survey | 1 : many | SurveyTarget | surveyId | CASCADE |
| Survey | 1 : many | SurveyResponse | surveyId | CASCADE |
| LibraryCollection | 1 : many | LibrarySection | collectionId | CASCADE |
| LibraryCollection | 1 : many | LibraryDocument | collectionId | CASCADE |
| LibraryDocument | 1 : many | LibraryDocumentEvent | documentId | CASCADE |
| Organisation | 1 : many | JobOpening | organisationId | CASCADE |
| Organisation | 1 : 1 | HomePage | organisationId | CASCADE |
| JobOpening | 1 : many | JobAttachment | jobId | CASCADE |
| JobOpening | 1 : many | JobAssignment | jobId | CASCADE |
| AiPrompt | 1 : many | AiPromptContextFile | promptId | CASCADE |

## 10. Sample Prisma Queries

**1. Get user with their organisation:**

```typescript
const user = await prisma.user.findUnique({
  where: { email },
  include: { organisation: true }
})
```

**2. Get training progress for a user:**

```typescript
const progress = await prisma.trainingProgress.findMany({
  where: { userId },
  orderBy: { completedAt: 'desc' }
})
```

**3. Get sessions for an organisation:**

```typescript
const sessions = await prisma.classSession.findMany({
  where: { organisationId },
  include: { attendees: { include: { user: true } } }
})
```

**4. Get the job openings visible to a learner (both tiers):**

```typescript
// Charity tier: organisationId null, optionally narrowed by targetOrgIds.
// Organisation tier: owned by the learner's org, or by its parent.
const jobs = await prisma.jobOpening.findMany({
  where: {
    status: 'PUBLISHED',
    OR: [
      {
        organisationId: null,
        OR: [{ targetOrgIds: { isEmpty: true } }, { targetOrgIds: { has: organisationId } }]
      },
      { organisationId: { in: [organisationId, parentOrgId].filter(Boolean) } }
    ]
  },
  include: { attachments: true, assignments: { where: { userId } } }
})
```

**5. Resolve cohort members through CohortMembership:**

```typescript
const members = await prisma.user.findMany({
  where: {
    cohortMemberships: {
      some: { organisationId: cohortId, status: 'ACTIVE' }
    },
    active: true
  }
})
```

**6. Upsert training progress (used by `POST /api/training/progress`):**

```typescript
await prisma.trainingProgress.upsert({
  where: { userId_moduleId_lessonId: { userId, moduleId, lessonId } },
  update: { completed: true, completedAt: new Date() },
  create: { userId, moduleId, lessonId, completed: true, completedAt: new Date() }
})
```

## 11. External Integrations

| Service | Used for | Auth method | Env var(s) |
|---|---|---|---|
| Neon PostgreSQL | Primary database | Connection string | `DATABASE_URL`, `DIRECT_URL` |
| Vercel Blob | File storage (docs, images, SCORM, TTS, job attachments, brand assets) | Token | `BLOB_READ_WRITE_TOKEN` |
| Vercel AI Gateway | AI features routing (multi-provider) | API key | `AI_GATEWAY_API_KEY` |
| ElevenLabs | Text-to-speech — Lily voice (`pFZP5JQG7iQjIQuC4Bku`); MP3s cached at `tts/<voiceId>/<sha256>.mp3` | API key | `ELEVENLABS_API_KEY` |
| Resend | Transactional email (welcome links, password reset, invites, digests) | API key | `RESEND_API_KEY` |
| Google OAuth | Optional Google SSO sign-in | Client credentials | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Azure AD | Optional Microsoft SSO sign-in | Client credentials | `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID` |
| Eventbrite | Optional cohort import source | OAuth (org-scoped) | Configured at `/super-admin/settings/eventbrite` |
| Stripe | Payments layer (gated by `ENABLE_PAYMENTS`) | Secret key + webhook | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_SUBSCRIPTION_PRICE_YEARLY` |

**Available provider/model strings** (`lib/ai-models.ts`): `google/gemini-2.5-flash` (default), `google/gemini-2.5-pro`, `anthropic/claude-sonnet-4`, `anthropic/claude-haiku-4`, `openai/gpt-4o-mini`, `openai/gpt-4.1`. Callers use `runPrompt(key, values)` from `lib/ai-runner.ts`. On missing prompt row or upstream error the runner returns the sentinel `AI_FEATURE_UNAVAILABLE` — callers must handle that.
