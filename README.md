# ASD Early Identification Training Platform

A multi-tenant SaaS platform for ASD early identification training, child observation tracking, and careers support for autistic young people. Built for charities, training organisations, schools, and employers.

**Live URL:** https://asd-training-app-v2.vercel.app
**Repository:** https://github.com/Hodgy007/asd-training-app
**Stack:** Next.js 14 (App Router) · TypeScript · Prisma · PostgreSQL (Neon) · NextAuth v4 · Google Gemini AI · Tailwind CSS · Vercel

---

## Table of Contents

- [Platform Overview](#platform-overview)
- [User Roles](#user-roles)
- [Features in Detail](#features-in-detail)
  - [Training Modules](#training-modules)
  - [Child Observations (Practitioners)](#child-observations-practitioners)
  - [CV Builder](#cv-builder)
  - [AI Careers Advisor](#ai-careers-advisor)
  - [Virtual Workshops](#virtual-workshops)
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

1. **Practitioners** (caregivers, nursery workers, health visitors) use the platform to complete ASD awareness training and log behavioural observations for children in their care, with AI-generated insights to support early identification.

2. **Career-focused users** (careers professionals, students, interns, employees) use the platform to complete careers CPD training, build autism-friendly CVs with AI writing assistance, and receive personalised career guidance through the AI Careers Advisor.

3. **Administrators** (charity admins, charity employees, organisation admins) manage users, organisations, training content, surveys, document libraries, virtual workshops, and platform-wide analytics.

Every feature is designed with accessibility in mind. The platform uses plain language, step-by-step wizards, visible examples, and respects `prefers-reduced-motion`. Colour is never the sole indicator of status — all feedback uses icon + text combinations.

---

## User Roles

The platform has eight roles, each with specific access:

| Role | Display Name | Home Page | Description |
|------|-------------|-----------|-------------|
| `SUPER_ADMIN` | Charity Admin | `/super-admin` | Full platform control. Manages all organisations, users, training content, surveys, document library, workshops, reports, integrations, and SSO configuration. Has all permissions implicitly. MFA (TOTP) required. |
| `CHARITY_EMPLOYEE` | Charity Employee | `/super-admin` | Delegated charity-level access. Sees a subset of the charity admin dashboard based on individually assigned permissions (e.g. manage_training, view_reports, manage_sessions). |
| `ORG_ADMIN` | Org Admin | `/admin` | Manages a single organisation. Creates and manages users within their org, handles org-level announcements, views org reports, configures meeting integrations (Zoom/Teams), and sets up enterprise SAML SSO. MFA (TOTP) required. |
| `CAREGIVER` | Practitioner | `/dashboard` | Completes ASD awareness training modules and quizzes. Logs behavioural observations for children and receives AI-generated insights. Can create and manage virtual workshop sessions. |
| `CAREER_DEV_OFFICER` | Careers Professional | `/dashboard` | Completes careers CPD training. Uses CV Builder and AI Careers Advisor. Can view student CVs and career advisor reports for users in the same organisation. Can create workshop sessions. |
| `STUDENT` | Student | `/dashboard` | Completes assigned training. Uses CV Builder and AI Careers Advisor for personal career development. |
| `INTERN` | Intern | `/dashboard` | Same access as Student. Completes training, builds CVs, and uses the AI Careers Advisor. |
| `EMPLOYEE` | Employee | `/dashboard` | Same access as Student. Completes training, builds CVs, and uses the AI Careers Advisor. |

### Charity Employee Permissions

Charity Employees receive granular permissions from the seven available:

- `manage_organisations` — create and edit organisations
- `manage_training` — create and edit training programs, modules, lessons, and quizzes
- `manage_surveys` — create, publish, and close surveys; view results and AI insights
- `manage_announcements` — create and manage platform-wide announcements
- `view_reports` — access platform-wide analytics and reports
- `manage_sessions` — create and manage charity-level virtual workshops
- `manage_library` — manage document library collections, upload files, view download stats

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
- Admins can upload reference documents (PDFs, Word files) and use Gemini AI to auto-generate module outlines, lesson content, and quiz questions.
- Generated content can be reviewed, edited, and regenerated before publishing.

### Child Observations (Practitioners)

Practitioners (Caregivers) track behavioural observations for children in their care to support early ASD identification.

**How it works:**
- Practitioners add child profiles with name, date of birth, and notes.
- For each child, they log observations across three behavioural domains:
  - **Social Communication** — eye contact, joint attention, response to name, social smiling, pointing, language use
  - **Behaviour and Play** — repetitive movements, play patterns, routine adherence, transitions, sensory-seeking
  - **Sensory Responses** — sound sensitivity, texture reactions, visual stimulation, taste/smell responses
- Each observation records the specific behaviour, frequency (Rare / Sometimes / Often), context (Home / Nursery / Outdoors / Other), and optional notes.
- The Reports page shows charts (Recharts) with observation patterns over time, domain breakdowns, and frequency distributions.

**AI insights:**
- Practitioners can generate AI insights for any child using Google Gemini. The AI analyses all observations and produces:
  - A summary of observed patterns
  - Developmental guidance and suggested next steps
  - Areas to monitor
- All AI prompts explicitly instruct the model to **never diagnose or suggest autism**. The platform supports observation and pattern recognition only.
- A prominent disclaimer banner reminds practitioners of this on every page.

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

A guided questionnaire that generates personalised career guidance reports using Google Gemini AI. Accessible to the same roles as CV Builder.

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
- Answers are formatted into a structured prompt sent to `gemini-2.5-flash`
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

**AI features:** Gemini can generate collection descriptions from uploaded documents. Imagen (via Google AI) can generate thumbnail images for collections.

### Surveys

Targeted questionnaires with multiple question types and AI-generated insights.

**How it works:**
- Charity Admins create surveys at `/super-admin/surveys` with a title, description, and optional close date.
- Five question types are supported: Multiple Choice, Yes/No, Free Text, Rating Scale (1-5), and Multi-Select.
- Surveys are targeted to specific audiences using `SurveyTarget` records that specify organisation and/or role filters. A survey can target multiple audience segments.
- Surveys follow a lifecycle: Draft → Published → Closed. Published surveys appear as pending items on matching users' dashboards.
- Users respond to surveys at `/surveys/[surveyId]`. Each user can submit one response per survey.
- Results are visualised at `/super-admin/surveys/[surveyId]/results` with response breakdowns per question, completion rates, and response timelines.
- AI insights can be generated per survey using Gemini, producing three types:
  - **Summary** — high-level overview of findings
  - **Comparative** — comparisons across organisations or roles
  - **Recommendations** — actionable suggestions based on responses
- Survey analytics with CSV export are available in the Reports section.

**AI survey generation:** Admins can have Gemini generate survey questions from a description or uploaded reference documents, which can then be edited before publishing.

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

- Rate limiting on auth endpoints (login: 10 attempts per 15 minutes, registration: 5 per 15 minutes)
- Forced password change on first login (when `mustChangePassword: true`)
- Deactivated users and organisations are blocked at sign-in
- Input sanitisation on all user inputs
- File upload validation (size limits, allowed MIME types)
- Content Security Policy (CSP) headers
- Cookie consent banner

---

## Multi-Tenant Architecture

The platform supports multiple organisations, each operating as an isolated tenant.

**Organisation settings** (managed by Charity Admins at `/super-admin/organisations`):
- **Allowed training programs** — which programs the org's users can access
- **Allowed roles** — which user roles can be assigned within the org
- **Feature flags** — `cvBuilderEnabled` and `careersAdvisorEnabled` toggles
- **Contact details** — name, email, phone
- **Address** — full UK address fields (line 1, line 2, city, county, postcode, country)
- **Meeting config** — Zoom/Teams API credentials for auto-generating meeting links
- **SSO config** — SAML settings with email domain, auto-provisioning, and default role

**Data isolation:**
- Users belong to one organisation via `organisationId`
- Org Admins can only see and manage users within their organisation
- Training programs, library collections, surveys, and announcements can be targeted to specific organisations
- Reports are scoped to the admin's organisation (Org Admin) or platform-wide (Charity Admin)
- CDO (Careers Professional) student views are restricted to same-organisation users

---

## AI Integration

All AI features use Google Gemini (`gemini-2.5-flash`) via the `@google/genai` SDK. Three distinct AI modules handle different domains:

### Observation Insights (`lib/gemini.ts`)
- Analyses child behavioural observations to identify patterns and suggest next steps
- Four output types: summary, pattern analysis, developmental guidance, and full comprehensive report
- **Critical safety constraint:** All prompts explicitly instruct the model to never diagnose, never suggest autism, and frame all output as observational support only

### CV Writing Assistance (`lib/cv-ai.ts`)
- `generatePersonalStatement()` — creates an opening statement from the user's experience and skills
- `rephraseBulletPoint()` — improves work experience descriptions with stronger action verbs
- `suggestSkills()` — recommends relevant skills based on the user's experience entries
- `improveDescription()` — enhances education or experience descriptions
- All outputs are strength-focused, UK English, and never mention disabilities
- Rate limited: 10 AI requests per 5 minutes per user

### Careers Report Generation (`lib/careers-advisor-ai.ts`)
- Takes structured questionnaire answers and generates a comprehensive careers report
- Output structure: strengths analysis, 3-5 career suggestions with reasoning, actionable next steps, and workplace support strategies
- References UK-specific resources (Access to Work, National Careers Service, Disability Confident employers)
- Strength-focused language throughout; never mentions autism or disability
- Rate limited: 10 report generations per 5 minutes per user

---

## Application Structure

```
app/
  (auth)/                           # Public pages: login, register, password reset
  (dashboard)/                      # Leaf role pages (wrapped by sidebar layout)
    dashboard/                      #   Role-aware home page
    training/[programId]/           #   Training modules and lessons
    children/                       #   Child observations (practitioners only)
    cv-builder/                     #   CV Builder wizard, preview, student view
    careers-advisor/                #   AI Careers Advisor wizard, student view
    careers/                        #   Careers training modules
    sessions/                       #   Virtual workshops (user view)
    library/                        #   Document library
    reports/                        #   Observation reports (practitioners only)
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
    training/                       #   Training progress
    children/                       #   Children and observations
    cv-builder/                     #   CV CRUD, AI, PDF, DOCX, students
    careers-advisor/                #   Sessions, AI report, PDF, students
    sessions/                       #   Virtual workshops
    library/                        #   Document library
    surveys/                        #   Survey responses
    announcements/                  #   Active announcements
    admin/                          #   Org admin endpoints
    super-admin/                    #   Charity admin endpoints
    integrations/                   #   External API access
    account/                        #   User account info

components/
  layout/                           # Sidebars (leaf, super-admin, org-admin) and topbar
  dashboard/                        # Dashboard widgets (announcements, sessions, surveys)
  ui/                               # Shared UI primitives and disclaimers
  training/                         # Module cards, quiz component, video player
  children/                         # Child forms and cards
  observations/                     # Observation charts and tables
  cv-builder/                       # CV wizard shell, steps, AI buttons, progress bar
  careers-advisor/                  # Advisor wizard shell, steps, pill selector, progress bar
  super-admin/                      # Content generation, survey builder, file upload
  ai/                               # AI insight panels and buttons
  providers/                        # NextAuth session and theme providers

lib/
  auth.ts                           # NextAuth config, JWT callbacks, feature flag fetching
  rbac.ts                           # Role checks, permissions, display labels
  prisma.ts                         # Prisma client singleton
  gemini.ts                         # Observation AI (Gemini)
  cv-ai.ts                          # CV writing AI (Gemini)
  careers-advisor-ai.ts             # Careers report AI (Gemini)
  careers-advisor-pdf.tsx           # Careers report PDF template
  cv-templates/                     # CV PDF templates (accessible, modern, classic)
  modules.ts                        # Training program resolution
  training-db.ts                    # Training data access layer
  meetings.ts                       # Zoom/Teams API integration
  saml.ts                           # SAML SSO protocol
  sessions.ts                       # Workshop session helpers
  observations.ts                   # Observation aggregation
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
| `GEMINI_API_KEY` | Yes | Google Gemini API key for all AI features |
| `RESEND_API_KEY` | Yes | Resend API key for forgot-password emails |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID (Google SSO disabled if absent) |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `AZURE_AD_CLIENT_ID` | No | Azure AD app client ID (Microsoft SSO disabled if absent) |
| `AZURE_AD_CLIENT_SECRET` | No | Azure AD client secret |
| `AZURE_AD_TENANT_ID` | No | `common` for all account types, or a specific tenant ID |
| `BLOB_READ_WRITE_TOKEN` | Yes | Vercel Blob storage token for document uploads and AI thumbnails |

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
