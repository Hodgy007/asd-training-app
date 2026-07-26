# AAA Digital Platform

A multi-tenant SaaS platform for ASD awareness training, virtual workshops, and careers support for autistic young people. Built for charities, training organisations, schools, and employers.

**Live URL:** https://asd-training-app-v2.vercel.app
**Repository:** https://github.com/Hodgy007/asd-training-app
**Stack:** Next.js 14 (App Router) · TypeScript · Prisma · PostgreSQL (Neon) · NextAuth v4 · Vercel AI Gateway (Gemini / Claude / GPT) · `scorm-again` · Tailwind CSS · Vercel

---

## Table of Contents

- [Platform Overview](#platform-overview)
- [User Roles](#user-roles)
- [Features in Detail](#features-in-detail)
  - [Training Modules](#training-modules)
  - [Virtual Workshops](#virtual-workshops)
  - [Cohorts (Charity-Run Workshops)](#cohorts-charity-run-workshops)
  - [Eventbrite Integration](#eventbrite-integration)
  - [Document Library](#document-library)
  - [Surveys](#surveys)
  - [Announcements](#announcements)
  - [Reports and Analytics](#reports-and-analytics)
  - [Integration API](#integration-api)
- [Authentication and Security](#authentication-and-security)
- [Multi-Tenant Architecture](#multi-tenant-architecture)
- [AI Integration](#ai-integration)
- [Application Structure](#application-structure)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)

---

## Platform Overview

The platform serves two audiences through a single unified application:

1. **Learners** — everyone who takes training, whether they are Ambitious about Autism's own staff or a member of an external organisation (school, college, university or employer). They complete training programmes, attend virtual workshops, browse job openings and access their organisation's document library.

2. **Administrators** (charity admins, charity employees, organisation admins) manage users, organisations, training content, surveys, document libraries, virtual workshops, jobs, and platform-wide analytics.

**What a learner can see is decided by their organisation, not by their role.** Access flows from the training programmes an organisation has been assigned, so two learners in different organisations can see entirely different content. Internal versus external is likewise a property of the organisation: the charity has its own organisation record and its staff are ordinary members of it.

Every feature is designed with accessibility in mind. The platform uses plain language, step-by-step wizards, visible examples, and respects `prefers-reduced-motion`. Colour is never the sole indicator of status — all feedback uses icon + text combinations.

---

## User Roles

The platform has four roles:

| Role | Display Name | Home Page | Description |
|------|-------------|-----------|-------------|
| `SUPER_ADMIN` | Charity Admin | `/super-admin` | Full platform control. Manages all organisations, users, training content, surveys, document library, workshops, reports, integrations, and SSO configuration. Has all permissions implicitly. MFA (TOTP) required. |
| `CHARITY_EMPLOYEE` | Charity Employee | `/super-admin` | Delegated charity-level access. Sees a subset of the charity admin dashboard based on individually assigned permissions (e.g. manage_training, view_reports, manage_sessions). |
| `ORG_ADMIN` | Org Admin | `/admin` | Manages a single organisation. Creates and manages users within their org, handles org-level announcements, views org reports, configures meeting integrations (Zoom/Teams), and sets up enterprise SAML SSO. MFA (TOTP) required. |
| `LEARNER` | Learner | `/dashboard` | Everyone who takes training. Completes the training programmes assigned to their organisation, attends virtual workshops, browses job openings and reads the document library. Replaced the seven separate end-user roles in July 2026. |

### Charity Employee Permissions

Charity Employees receive granular permissions from the ten available:

- `manage_organisations` — create and edit organisations
- `manage_cohorts` — create and manage charity-run cohorts (in-person workshops, walk-ins)
- `manage_training` — create and edit training programs, modules, lessons, and quizzes
- `manage_surveys` — create, publish, and close surveys; view results and AI insights
- `manage_announcements` — create and manage platform-wide announcements
- `view_reports` — access platform-wide analytics and reports
- `manage_sessions` — create and manage charity-level virtual workshops
- `manage_library` — manage document library collections, upload files, view download stats
- `manage_ai_prompts` — edit the DB-backed AI prompt registry and upload context files
- `manage_jobs` — create, edit, publish, and close job openings; manage CDO assignments

---

## Features in Detail

### Training Modules

Training is organised into **Programs**, each containing ordered **Modules** with **Lessons** and **Quizzes**.

**How it works:**
- Charity admins create training programs (e.g. "ASD Awareness Training", "Careers CPD Training") via the Training Content CMS at `/super-admin/training`.
- Programs go through a lifecycle: Draft → Under Review → Approved → Archived.
- Each program contains modules, each module contains lessons (text or video), and each lesson can have multiple-choice quiz questions.
- Organisations are assigned specific programs via their `allowedProgramIds` setting. Users only see programs their organisation has access to.
- The sidebar dynamically renders one navigation link per assigned program using the program's name.
- Progress is tracked per user per lesson. The dashboard shows completion stats and a progress breakdown by module.
- Charity admins can preview training content as a learner by clicking "View" on any program.

**AI-powered content generation:**
- Admins upload reference documents (PDF, DOCX, PPTX) and use the AI Gateway to auto-generate module outlines, lesson content, and quiz questions via the **Generate from Files** option.
- Generated content can be reviewed, edited, retried per-failed-lesson, and regenerated before publishing. The progress banner surfaces the underlying cause of any lesson that fails to generate (model error, rate limit, malformed JSON) so admins can act on it.
- The structure-preserving **Import from Files** path was retired — Generate from Files is the single AI-authoring entry point alongside Blank Program and Import SCORM.

**SCORM packages:**

The platform plays third-party e-learning courses produced by Articulate, iSpring, Adobe Captivate, Storyline, and other authoring tools. Both **SCORM 1.2 and SCORM 2004** are supported (3rd Edition, 4th Edition, and CAM 1.3).

- **Two import paths:** click *Import SCORM* on the Training Content page to scaffold a draft program from a `.zip`, or replace the content of an existing lesson by setting its type to *SCORM package* and uploading the zip.
- **Multi-SCO navigation:** packages with a `<organization>` tree (multiple sections, multiple SCOs per section) render with a **Contents** sidebar driven by the manifest. Learners click between sections; the active item is highlighted.
- **Resume:** a learner's last-viewed section is persisted alongside their CMI snapshot, so re-opening the lesson lands them on the page they were on (not back at the start of the course). Both the SCO's own state (`cmi.suspend_data`, `cmi.core.lesson_status`, etc.) and the LMS-level navigation position are restored.
- **Progress and scoring:** SCORM completion (1.2 `cmi.core.lesson_status`, 2004 `cmi.completion_status` / `cmi.success_status`) and quiz scores feed straight into the standard `TrainingProgress` table — they appear on the Training Completion report exactly like every other lesson type.
- **Per-question quiz analytics:** see the Reports section.
- **Asset hosting:** uploaded zips are extracted to Vercel Blob under `scorm/<lessonId>/`. The `/api/scorm/[lessonId]/[...path]` route serves assets with auth and an iframe-friendly CSP. Two-stage upload (browser → Blob → server-side extract) bypasses Vercel's 4.5 MB serverless body limit; packages up to 200 MB are supported.
- **Runtime:** [`scorm-again`](https://github.com/jcputney/scorm-again) v3 provides the LMS-side API (`Scorm12API` / `Scorm2004API`). The SCO finds it on `window.API` (1.2) or `window.API_1484_11` (2004) via the standard SCORM discovery walk.

### Virtual Workshops

Virtual classroom sessions with video conferencing integration and attendance tracking.

**How it works:**
- Org Admins create sessions at `/admin/sessions` with a title, date/time, duration, platform (Zoom / Teams / Custom URL), and description.
- Attendees can be selected as: all organisation members, specific roles, or individual users.
- Meeting links can be entered manually or **auto-generated** via the Zoom or Microsoft Teams API using per-organisation credentials configured at `/admin/settings/meetings`.
- Sessions follow a status lifecycle: Scheduled → In Progress → Completed (or Cancelled).
- Attendees see upcoming sessions on their dashboard and can view details at `/sessions`.
- After a session completes, the host can mark attendance via checkboxes and optionally add a recording URL.
- Charity-level workshops (`isCharitySession: true`) are managed by Charity Admins at `/super-admin/sessions` and can span multiple organisations.

**Meeting API integration:** Per-org API credentials for Zoom and Teams are stored in `OrgMeetingConfig`. Charity-level credentials are in `CharityMeetingConfig`. The integration handles OAuth token management, meeting creation, and link generation.

### Cohorts (Charity-Run Workshops)

A lightweight way for the charity to run in-person workshops for people who are **not part of any registered organisation** — community members, walk-ins, parents at one-off events, or any group of attendees that the charity wants to onboard directly without creating a full organisation.

**How it works:**
- Charity Admins create cohorts at `/super-admin/cohorts`. Each cohort has a name, description, and a set of assigned training programmes.
- Cohort members can be added one-by-one or via **bulk CSV import** (`name,email` columns). Bulk import auto-generates secure temporary passwords and skips emails that already exist.
- Every new member account is created with `mustChangePassword: true` so members are forced to set their own password on first login.
- Adding a single member opens a **printable QR credential card** (reused from the standard user-creation flow) containing a QR code, the platform URL, the email, and the temporary password. Bulk import returns a downloadable credentials CSV for printing in batch.
- The cohort detail page has four tabs — **Members**, **Training**, **Documents**, and **Workshops** — for managing accounts, assigned programmes, library visibility, and in-person workshops in one place.

**Why this works with existing infrastructure:** A cohort is modelled as a special `OrgType` (`COHORT`) on the existing `Organisation` model. This means cohorts plug into every existing org-targeting system without modification:

| Feature | How cohorts plug in |
|---|---|
| Training programs | `allowedProgramIds` on the cohort org — identical to normal orgs |
| Document library | `targetOrgIds` includes the cohort ID — cohorts appear in the existing org picker |
| Workshops | The session attendee picker targets by `organisationIds[]` — cohorts appear in the picker |
| User accounts | Same user creation flow; users belong to the cohort org via `organisationId` |

**In-person workshops:** The `MeetingPlatform` enum includes an `IN_PERSON` option for charity-run physical events. The "meeting URL" field can be repurposed as a venue address or directions link.

**Filtering:** Cohorts are excluded from the Organisations list and organisation reports via a `where: { orgType: 'ORGANISATION' }` filter, so they do not pollute the registered-organisation views.

**Lifecycle:** Cohorts can be deactivated when finished — this sets the cohort and all member accounts to inactive but preserves the data for reporting.

### Eventbrite Integration

Eventbrite events are first-class cohort sources. When a charity admin links an Eventbrite event to the platform, every booking on that event auto-enrolls the attendee as a member of the matching cohort — no manual roster management.

**Setup (one-time):**
1. Charity admin grabs their Private Token at Eventbrite → Account Settings → Developer Links → API Keys.
2. Visit `/super-admin/settings/eventbrite` → paste the token → Test → Save.
3. Pick the **email-match policy** (default **Auto-invite**, recommended):
   - **Auto-invite** — when someone books with an email that isn't on the platform yet, we auto-create them an account in the Public Toolkit org and email them a magic-link to set a password.
   - **Strict** — only count bookings whose email matches an existing platform user; ignore the rest.
   - **Claim link** — email an unknown booker a "claim your booking" link pointing at `/register`, without pre-creating an account.

**Per-event flow:**
1. Charity admin opens `/super-admin/cohorts` → clicks **"From Eventbrite"** → pastes the public Eventbrite event URL.
2. We fetch the event (via `lib/eventbrite.ts`), create a cohort with the event's name, and cache the metadata in a `CohortEventbriteEvent` row.
3. In production, we auto-register a single account-level webhook so future bookings flow in real-time.
4. The cohort detail page shows an **Eventbrite section** above the existing tabs: status badge, "Show on catalogue" toggle, audience picker, "Sync now" button.
5. Toggle "Show on catalogue" → the workshop appears at `/courses` under "Live workshops" with a date-stamped card linking out to Eventbrite for booking.

**What happens on a booking:**
1. Eventbrite POSTs to `/api/webhooks/eventbrite` (`order.placed`).
2. We fetch the order, look up the linked cohort, and for each attendee email run the configured email-match policy.
3. Attendee becomes a `CohortMembership` row with `source='EVENTBRITE'`, `externalAttendeeId`, `externalOrderId` (so cancel/refund webhooks can later remove them precisely).
4. They show up immediately in the cohort's Members list and can be assigned the cohort's training programs, document collections, and surveys.

**Reliability:**
- **Webhook** is the primary path (sub-5-second latency from booking to membership).
- **Manual "Sync now"** button on the cohort detail page is the recovery path for any individual event we drop.
- **Nightly cron** at `/api/cron/eventbrite-sync` (03:00 UTC, configured in `vercel.json`) walks every linked cohort and refreshes both metadata and attendee mirror as a backstop.

**Security:**
- Eventbrite Private Token is stored in `CharityEventbriteConfig.privateToken` (DB), not an env var. Same trust pattern as `CharityMeetingConfig` (Zoom/Teams credentials).
- Eventbrite doesn't sign webhook payloads — we trust the request only if the incoming `webhook_id` matches the id we registered (acts as shared secret) and the `api_url` lives on `eventbriteapi.com`.
- The token grants read-only access to the charity's Eventbrite events, orders, and attendees. Cannot create events or move money.

**Where things live:**
- `lib/eventbrite.ts` — REST client (events, orders, attendees, webhooks)
- `lib/eventbrite-sync.ts` — DB sync helpers (cohort upsert, attendee → membership, webhook lifecycle)
- `lib/email-templates/workshop-booking.ts` — booking-confirmation email with magic-link
- `app/api/webhooks/eventbrite/route.ts` — webhook receiver
- `app/api/cron/eventbrite-sync/route.ts` — nightly resync
- `components/super-admin/cohort-eventbrite-section.tsx` — cohort detail page section
- `components/courses/workshop-card.tsx` — public catalogue card

### Document Library

A managed file repository for sharing documents with targeted audiences.

**How it works:**
- Charity Admins create **collections** at `/super-admin/library` — each collection has a title, description, and optional AI-generated thumbnail.
- Documents (PDFs, Word files, images, etc.) are uploaded to **Vercel Blob** storage within each collection.
- Collections are targeted to specific organisations and/or roles using `targetOrgIds` and `targetRoles` arrays. Only users matching the targeting criteria can see the collection.
- A single **Document Library** link appears in the sidebar when at least one collection is visible; `/library` renders the grid and auto-selects when there is only one.
- Users browse collections at `/library` and can filter by collection using the `?c=<collectionId>` query parameter.
- Every document view and download is tracked per user and per organisation via `LibraryDocumentEvent`, providing analytics on engagement.
- Org Admins can view and edit collection metadata (title, description) for collections visible to their organisation at `/admin/library`.
- Library download reports with per-org and per-document breakdowns are available at `/super-admin/library/reports` and `/admin/library/reports`.

**AI features:** Collection descriptions and thumbnail prompts are generated via the Vercel AI Gateway from uploaded document text.

### Surveys

Targeted questionnaires with multiple question types and AI-generated insights.

**How it works:**
- Charity Admins create surveys at `/super-admin/surveys` with a title, description, and optional close date.
- Five question types are supported: Multiple Choice, Yes/No, Free Text, Rating Scale (1-5), and Multi-Select.
- Surveys are targeted to specific audiences using `SurveyTarget` records that specify organisation and/or role filters. A survey can target multiple audience segments.
- Surveys follow a lifecycle: Draft → Published → Closed. Published surveys appear as pending items on matching users' dashboards.
- Users respond to surveys at `/surveys/[surveyId]`. Each user can submit one response per survey.
- Results are visualised at `/super-admin/surveys/[surveyId]/results` with response breakdowns per question, completion rates, and response timelines.
- AI insights can be generated per survey via the Vercel AI Gateway, producing three types:
  - **Summary** — high-level overview of findings
  - **Comparative** — comparisons across organisations or roles
  - **Recommendations** — actionable suggestions based on responses
- Survey analytics with CSV export are available in the Reports section.

**AI survey generation:** Admins can have the AI Gateway generate survey questions from a description or uploaded reference documents, which can then be edited before publishing.

### Announcements

Platform-wide or organisation-scoped notifications.

**How it works:**
- Charity Admins create **global announcements** visible to all users across all organisations.
- Org Admins create **organisation-scoped announcements** visible only to users in their organisation.
- Each announcement has a title, body (rich text), and optional expiry date. Expired announcements are automatically hidden.
- Active announcements are displayed prominently on the user's dashboard.

### Reports and Analytics

Both Charity Admins and Org Admins have access to comprehensive analytics dashboards.

**Charity Admin reports** (`/super-admin/reports`) include:
- **Training stats** — total users, completion rates, average quiz scores, progress by module and programme
- **SCORM Quiz Analytics** — per-question correctness rates aggregated across every learner who has attempted a SCORM lesson, sorted worst-first so material that needs revising surfaces immediately. Anonymised — no individual learner data is ever shown. Per-lesson CSV export.
- **Survey analytics** — response rates, completion stats, CSV export of responses
- **Library stats** — download counts per org, per document, engagement trends

**Org Admin reports** (`/admin/reports`) show the same categories but scoped to their organisation only.

**Integration API:** External systems (e.g. Microsoft Dynamics 365 via Power Automate) can pull reporting data from `/api/integrations/reports` using API keys managed at `/super-admin/integrations`. Keys are SHA-256 hashed, shown only once on creation, and support expiry dates.

### Integration API

Secure programmatic access to platform data for external systems — designed for **Microsoft Power BI**, **Dynamics 365 (Custom Connector)**, **Power Automate**, and any other BI / iPaaS tool.

**Authentication:**
- Charity Admins generate API keys at `/super-admin/integrations`. Each key has a name, expiry date, and is shown in full only once on creation.
- Keys are stored as SHA-256 hashes (`keyHash`) with a visible prefix (`keyPrefix`) for identification.
- External systems authenticate via `Authorization: Bearer <api-key>` headers.
- Per-key rate limit: 60 req/min. Last-used timestamps tracked per key.

**Endpoints:**
- `GET /api/integrations/reports` — exports the data
- `GET /api/integrations/reports/schema` — public OpenAPI 3.0 spec (no auth) — drop the URL into a Power BI / Dynamics Custom Connector "Import from URL" flow

**Sections** (`?section=`): `training`, `library`, `surveys`, `cv`, `careers`, or `all` (default).

**Response shape** — every response carries `apiVersion: 'v1'` and `generatedAt: '<ISO>'`. Two formats:

- **`?format=nested`** (default) — original v1 shape; preserved for back-compat
- **`?format=flat`** — BI-friendly long format; one row per measurement with a stable `rowId` primary key, ideal for Power BI tables and Dynamics Custom Connector mapping

Example flat survey row (one row per response × question):
```json
{
  "rowId": "<responseId>:<questionId>",
  "surveyId": "...", "surveyTitle": "...", "surveyStatus": "PUBLISHED",
  "respondentId": "9c4e0b71d3a18d2f",   // pseudonymised, stable per (user, survey)
  "role": "LEARNER", "organisation": "Example School",
  "completedAt": "2026-05-15T14:32:00.000Z",
  "questionId": "...", "question": "How was the workshop?", "questionType": "FREE_TEXT",
  "answer": "It was very useful"
}
```

**Incremental refresh** (`?since=<ISO datetime>`):
- Applies to event-shaped sections (`library`, `surveys`) — only records updated/completed after the watermark are returned
- Training stats are full-population aggregates and ignore `since`; the response carries `incrementalSupported: false` so consumers can branch on it
- Power BI Incremental Refresh maps directly onto this pattern via its `RangeStart` / `RangeEnd` parameters

**Pagination** (surveys only, the largest payload):
- `?limit=<n>` (default 1000, max 5000)
- `?cursor=<opaque>` — echo back the `nextCursor` from the previous response
- Other sections return all rows in one response (sizes are bounded)

**Conditional GET** — every successful response carries a weak `ETag` derived from the dataset's max watermark + row counts. Pass `If-None-Match: <etag>` on subsequent polls; the server returns 304 with no body when nothing has changed.

**PII pseudonymisation** — respondent / user ids are never exposed in plaintext:
- Survey responses: stable per `(user, survey)` — joinable across questions in the same survey but not across surveys
- Different namespaces never produce the same pseudonym for the same user, so a leaked library report cannot be cross-referenced against a leaked survey report

**Data caveats** (documented in the OpenAPI schema):
- Training `totalUsers` excludes `SUPER_ADMIN` and `ORG_ADMIN` roles
- Training section filters cohort orgs out (matches the in-app super-admin reports)
- The `cv` and `careers` sections were removed in July 2026 along with those features; `?section=cv` and `?section=careers` now return 400

**Full end-user guide for Excel, Power BI, and Dynamics 365:** see [docs/guides/integration-reports-guide.md](docs/guides/integration-reports-guide.md) — step-by-step recipes for Power Query, Power BI Desktop / Service, Power BI incremental refresh, Dynamics Custom Connector, Power Automate flows, and a full data-reference table per section.

---

## Authentication and Security

### Login Methods

1. **Email and Password** — credentials-based login with bcrypt password hashing (cost factor 12). Forgot-password flow sends a reset link via Resend email.

2. **Magic-link self-registration** — `/register` `existing-org` and `no-org` paths don't ask for a password during sign-up. The platform creates the user, generates a 24h `PasswordResetToken`, and emails a welcome link via Resend. The recipient clicks the link, lands on `/welcome`, picks a password, and is signed in immediately. The `new-org` path keeps inline password entry because the new ORG_ADMIN needs immediate access.

3. **Google OAuth** — toggled per-environment by a charity admin in `/super-admin/settings/sso` (DB-backed `OAuthSsoConfig.googleEnabled`, defaults off). The provider registers with NextAuth whenever `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` are set; the `signIn` callback rejects the actual login if the DB toggle is off, so direct hits on `/api/auth/signin/google` also fail. Unknown OAuth users are NOT rejected — they're routed through `/register/sso-complete` to self-register under the Public Toolkit org.

4. **Microsoft Azure AD OAuth** — same toggle pattern as Google (`OAuthSsoConfig.microsoftEnabled`). Requires `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, and `AZURE_AD_TENANT_ID` (use `common` for personal + work/school accounts; the Azure app manifest needs `signInAudience: AzureADandPersonalMicrosoftAccount`).

5. **SAML SSO** — per-organisation SAML configuration for enterprise identity providers. **Not affected by the OAuth toggles.** Org Admins configure SAML at `/admin/settings/sso` with entity ID, SSO URL, and certificate. Charity-level SAML is configured at `/super-admin/settings/sso` with an option to enforce SSO for all charity users. Unlike OAuth, SAML users still need to be pre-created (or per-org `autoProvision` enabled) — there's no `/register/sso-complete` equivalent for SAML.

### Multi-Factor Authentication (MFA)

- TOTP-based (Time-based One-Time Password) using the `otpauth` library.
- **Mandatory for admin roles** — SUPER_ADMIN, CHARITY_EMPLOYEE and ORG_ADMIN users are redirected to `/mfa-setup` until they configure TOTP. They cannot access any other page until MFA is set up. Set `DISABLE_MFA=true` to bypass this in a recovery situation; existing TOTP secrets are unaffected.
- After password login, MFA-enabled users are redirected to `/mfa-verify` to enter their 6-digit code before gaining full session access.
- QR code display for authenticator app setup (Google Authenticator, Authy, etc.).

### Session Management

- JWT-based sessions (not database sessions) with 8-hour expiry.
- The JWT token carries: user ID, role, organisation ID, effective training programs, charity permissions, MFA status, and password change requirements.
- Middleware enforces authentication, MFA verification, password change requirements, and role-based route access on every request.

### Security Features

**Authentication and account hygiene**
- Rate limiting on every auth endpoint — login (10/15 min), forgot-password (5/15 min), reset-password (5/15 min), MFA verify (5/5 min), change-password (5/15 min). The limiter is Upstash-backed in production and falls back to in-memory for local dev (single shared `createRateLimiter` factory; `/api/tts` is also per-user rate-limited to stop abuse of paid TTS minutes).
- AI endpoints carry a **24h daily ceiling** per user on top of their short-window burst limit so a stuck client can't drain the AI Gateway budget — super-admin training generate 20/day, library doc generate 50/day, library collection generate 30/day. Daily-cap 429s include `code: 'DAILY_LIMIT'` so clients can show a "come back tomorrow" message rather than the generic backoff toast.
- bcrypt cost factor of 12 across all password hashing call-sites (login, registration, account provisioning, cohort import).
- Forced password change on first login (`mustChangePassword: true`) and on admin-initiated resets.
- Cohort self-join, CDO temp-password creation, and forgot-password flows all run through `validatePassword` complexity rules.
- Deactivated users and organisations are blocked at sign-in.
- Forgot-password token swap runs in a single Prisma `$transaction` so a crash mid-flow can't leave a half-consumed token.
- Reset-password tokens are stripped from the URL bar via `history.replaceState` after the page loads (no token leakage to browser history, analytics, or referrer headers).

**Storage and serialisation**
- Reset, invite, and introspection tokens are stored as **SHA-256 hashes** at rest — the raw token only ever appears in the link sent to the user.
- All temporary passwords (cohort import, CDO-issued credentials) generated with `crypto.randomBytes` (CSPRNG), not `Math.random`.
- `/api/admin/users` GET no longer returns the bcrypt hash field; the column is excluded from the select.
- Library, training, and job blob downloads are proxied through `/api/.../download/*` routes that re-check entitlement on every request — no raw `*.public.blob.vercel-storage.com` URLs are exposed.
- Survey responses are pseudonymised and per-survey-key rate-limited so a respondent can't be identified across surveys.

**Multi-tenancy and entitlement**
- SCORM CMI POSTs and SCORM asset GETs both check the user's `effectivePrograms` against the lesson's `programId` — no logged-in user can fabricate completions or read SCORM assets for programs their org isn't entitled to.
- `/api/admin/users`, `/api/admin/announcements`, `/api/admin/library`, `/api/admin/sessions`, `/api/admin/reports`, and `/admin/schools` all verify parent/child org relationships before mutating or reading sub-org data.
- Middleware path matchers use exact or path-segment prefix matching to prevent path-prefix bypass; `/api/cron` is the only public POST.
- Job openings are two-tier: `organisationId` is set from the session and is absent from the request schema, so a client cannot publish into another organisation or onto the charity-wide tier. Ownership on the org-admin job routes is checked against the job's own `organisationId`, so a charity-tier job is never editable from them.

**File and content safety**
- Upload validation enforces an allow-list of MIME types and extensions, with size caps. **SVG uploads are blocked** at the platform layer because SVG can carry inline `<script>`/`foreignObject` payloads — admin SVG editing must go through `sanitize-html` first.
- `application/octet-stream` uploads are only accepted for genuinely binary formats (PDF, Office docs, PNG/JPG/GIF, MP4/WebM) — text formats must come with the right `text/*` MIME so a malicious `.csv` claiming octet-stream can't slip past the cross-check.
- SCORM zip extraction caps total entry count and decompressed size, parses ZIP64 EOCD properly, and rejects manifests containing Windows separators, NFD-encoded traversal, or percent-encoded `..` segments.
- All user-controlled fields in transactional emails are HTML-escaped before being interpolated into the templates.

**SAML and SSO hardening**
- SAML responses are validated against the org's configured Issuer and signing certificate; the metadata-fetch path has an SSRF guard (private-IP and non-HTTPS rejected).
- SSO `defaultRole` is validated against `LEAF_ROLES` so an admin role can't be granted via SSO auto-provisioning.
- Schools sub-route forces password complexity on bulk-created child-org users and constrains the role enum.

**AI and integrations**
- AI prompt-test endpoint routes through the gateway and sanitises any error string before returning it (no provider stack traces leak to the admin UI).
- Generated content errors carry diagnostic context (parser reason + 200-char model-output snippet) so failed lessons are immediately actionable.

**Other**
- Forced password change on first login (when `mustChangePassword: true`)
- Input sanitisation via `sanitize-html` on all rich-text fields (lesson content, announcements, library descriptions)
- Content Security Policy (CSP) headers
- Cookie consent banner

### Security audit baseline

A formal audit identified five critical, five high, ten medium, and five low findings — all 25 are tracked in `git log` under `fix(security):`. As of `10232dc`, twenty-four are merged; one (SAML admin TOTP enforcement, audit M-24/M-25) is staged but unapplied pending operator confirmation that all SAML-using admins have TOTP enrolled. The deferred items called out in the audit report (SCORM iframe sandbox, JWT feature-flag staleness, Resend test sender, strict-CSP nonce flow) are documented trade-offs, not bugs.

---

## Multi-Tenant Architecture

The platform supports multiple organisations, each operating as an isolated tenant with optional hierarchical relationships.

**Organisation settings** (managed by Charity Admins at `/super-admin/organisations`):
- **Allowed training programs** — which programs the org's users can access
- **Allowed roles** — which user roles can be assigned within the org (in practice `LEARNER`, plus `ORG_ADMIN` for whoever runs it)
- **Contact details** — name, email, phone
- **Address** — full UK address fields (line 1, line 2, city, county, postcode, country)
- **Meeting config** — Zoom/Teams API credentials for auto-generating meeting links
- **SSO config** — SAML settings with email domain, auto-provisioning, and default role
- **Parent organisation flag** — marks an org as a parent that can manage child organisations

**Hierarchical Organisation Structure (Parent/Child Orgs):**

MATs (Multi-Academy Trusts), CEC Careers Hubs, and Local Authorities can manage multiple schools or sub-organisations under a single parent org.

- **Schema:** Self-referencing relation on `Organisation` — `parentOrgId`, `isParentOrg`, `inheritSettings`, `childOrgs[]`
- **Settings inheritance:** Child orgs with `inheritSettings: true` automatically inherit their parent's `allowedProgramIds` and `allowedRoles`. Single-level inheritance only (no recursive chain). A parent org's job openings are also visible to its child orgs' learners. When `inheritSettings` is disabled, the child org uses its own independent settings.
- **Parent org admin features:** When an Org Admin's organisation is marked as a parent (`isParentOrg: true`), their sidebar shows a "Schools" link. From `/admin/schools` they can:
  - Create and manage child organisations (name, slug, type, contact details, active status)
  - Toggle settings inheritance per child
  - Manage users within each child school
  - Drill down into reports, sessions, and announcements for specific child orgs via an org selector dropdown
- **Admin API drill-down:** All org admin API routes (`/api/admin/users`, `/api/admin/reports`, `/api/admin/sessions`, `/api/admin/announcements`) accept an optional `?orgId=` parameter. When a parent org admin provides a child org ID, the API verifies the parent-child relationship before returning scoped data. Reports default to aggregating across all child orgs when no filter is specified.
- **Super admin support:** The super admin organisations page shows "Parent" badges on parent orgs, child org counts, and a hierarchy section on each org's detail page listing its children or parent.
- **Helper functions** in `lib/org-hierarchy.ts`: `getEffectiveOrgSettings()`, `canManageChildOrg()`, `getChildOrgIds()`, `getAllOrgIds()`
- **Session token:** `isParentOrg` is surfaced through the JWT to `session.user.isParentOrg` for all login flows (credentials, SSO, SAML)
- **Non-parent orgs are unaffected** — flat organisations without a parent see no hierarchy features

**Data isolation:**
- Users belong to one organisation via `organisationId`
- Org Admins can only see and manage users within their organisation (or child organisations if they are a parent org admin)
- Training programs, library collections, surveys, and announcements can be targeted to specific organisations
- Reports are scoped to the admin's organisation (Org Admin) or platform-wide (Charity Admin)
- CDO (Careers Professional) student views are restricted to same-organisation users

---

## AI Integration

All AI features route through the **Vercel AI Gateway** using the AI SDK v6. Prompts live in the `AiPrompt` database table (managed at `/super-admin/ai-prompts`); models are addressed by provider/model strings (e.g. `google/gemini-2.5-flash`, `anthropic/claude-sonnet-4`, `openai/gpt-4o-mini`) and can be switched per-prompt without redeploying. The runtime entry point is `lib/ai-runner.ts:runPrompt(key, values)` which loads the prompt row, prepends any uploaded context files, and calls `generateText` against the configured model. All prompts are strength-focused, use UK English, and explicitly instruct the model never to diagnose or reference autism.

### Other AI features
- **Survey insights** (`lib/survey-ai.ts`): Summary, comparative, and recommendation insights generated from survey responses, surfaced at `/super-admin/surveys/[surveyId]/results`.
- **Quiz generation** for training modules from existing lesson content.
- **Library collection thumbnails and descriptions** generated from uploaded documents.
- **Content generation from files** (`lib/content-generator.ts`): Convert PDF/DOCX/PPTX into module/lesson/quiz scaffolds for super admins to review and edit.

---

## Application Structure

```
app/
  (auth)/                           # Public pages: login, register, password reset
  (dashboard)/                      # Leaf role pages (wrapped by sidebar layout)
    dashboard/                      #   Role-aware home page
    training/[programId]/           #   Training modules and lessons (incl. SCORM)
    careers/                        #   Careers training modules
    jobs/                           #   Job openings (learners + CDOs)
    sessions/                       #   Virtual workshops (user view)
    library/                        #   Document library
    settings/                       #   User account settings
    guide/                          #   How-to guide
  (super-admin)/                    # Charity admin pages
    super-admin/
      users/                        #   User management
      organisations/                #   Organisation management
      training/                     #   Training content CMS
      library/                      #   Document library management
      surveys/                      #   Survey builder and results
      announcements/                #   Global announcements
      sessions/                     #   Charity-level workshops
      reports/                      #   Platform-wide analytics
      integrations/                 #   API key management
      settings/                     #   Charity SSO and meeting config
  (org-admin)/                      # Organisation admin pages
    admin/
      users/                        #   Org user management
      schools/                      #   Child org management (parent orgs only)
      schools/[orgId]/              #   Child org detail and user management
      announcements/                #   Org announcements
      library/                      #   Org document library
      sessions/                     #   Org workshops
      reports/                      #   Org analytics
      settings/meetings/            #   Zoom/Teams API config
      settings/sso/                 #   SAML SSO config
  (mfa)/                            # MFA setup and verification
  (change-password)/                # Forced password change
  api/                              # All API routes
    auth/                           #   Authentication (NextAuth, MFA, SAML, SSO)
    training/                       #   Training progress (incl. /progress/scorm)
    scorm/[lessonId]/[...path]/     #   Auth-gated SCORM asset serving from Blob
    jobs/                           #   Learner-facing job listings + assignments
    sessions/                       #   Virtual workshops
    library/                        #   Document library
    surveys/                        #   Survey responses
    announcements/                  #   Active announcements
    admin/                          #   Org admin endpoints
    super-admin/                    #   Charity admin endpoints incl. SCORM import
    integrations/                   #   External API access
    account/                        #   User account info

components/
  layout/                           # Sidebars (leaf, super-admin, org-admin) and topbar
  dashboard/                        # Dashboard widgets (announcements, sessions, surveys)
  ui/                               # Shared UI primitives and disclaimers
  training/                         # Module cards, quiz component, video player
  lessons/                          # Lesson-time players incl. SCORM player + TOC sidebar
  super-admin/                      # Content generation, survey builder, file upload, SCORM import
  admin/                            # Per-lesson SCORM upload, org-admin pieces
  ai/                               # AI insight panels and buttons
  providers/                        # NextAuth session and theme providers

lib/
  auth.ts                           # NextAuth config, JWT callbacks, feature flag fetching
  rbac.ts                           # Role checks, permissions, display labels
  prisma.ts                         # Prisma client singleton
  ai-runner.ts                      # DB-backed AI prompt runner (via Vercel AI Gateway)
  ai-models.ts                      # Provider/model id constants
  cv-templates/                     # CV PDF templates (accessible, modern, classic)
  scorm/                            # SCORM manifest parsing, package extraction, progress
                                    #   mapping, and quiz analytics
  org-hierarchy.ts                  # Parent/child org helpers (inheritance, authorization)
  modules.ts                        # Training program resolution
  training-db.ts                    # Training data access layer
  meetings.ts                       # Zoom/Teams API integration
  saml.ts                           # SAML SSO protocol
  sessions.ts                       # Workshop session helpers
  rate-limit.ts                     # Auth rate limiting
  constants.ts                      # Behaviour domain constants
  password-validation.ts            # Password strength rules
  sanitize.ts                       # Input sanitisation
  upload-validation.ts              # File upload validation

prisma/
  schema.prisma                     # Database schema (35+ models, 16 enums)
  seed.ts                           # Demo user seeding
  seed-training-content.ts          # Training content seeding

types/
  index.ts                          # TypeScript interfaces (Session, JWT, roles, etc.)
```

---

## Environment Variables

Copy `.env.example` to `.env.local` for local development. For production (Vercel), configure the following:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL **pooler** URL — port **6543** with `?pgbouncer=true` |
| `DIRECT_URL` | Yes | Neon PostgreSQL **direct** URL — port **5432** (used only by Prisma for migrations) |
| `NEXTAUTH_SECRET` | Yes | JWT signing secret (32+ random characters) |
| `NEXTAUTH_URL` | Yes | Deployed URL (`https://asd-training-app-v2.vercel.app`) — no trailing slash |
| `GEMINI_API_KEY` | Legacy | Direct Google Gemini API key. Kept for backwards compatibility — `AI_GATEWAY_API_KEY` is the canonical path now. |
| `RESEND_API_KEY` | Yes | Resend API key for forgot-password and welcome (magic-link self-registration) emails |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID. Provider registers with NextAuth when set; whether the login button shows / logins are accepted is controlled by the DB toggle at `/super-admin/settings/sso`. |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret. Pairs with `GOOGLE_CLIENT_ID`. |
| `AZURE_AD_CLIENT_ID` | No | Azure AD app client ID. Same DB-toggle behaviour as Google. |
| `AZURE_AD_CLIENT_SECRET` | No | Azure AD client secret. |
| `AZURE_AD_TENANT_ID` | No | `common` for all account types, or a specific tenant ID. |
| `BLOB_READ_WRITE_TOKEN` | Yes | Vercel Blob storage token for document uploads, AI thumbnails, and SCORM packages |
| `AI_GATEWAY_API_KEY` | Yes | Vercel AI Gateway key. AI features route through the gateway using provider/model strings (e.g. `google/gemini-2.5-flash`, `anthropic/claude-sonnet-4`). Replaces direct provider keys at runtime. |
| `ELEVENLABS_API_KEY` | No | ElevenLabs API key for the lesson read-aloud player (Lily voice). Synthesised MP3s are cached on Blob under `tts/<voiceId>/<sha256>.mp3`. |
| `CRON_SECRET` | No | Optional bearer token for `/api/cron/*` routes. When set, cron endpoints accept either `Authorization: Bearer <CRON_SECRET>` or Vercel's auto-injected `x-vercel-cron: 1` header. When unset, only Vercel cron invocations are accepted. **Note:** the Eventbrite Private Token is **not** an env var — it's stored in the database via `/super-admin/settings/eventbrite`. |

**Important:** `DATABASE_URL` must use the Neon connection pooler (port 6543) in production. Using the direct connection (port 5432) exhausts connection limits under serverless execution. `DIRECT_URL` is only used by Prisma CLI commands for schema changes.

---

## Local Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push schema to local/dev database
npx prisma db push

# Seed a demo user
npm run prisma:seed

# Seed training content
npx tsx prisma/seed-training-content.ts

# Start dev server
npm run dev
```

The app runs at `http://localhost:3000`.

**Other useful commands:**

| Command | Description |
|---------|-------------|
| `npm run build` | Full production build (`prisma generate && vitest run && next build`) |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run end-to-end tests (Playwright) |
| `npm run prisma:studio` | Open Prisma Studio (visual database browser) |
| `npx vercel --prod --yes` | Deploy to Vercel production |
