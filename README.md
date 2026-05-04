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
  - [CV Builder](#cv-builder)
  - [AI Careers Advisor](#ai-careers-advisor)
  - [Virtual Workshops](#virtual-workshops)
  - [Cohorts (Charity-Run Workshops)](#cohorts-charity-run-workshops)
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

The platform serves three distinct audiences through a single unified application:

1. **Practitioners** (caregivers, nursery workers, health visitors) use the platform to complete ASD awareness training, attend virtual workshops, and access shared documents from their organisation's library.

2. **Career-focused users** (careers professionals, students, interns, employees) use the platform to complete careers CPD training, build autism-friendly CVs with AI writing assistance, browse job openings, and receive personalised career guidance through the AI Careers Advisor.

3. **Administrators** (charity admins, charity employees, organisation admins) manage users, organisations, training content, surveys, document libraries, virtual workshops, jobs, and platform-wide analytics.

Every feature is designed with accessibility in mind. The platform uses plain language, step-by-step wizards, visible examples, and respects `prefers-reduced-motion`. Colour is never the sole indicator of status — all feedback uses icon + text combinations.

---

## User Roles

The platform has eight roles, each with specific access:

| Role | Display Name | Home Page | Description |
|------|-------------|-----------|-------------|
| `SUPER_ADMIN` | Charity Admin | `/super-admin` | Full platform control. Manages all organisations, users, training content, surveys, document library, workshops, reports, integrations, and SSO configuration. Has all permissions implicitly. MFA (TOTP) required. |
| `CHARITY_EMPLOYEE` | Charity Employee | `/super-admin` | Delegated charity-level access. Sees a subset of the charity admin dashboard based on individually assigned permissions (e.g. manage_training, view_reports, manage_sessions). |
| `ORG_ADMIN` | Org Admin | `/admin` | Manages a single organisation. Creates and manages users within their org, handles org-level announcements, views org reports, configures meeting integrations (Zoom/Teams), and sets up enterprise SAML SSO. MFA (TOTP) required. |
| `CAREGIVER` | Practitioner | `/dashboard` | Completes ASD awareness training modules and quizzes. Attends virtual workshops, accesses shared document collections, and can create workshop sessions for their organisation. |
| `CAREER_DEV_OFFICER` | Careers Professional | `/dashboard` | Completes careers CPD training. Uses CV Builder and AI Careers Advisor. Can view student CVs and career advisor reports for users in the same organisation. Can create workshop sessions. |
| `STUDENT` | Student | `/dashboard` | Completes assigned training. Uses CV Builder and AI Careers Advisor for personal career development. |
| `INTERN` | Intern | `/dashboard` | Same access as Student. Completes training, builds CVs, and uses the AI Careers Advisor. |
| `EMPLOYEE` | Employee | `/dashboard` | Same access as Student. Completes training, builds CVs, and uses the AI Careers Advisor. |

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

### CV Builder

An 8-step autism-friendly wizard for building UK-format CVs, accessible to Careers Professionals, Students, Interns, and Employees.

**How it works:**
1. **Personal Details** — name, email, phone, city, postcode, LinkedIn URL
2. **Personal Statement** — opening statement with AI generation assistance
3. **Work Experience** — job entries with title, employer, dates, and description (AI can rephrase bullet points)
4. **Education** — school/university entries with qualification, grade, and dates
5. **Skills** — skills list with AI suggestions based on experience
6. **Interests** — hobbies and interests section
7. **References** — referee details (name, title, organisation, contact)
8. **Review and Download** — final review with completion checklist, template selection, and export

**Key design decisions:**
- Step-by-step wizard rather than a single long form — reduces cognitive load
- Visible example text rather than placeholders — shows what good input looks like
- Auto-save with 500ms debounce — no "Save" button needed, progress is never lost
- Skip and return — users can navigate freely between steps; `currentStep` is persisted
- Plain text date inputs with format hints ("Sept 2022") instead of calendar date pickers
- Single AI suggestions rather than multiple options — avoids decision paralysis
- Inline editing rather than modal dialogs
- AI buttons positioned below textareas, not above

**Three CV templates:**
- **Accessible** (recommended default) — single-column, 12pt font, 1.5 line spacing
- **Modern** — two-column layout with a sidebar
- **Classic** — traditional centred UK CV format

**Export formats:** PDF (via `@react-pdf/renderer`) and Word `.docx` (via the `docx` library).

**Careers Professional view:** Careers Professionals can view and download CVs for students within their organisation at `/cv-builder/students`. This is read-only access, verified to be same-organisation.

**Feature gating:** CV Builder can be enabled or disabled per organisation by a Charity Admin via the organisation settings page. The flag is surfaced in the user's JWT token and checked in both the sidebar navigation and API routes.

### AI Careers Advisor

A guided questionnaire that generates personalised career guidance reports via the Vercel AI Gateway (default model: `google/gemini-2.5-flash`, swappable per-prompt). Accessible to the same roles as CV Builder.

**How it works:**
Users complete an 11-step wizard:

1. **Interests** — "What topics or activities do you enjoy?" (multi-select pills)
2. **Strengths** — "What are you good at?" (multi-select pills)
3. **Work Environment** — "What kind of workplace suits you?" (multi-select pills)
4. **Concerns** — "Is there anything about work that worries you?" (multi-select pills + free text)
5. **Experience** — "Do you have any work experience?" (free text, optional)
6. **Career Stage** — "Where are you in your career journey?" (single select)
7. **Communication** — "How do you prefer to communicate?" (multi-select pills)
8. **Sensory Preferences** — "What kind of sensory environment works for you?" (multi-select pills)
9. **Values** — "What matters most to you in a job?" (multi-select pills)
10. **Other** — free text for anything else (optional)
11. **Report** — AI generates the report; user can view and download as PDF

**The pill selector component** (`pill-selector.tsx`) is a reusable multi-select input with support for `allowOther` (adds a free-text "Other" option), `maxSelect` (limits selections), and `singleSelect` mode. It uses plain language labels and clear visual feedback.

**AI report generation:**
- Answers are formatted into a structured prompt via `lib/ai-runner.ts:runPrompt()` and sent through the Vercel AI Gateway
- The AI returns a JSON report with four sections:
  - **Strengths** — what the user is good at and how it applies to work
  - **Career Suggestions** — 3-5 specific career ideas with explanations of why they suit the user
  - **Next Steps** — actionable things the user can do now (courses, volunteering, research)
  - **Workplace Support** — accommodations and strategies for the workplace
- All prompts are strength-focused, use UK English, reference UK-specific resources (e.g. Access to Work, National Careers Service), and **never mention autism or disability**
- Rate limited to 10 report generations per 5 minutes per user

**PDF export:** Reports can be downloaded as PDF via `@react-pdf/renderer` with a formatted layout including all four sections and a disclaimer.

**Careers Professional view:** Careers Professionals can view student sessions and reports at `/careers-advisor/students`, with expandable session cards showing the full AI-generated report. Same-organisation access only.

**Feature gating:** Same pattern as CV Builder — org-level `careersAdvisorEnabled` flag, surfaced in JWT, checked in sidebar and API routes.

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

### Document Library

A managed file repository for sharing documents with targeted audiences.

**How it works:**
- Charity Admins create **collections** at `/super-admin/library` — each collection has a title, description, and optional AI-generated thumbnail.
- Documents (PDFs, Word files, images, etc.) are uploaded to **Vercel Blob** storage within each collection.
- Collections are targeted to specific organisations and/or roles using `targetOrgIds` and `targetRoles` arrays. Only users matching the targeting criteria can see the collection.
- Targeted collections appear as individual navigation links in the user's sidebar (e.g. "Safeguarding Docs", "Policy Library").
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
- **CV Builder stats** — total CVs, CVs by status (Draft/Complete), CVs created in the last 30 days, breakdown by template
- **Careers Advisor stats** — total sessions, sessions by status (In Progress/Complete), sessions in the last 30 days
- **Survey analytics** — response rates, completion stats, CSV export of responses
- **Library stats** — download counts per org, per document, engagement trends

**Org Admin reports** (`/admin/reports`) show the same categories but scoped to their organisation only.

**Integration API:** External systems (e.g. Microsoft Dynamics 365 via Power Automate) can pull reporting data from `/api/integrations/reports` using API keys managed at `/super-admin/integrations`. Keys are SHA-256 hashed, shown only once on creation, and support expiry dates.

### Integration API

Secure programmatic access to platform data for external systems.

**How it works:**
- Charity Admins generate API keys at `/super-admin/integrations`. Each key has a name, expiry date, and is shown in full only once on creation.
- Keys are stored as SHA-256 hashes (`keyHash`) with a visible prefix (`keyPrefix`) for identification.
- External systems authenticate via `Authorization: Bearer <api-key>` headers.
- The endpoint `GET /api/integrations/reports` returns training, library, and survey data. The `?section=training|library|surveys` parameter filters the response.
- Last-used timestamps are tracked per key.

---

## Authentication and Security

### Login Methods

1. **Email and Password** — credentials-based login with bcrypt password hashing. Password complexity is enforced (minimum length, mixed characters). Forgot-password flow sends a reset link via Resend email.

2. **Google SSO** — OAuth 2.0 via Google. Users must be pre-created by an admin — Google SSO does not allow self-registration. The `signIn` callback checks for an existing user by email, creates an `Account` link record if missing, and rejects unknown emails.

3. **Microsoft Azure AD SSO** — same flow as Google. Supports both personal Microsoft accounts and work/school accounts (configured with `signInAudience: AzureADandPersonalMicrosoftAccount`).

4. **SAML SSO** — per-organisation SAML configuration for enterprise identity providers. Org Admins configure SAML at `/admin/settings/sso` with entity ID, SSO URL, and certificate. Charity-level SAML is configured at `/super-admin/settings/sso` with an option to enforce SSO for all charity users.

### Multi-Factor Authentication (MFA)

- TOTP-based (Time-based One-Time Password) using the `otpauth` library.
- **Mandatory for admin roles** — SUPER_ADMIN and ORG_ADMIN users are redirected to `/mfa-setup` until they configure TOTP. They cannot access any other page until MFA is set up.
- After password login, MFA-enabled users are redirected to `/mfa-verify` to enter their 6-digit code before gaining full session access.
- QR code display for authenticator app setup (Google Authenticator, Authy, etc.).

### Session Management

- JWT-based sessions (not database sessions) with 8-hour expiry.
- The JWT token carries: user ID, role, organisation ID, feature flags (`cvBuilderEnabled`, `careersAdvisorEnabled`), effective training programs, charity permissions, MFA status, and password change requirements.
- Middleware enforces authentication, MFA verification, password change requirements, and role-based route access on every request.

### Security Features

**Authentication and account hygiene**
- Rate limiting on every auth endpoint — login (10/15 min), forgot-password (5/15 min), reset-password (5/15 min), MFA verify (5/5 min), change-password (5/15 min). The limiter is Upstash-backed in production and falls back to in-memory for local dev (single shared `createRateLimiter` factory; `/api/tts` is also per-user rate-limited to stop abuse of paid TTS minutes).
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
- CDO careers-advisor student lookup filters strictly by leaf role + same organisation.
- Middleware path matchers tightened to drop a duplicate PARTICIPANT block and prevent path-prefix bypass; `/api/cron` is the only public POST.

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
- **Allowed roles** — which user roles can be assigned within the org
- **Feature flags** — `cvBuilderEnabled` and `careersAdvisorEnabled` toggles
- **Contact details** — name, email, phone
- **Address** — full UK address fields (line 1, line 2, city, county, postcode, country)
- **Meeting config** — Zoom/Teams API credentials for auto-generating meeting links
- **SSO config** — SAML settings with email domain, auto-provisioning, and default role
- **Parent organisation flag** — marks an org as a parent that can manage child organisations

**Hierarchical Organisation Structure (Parent/Child Orgs):**

MATs (Multi-Academy Trusts), CEC Careers Hubs, and Local Authorities can manage multiple schools or sub-organisations under a single parent org.

- **Schema:** Self-referencing relation on `Organisation` — `parentOrgId`, `isParentOrg`, `inheritSettings`, `childOrgs[]`
- **Settings inheritance:** Child orgs with `inheritSettings: true` automatically inherit their parent's `allowedProgramIds`, `allowedRoles`, `cvBuilderEnabled`, and `careersAdvisorEnabled`. Single-level inheritance only (no recursive chain). When `inheritSettings` is disabled, the child org uses its own independent settings.
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

### CV Writing Assistance (`lib/cv-ai.ts`)
- `generatePersonalStatement()` — creates an opening statement from the user's experience and skills
- `rephraseBulletPoint()` — improves work experience descriptions with stronger action verbs
- `suggestSkills()` — recommends relevant skills based on the user's experience entries
- `improveDescription()` — enhances education or experience descriptions
- Rate limited: 10 AI requests per 5 minutes per user

### Careers Report Generation (`lib/careers-advisor-ai.ts`)
- Takes structured questionnaire answers and generates a comprehensive careers report
- Output structure: strengths analysis, 3-5 career suggestions with reasoning, actionable next steps, and workplace support strategies
- References UK-specific resources (Access to Work, National Careers Service, Disability Confident employers)
- Rate limited: 10 report generations per 5 minutes per user

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
    cv-builder/                     #   CV Builder wizard, preview, student view
    careers-advisor/                #   AI Careers Advisor wizard, student view
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
    cv-builder/                     #   CV CRUD, AI, PDF, DOCX, students
    careers-advisor/                #   Sessions, AI report, PDF, students
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
  cv-builder/                       # CV wizard shell, steps, AI buttons, progress bar
  careers-advisor/                  # Advisor wizard shell, steps, pill selector, progress bar
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
  cv-ai.ts                          # CV writing AI helpers
  careers-advisor-ai.ts             # Careers report AI helpers
  careers-advisor-pdf.tsx           # Careers report PDF template
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
| `RESEND_API_KEY` | Yes | Resend API key for forgot-password emails |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID (Google SSO disabled if absent) |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `AZURE_AD_CLIENT_ID` | No | Azure AD app client ID (Microsoft SSO disabled if absent) |
| `AZURE_AD_CLIENT_SECRET` | No | Azure AD client secret |
| `AZURE_AD_TENANT_ID` | No | `common` for all account types, or a specific tenant ID |
| `BLOB_READ_WRITE_TOKEN` | Yes | Vercel Blob storage token for document uploads, AI thumbnails, and SCORM packages |
| `AI_GATEWAY_API_KEY` | Yes | Vercel AI Gateway key. AI features route through the gateway using provider/model strings (e.g. `google/gemini-2.5-flash`, `anthropic/claude-sonnet-4`). Replaces direct provider keys at runtime. |
| `ELEVENLABS_API_KEY` | No | ElevenLabs API key for the lesson read-aloud player (Lily voice). Synthesised MP3s are cached on Blob under `tts/<voiceId>/<sha256>.mp3`. |

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
