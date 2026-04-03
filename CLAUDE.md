# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Start local dev server (localhost:3000)
npm run build            # prisma generate + next build
npm run prisma:generate  # Regenerate Prisma client after schema changes
npm run prisma:push      # Push schema changes to the database (no migration file)
npm run prisma:seed      # Seed demo user (tsx prisma/seed.ts)
npm run prisma:studio    # Open Prisma Studio (visual DB browser)
npx tsx prisma/seed-training-content.ts  # Seed training modules/lessons/quizzes into DB
```

Build runs `prisma generate && vitest run && next build`. Unit tests via Vitest, E2E tests via Playwright.

## Environment Variables

Copy `.env.example` to `.env.local` for local dev. For production (Vercel), the following env vars are required:

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Neon **pooler** -- port **6543** with `?pgbouncer=true` |
| `DIRECT_URL` | Neon **direct** -- port **5432** (Prisma migrations only) |
| `NEXTAUTH_SECRET` | JWT signing secret (32+ random chars) |
| `NEXTAUTH_URL` | `https://asd-training-app-v2.vercel.app` -- no trailing slash |
| `GEMINI_API_KEY` | Google Gemini API key (used for AI insights + quiz generation) |
| `RESEND_API_KEY` | Resend API key (used for forgot-password emails) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (optional -- disables Google SSO if absent) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `AZURE_AD_CLIENT_ID` | Azure AD app client ID (optional -- disables Microsoft SSO if absent) |
| `AZURE_AD_CLIENT_SECRET` | Azure AD client secret |
| `AZURE_AD_TENANT_ID` | Use `common` for personal + work accounts; or your tenant ID |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token (used for document uploads and AI-generated thumbnails) |

**Critical:** `DATABASE_URL` must use the Neon pooler (port 6543) in production. Using the direct connection (5432) exhausts connection limits on serverless. `DIRECT_URL` is used only by Prisma for migrations.

## Architecture

Next.js 14 App Router app. TypeScript throughout. Deployed to Vercel (`asd-training-app-v2`); database is PostgreSQL via **Neon** (migrated from Supabase -- Supabase was IPv6-only, incompatible with Vercel Lambda); AI is Google Gemini (`gemini-2.5-flash`).

**Route groups:**
- `app/(auth)/` -- login, register, forgot-password, reset-password pages; no auth required
- `app/(dashboard)/` -- all leaf-role authenticated pages, wrapped by `app/(dashboard)/layout.tsx` which renders the sidebar + topbar shell; includes `/sessions` (user-facing upcoming/past sessions)
- `app/(super-admin)/` -- super admin pages (`/super-admin/*`), own layout with `SuperAdminSidebar`
- `app/(org-admin)/` -- org admin pages (`/admin/*`), own layout with `OrgAdminSidebar`; includes `/admin/sessions` (session management) and `/admin/settings/meetings` (Zoom/Teams API config)
- `app/(mfa)/` -- `/mfa-setup` and `/mfa-verify` pages for TOTP enrollment and verification
- `app/(change-password)/` -- `/change-password` page for forced password changes
- `app/api/` -- all API routes; auth state is checked via `getServerSession(authOptions)` at the top of each handler
- `app/privacy/` -- public privacy policy page

**Authentication:** NextAuth v4 with `CredentialsProvider` (email + bcrypt password) plus `GoogleProvider` and `AzureADProvider` for SSO. Uses `strategy: 'jwt'` (JWT sessions, not database sessions). **No PrismaAdapter** -- SSO account linking is handled manually in the `signIn` callback, which checks for an existing `Account` record by `provider + providerAccountId` and creates one if missing. This replaces the previous PrismaAdapter approach and avoids `OAuthAccountNotLinked` errors. The JWT callback extends the token with `id`, `role`, `organisationId`, `mustChangePassword`, `totpEnabled`, `mfaPending`, `hasPassword`, `effectivePrograms` (array of `{ id, name }` objects for the user's resolved training programs), `charityPermissions` (array of permission strings for CHARITY_EMPLOYEE users), `cvBuilderEnabled`, and `careersAdvisorEnabled` (org-level feature flags); the session callback surfaces all of those onto `session.user`. Feature flags are fetched from the Organisation model via `getOrgFeatureFlags()` in `lib/auth.ts`. SSO users must be pre-created by an admin (no self-registration via SSO); the `signIn` callback rejects unknown emails and returns an error redirect. Deactivated users (`active: false`) and users in deactivated organisations are blocked at sign-in. Session maxAge is set to 8 hours (industry standard for training platforms with sensitive data). Session is accessed on the server via `getServerSession(authOptions)` and on the client via `SessionProvider` in `components/providers/session-provider.tsx`.

**SSO setup:** Google OAuth and Azure AD are configured as app-level one-time setup (not per-org). Redirect URIs:
- Google: `https://asd-training-app-v2.vercel.app/api/auth/callback/google`
- Azure AD: `https://asd-training-app-v2.vercel.app/api/auth/callback/azure-ad`

**Login page:** Redesigned with a segmented toggle between "Email & Password" (credentials form with forgot-password link) and "Single Sign-On" (Google and Microsoft buttons). No demo credentials are shown. SSO errors from the `error` query param are displayed in the same error banner as credentials errors.

**effectivePrograms in session:** The JWT token includes the user's effective training programs (`effectivePrograms`), computed by `lib/modules.ts:getUserPrograms()`. This resolves the user's organisation's `allowedProgramIds` to active `TrainingProgram` records, returning `ProgramInfo[]` (array of `{ id, name }`). This is set on credentials login, SSO login, and session update triggers. The session type is extended in `types/index.ts` to include `effectivePrograms`. The `lib/modules.ts` file exports `getUserPrograms()`, `getOrgPrograms()`, `hasAccess()`, and the `ProgramInfo` interface.

**MFA/TOTP:** SUPER_ADMIN and ORG_ADMIN roles are required to enable TOTP MFA. Uses the `otpauth` library with `qrcode` for QR display. The middleware enforces MFA in three stages: (1) `mustChangePassword` -- redirect to `/change-password`, (2) `mfaPending` -- redirect to `/mfa-verify` for users with TOTP enabled who haven't verified yet this session, (3) admin roles without TOTP enabled -- redirect to `/mfa-setup` until configured. Login flow for MFA users: password check --> `mfaPending: true` in JWT --> redirect to `/mfa-verify` --> TOTP code submitted via second `signIn()` call with `totpCode` --> `mfaPending: false` --> session active.

**Multi-tenant organisations:** The `Organisation` model supports multi-tenancy. Each org has `allowedProgramIds` (which training programs its users can access), `allowedRoles` (which roles can be assigned), `cvBuilderEnabled` and `careersAdvisorEnabled` feature flags (both default to `true`), contact details (`contactName`, `contactEmail`, `contactPhone`), and address fields (`addressLine1`, `addressLine2`, `city`, `county`, `postcode`, `country`). Users belong to an organisation via `organisationId`. Org admins manage their own org's users, announcements, and reports at `/admin/*`. Super admins manage all organisations at `/super-admin/organisations`.

**Training programs:** Training is organised into `TrainingProgram` containers, each with a name, description, status (`DRAFT` / `UNDER_REVIEW` / `APPROVED` / `ARCHIVED`), version, and ordered modules. Organisations are assigned programs via `allowedProgramIds`. The `lib/modules.ts` file resolves these to `ProgramInfo[]` objects for the session. The sidebar dynamically renders one nav link per assigned program (e.g. "ASD Awareness Training", "Careers CPD Training") using the program's `name` field.

**Database:** Prisma ORM. Core models:
- `User`, `Child`, `Observation`, `TrainingProgress`, `AiInsight` -- original models for caregiving features
- `Account`, `Session`, `VerificationToken` -- NextAuth tables (Account used for SSO linking; Session and VerificationToken retained in schema but not used by JWT strategy)
- `Organisation` -- multi-tenant org with `allowedProgramIds`, `allowedRoles`, `slug`, contact details (`contactName`, `contactEmail`, `contactPhone`), and address fields (`addressLine1`, `addressLine2`, `city`, `county`, `postcode`, `country`)
- `Announcement` -- org-scoped or global announcements with optional expiry
- `TrainingProgram` -- training program container with name, description, order, version, status (`DRAFT` / `UNDER_REVIEW` / `APPROVED` / `ARCHIVED`), review tracking fields
- `Module`, `Lesson`, `QuizQuestion` -- training content CMS; `Module` belongs to a `TrainingProgram` via `programId`
- `PasswordResetToken` -- for forgot-password email flow
- `ClassSession`, `SessionAttendee` -- virtual classroom sessions (named `ClassSession` to avoid collision with the NextAuth `Session` table; always access via `prisma.classSession`). `ClassSession` has `isCharitySession` flag for charity-level workshops.
- `OrgMeetingConfig` -- per-org Zoom/Teams API credentials and settings for auto-generating meeting links
- `CharityMeetingConfig` -- charity-level meeting API credentials (Zoom/Teams)
- `Survey`, `SurveyQuestion`, `SurveyTarget`, `SurveyResponse`, `SurveyAnswer`, `SurveyInsight` -- complete survey system with targeted audiences, multiple question types (`MULTIPLE_CHOICE`, `YES_NO`, `FREE_TEXT`, `RATING_SCALE`, `MULTI_SELECT`), lifecycle (`DRAFT` / `PUBLISHED` / `CLOSED`), and AI-generated insights (`SUMMARY`, `COMPARATIVE`, `RECOMMENDATIONS`)
- `LibraryCollection`, `LibraryDocument`, `LibraryDocumentEvent` -- document library with collections, file uploads (Vercel Blob), targeted visibility (`targetOrgIds`, `targetRoles`), AI-generated thumbnails, and download/view tracking per user/org
- `CV`, `CVWorkExperience`, `CVEducation`, `CVSkill`, `CVReference` -- CV Builder for autistic students (UK format). Users can have multiple CVs. Each CV tracks wizard progress via `currentStep`, personal details, and has relations to work experience, education, skills, and references. Templates: `ACCESSIBLE` (default), `MODERN`, `CLASSIC`. Status: `DRAFT` / `COMPLETE`. Dates stored as strings ("MM/YYYY") for UK CV convention. Prisma accessor: `prisma.cV`.
- `CareerAdvisorSession` -- AI Careers Advisor sessions. Stores `userId`, `status` (`IN_PROGRESS` / `COMPLETE`), `currentStep`, `answers` (Json -- structured questionnaire responses), `report` (Json -- AI-generated careers report with strengths, career suggestions, next steps, workplace support). `@@index([userId])`. Prisma accessor: `prisma.careerAdvisorSession`.
- `IntegrationApiKey` -- API key management for external integrations (e.g. Power Automate). Keys are SHA-256 hashed (`keyHash`), with a display prefix (`keyPrefix`), expiry, and last-used tracking.
- `OrgSsoConfig` -- per-org SAML SSO configuration with email domain, SSO URL, entity ID, certificate, auto-provisioning, and default role
- `CharitySsoConfig` -- charity-level SAML SSO configuration with enforce-for-charity-users option

All child/observation data cascades on user delete. Module/Lesson/QuizQuestion cascade on parent delete. Survey/Library cascades on parent delete. The Prisma singleton lives in `lib/prisma.ts`.

**Roles and RBAC:** Eight roles -- `SUPER_ADMIN` (displayed as "Charity Admin"), `CHARITY_EMPLOYEE`, `ORG_ADMIN`, `CAREGIVER` (displayed as "Practitioner"), `CAREER_DEV_OFFICER` (displayed as "Careers Professional"), `STUDENT`, `INTERN`, `EMPLOYEE`. Role helpers live in `lib/rbac.ts`:
- `isSuperAdmin(session)` -- platform-wide charity admin (aliased as `isCharityAdmin`)
- `isCharityEmployee(session)` -- delegated charity-level access with configurable permissions
- `isCharityLevel(session)` -- returns true for SUPER_ADMIN or CHARITY_EMPLOYEE
- `isOrgAdmin(session)` -- manages one organisation
- `isLeafRole(session)` -- any of the five end-user roles (CAREGIVER, CAREER_DEV_OFFICER, STUDENT, INTERN, EMPLOYEE)
- `isAdmin(session)` -- backwards-compat alias for `isSuperAdmin`
- `canAccessCareers(session)` -- CAREER_DEV_OFFICER only
- `canAccessCaregiving(session)` -- CAREGIVER only
- `canCreateSessions(session)` -- ORG_ADMIN, CAREGIVER, CAREER_DEV_OFFICER, or CHARITY_EMPLOYEE with `MANAGE_SESSIONS` permission
- `canAccessCVBuilder(session)` -- CAREER_DEV_OFFICER, STUDENT, INTERN, EMPLOYEE (also checks org-level `cvBuilderEnabled` flag)
- `canAccessCareersAdvisor(session)` -- CAREER_DEV_OFFICER, STUDENT, INTERN, EMPLOYEE (also checks org-level `careersAdvisorEnabled` flag)
- `hasPermission(session, permission)` -- permission check; SUPER_ADMIN always returns true, CHARITY_EMPLOYEE checks their `charityPermissions` array, all other roles return false
- `hasRole(session, ...roles)` -- generic role check helper

**Charity permission system:** `CHARITY_PERMISSIONS` constant defines seven permissions: `manage_organisations`, `manage_training`, `manage_surveys`, `manage_announcements`, `view_reports`, `manage_sessions`, `manage_library`. SUPER_ADMIN has all permissions implicitly. CHARITY_EMPLOYEE users have only those permissions listed in their `charityPermissions` array (stored on the `User` model). The super admin sidebar dynamically shows/hides nav items based on permissions. `PERMISSION_LABELS` provides human-readable labels. `ROLE_LABELS` maps role enums to display names (e.g. `SUPER_ADMIN` -> "Charity Admin").

Leaf role types are also exported from `types/index.ts` as `LEAF_ROLES`. Navigation is role-gated via three sidebars: `components/layout/super-admin-sidebar.tsx` (super admin), `components/layout/org-admin-sidebar.tsx` (org admin), `components/layout/sidebar.tsx` (leaf roles). The middleware enforces route access: SUPER_ADMIN and ORG_ADMIN cannot access leaf-role routes (`/dashboard`, `/training`, `/careers`, `/children`, `/reports`, `/settings`, `/careers-advisor`), **except** SUPER_ADMIN can access `/training` and `/careers` for content preview. ORG_ADMIN is always redirected away from leaf-role routes.

**Role home pages:** SUPER_ADMIN --> `/super-admin`, ORG_ADMIN --> `/admin`, all leaf roles --> `/dashboard`.

**Super admin training preview:** SUPER_ADMIN can access `/training` and `/careers` pages to preview training content as a learner. The middleware allows this via a `previewPaths` check, and the dashboard layout (`app/(dashboard)/layout.tsx`) bypasses the admin redirect for these paths. The super admin Training Content page (`/super-admin/training`) has a View button (opens training as learner in a new tab) and an Edit button. The lesson editor redirects back to the module page after save.

**Dashboard role-gating:** The dashboard page (`app/(dashboard)/dashboard/page.tsx`) is role-aware:
- **CAREGIVER** (Practitioner) sees: children stats (count, observations), "Add a child" quick action, children list, and recent observations section.
- **Non-practitioners** (CAREER_DEV_OFFICER, STUDENT, INTERN, EMPLOYEE) see only: lessons completed stat card and training progress. Children-related stats, quick actions, and observations are hidden.
- The welcome message adapts: "training progress and observations" for practitioners, "training progress" for others.

**Disclaimer practitioner-only:** The important warning banner ("This tool supports observation and pattern recognition only...") is rendered by `components/ui/caregiver-disclaimer.tsx`, a client component that checks `session.user.role === 'CAREGIVER'` and returns `null` for all other roles. It is included in the root layout (`app/layout.tsx`). The page title is "Training & Observation Platform".

**Training content (database-driven):** Training content lives in `Module`, `Lesson`, and `QuizQuestion` database tables. Two module types: `ASD` (for practitioners) and `CAREERS` (for career dev officers). Data access layer at `lib/training-db.ts` provides two sets of queries: super-admin queries (include inactive records for editing) and user-facing queries (active records only). Super admins edit content via a WYSIWYG editor (`react-quill-new`) at `/super-admin/training` and can generate quiz questions with AI (Gemini). Seed training data with `npx tsx prisma/seed-training-content.ts`. Progress API is shared: `POST /api/training/progress` accepts any `moduleId`/`lessonId` combination. The `TrainingProgress` model tracks completion per user.

**Sidebar navigation by role:**
- SUPER_ADMIN (Charity Admin): Overview, Users, Organisations, Document Library, Training Content, Surveys, Announcements, Workshops, Reports, Integrations, Settings, How to Guide (CHARITY_EMPLOYEE sees a subset based on their `charityPermissions`)
- ORG_ADMIN: Users, Workshops, Announcements, Document Library, Reports, Meeting Settings, Enterprise SSO, How to Guide
- CAREGIVER (Practitioner): Dashboard, then alphabetically: [assigned training programs], Child Observations, [document collection links], How to Guide, Workshops. Settings is in the bottom section above Sign Out.
- CAREER_DEV_OFFICER / STUDENT / INTERN / EMPLOYEE: Dashboard, then alphabetically: [assigned training programs from `effectivePrograms`], Careers Advisor, CV Builder, [document collection links], How to Guide, Workshops. Settings is in the bottom section above Sign Out.

**Dark mode role badges:** All role badges across all admin views (sidebar, org admin user list, super admin org settings) have dark mode color variants using `dark:bg-*/40 dark:text-*-300` patterns.

**Org admin reports:** Reports show proper module names and training plan labels ("ASD Awareness Training", "Careers CPD Training") instead of raw module IDs.

**AI layer:** `lib/gemini.ts` contains four functions that call `gemini-2.5-flash` via `@google/genai`. All prompts explicitly instruct the model never to diagnose or suggest autism. Full reports are persisted to the `AiInsight` table; the API route is `app/api/children/[childId]/insights/route.ts`. Gemini is also used for AI-generated quiz questions in the training CMS. `lib/cv-ai.ts` contains four CV-specific AI functions: `generatePersonalStatement`, `rephraseBulletPoint`, `suggestSkills`, `improveDescription` -- all strength-focused, UK English, and never mentioning disabilities. The CV AI endpoint is `POST /api/cv-builder/[cvId]/ai` with rate limiting (10 requests per 5 minutes per user). `lib/careers-advisor-ai.ts` contains `generateCareersReport(answers)` which takes questionnaire answers and returns a structured report with strengths, career suggestions, next steps, and workplace support -- never mentions autism/disability, strength-focused, UK English, UK-specific resources. The endpoint is `POST /api/careers-advisor/[sessionId]/generate` with rate limiting (10 requests per 5 minutes per user).

**CV Builder:** An 8-step autism-friendly wizard at `/cv-builder` for building UK-format CVs. Accessible to CAREER_DEV_OFFICER, STUDENT, INTERN, EMPLOYEE roles. Pages live in `app/(dashboard)/cv-builder/`, components in `components/cv-builder/`, API routes in `app/api/cv-builder/`. The wizard shell is `components/cv-builder/cv-wizard.tsx` which renders the actual step components from `components/cv-builder/steps/` — it does NOT have its own inline renderers. Key autism-friendly UX decisions: step-by-step wizard (not one form), visible example text (not placeholders), auto-save with 500ms debounce, skip-and-return with persisted `currentStep`, single AI suggestions (not multiple options), inline editing (not modals), AI buttons below textareas (not above), plain text date inputs with placeholders like "Sept 2022" (not calendar pickers), plain language prompts, `prefers-reduced-motion` respected, and errors use icon+text (never colour alone). Wizard steps: (1) Personal Details, (2) Personal Statement, (3) Work Experience, (4) Education, (5) Skills, (6) Interests, (7) References, (8) Review & Download. Sub-item steps (work experience, education, skills, references) maintain local state with optimistic updates — saved entries appear immediately as cards with edit/delete buttons, and a "Saved!" confirmation is shown for 3 seconds. The "Add another..." button appears below existing entries. Three templates: Accessible (single-column, 12pt, 1.5 line spacing -- recommended default), Modern (two-column with sidebar), Classic (traditional centred UK CV with extra line space between name and contact). Export as PDF (`@react-pdf/renderer` -- templates in `lib/cv-templates/`) or Word `.docx` (`docx` library). The completion checklist on the Review step is guidance only — Mark as Complete is not gated by it. After marking complete, a "Done — back to my CVs" button navigates to `/cv-builder`. The CV list page has no header "New CV" button — new CVs are created via the dashed card in the grid. CAREER_DEV_OFFICER users see a "My Students" tab to view and download CVs for students in their organisation (read-only, same-org verified). CV Builder stats (total, by status, last 30 days, by template) are included in both super admin and org admin reports pages. **Important Prisma notes:** the Prisma accessor is `prisma.cV` (not `prisma.cv`). Zod schemas for sub-items (work experience, education) must use `.nullable().optional()` for fields that can be `null` (e.g. `endDate`, `description`) — `z.string().optional()` rejects `null`.

**AI Careers Advisor:** A guided Q&A wizard at `/careers-advisor` that generates personalised careers reports via Gemini AI. Accessible to CAREER_DEV_OFFICER, STUDENT, INTERN, EMPLOYEE roles (gated by org-level `careersAdvisorEnabled` flag, default `true`). Pages live in `app/(dashboard)/careers-advisor/`, components in `components/careers-advisor/`, API routes in `app/api/careers-advisor/`. The wizard has 12 steps: 6 core questions (interests, strengths, environment, concerns, experience, stage), an optional intro step offering to skip or continue, 4 optional questions (communication, sensory, values, other), and a report generation/display step. All questions use multi-select pill inputs (`components/careers-advisor/pill-selector.tsx`) with plain language prompts. Answers are stored as a single JSON field on `CareerAdvisorSession`. The AI report (`lib/careers-advisor-ai.ts`) returns structured JSON with 4 sections: strengths, careers (3-5 suggestions with explanations), next steps, and workplace support. Reports are downloadable as PDF (`lib/careers-advisor-pdf.tsx` + `@react-pdf/renderer`). CAREER_DEV_OFFICER users can view student reports via `/careers-advisor/students`. Careers Advisor stats (total sessions, by status, last 30 days) are included in both super admin and org admin reports pages. Super admins can enable/disable per organisation via org settings (Features section checkbox). The feature follows the same org-level toggle pattern as CV Builder. **Important:** The Prisma accessor is `prisma.careerAdvisorSession`. API routes: `GET/POST /api/careers-advisor` (list/create), `GET/PATCH/DELETE /api/careers-advisor/[sessionId]` (CRUD), `POST /api/careers-advisor/[sessionId]/generate` (AI report generation, rate limited), `GET /api/careers-advisor/[sessionId]/pdf` (PDF download), `GET /api/careers-advisor/students` + `[userId]` (CDO student views).

**Virtual Classroom Sessions:** Org admins create sessions at `/admin/sessions`. Each session has a title, date/time, duration, platform (Zoom / Teams / Custom), host, and a list of attendees. Attendees can be selected as: all org members, specific roles, or individual users. Both the host and the org admin have full management rights over a session. Meeting links can be pasted manually or auto-generated via the Zoom or Teams API using per-org credentials stored in `OrgMeetingConfig` (configured at `/admin/settings/meetings`). Status flow: `SCHEDULED` → `IN_PROGRESS` → `COMPLETED` (or `CANCELLED`). Attendance is tracked via checkboxes on the `SessionAttendee` join model; a recording URL can be added after the session completes. Users view their upcoming and past sessions at `/sessions`, and the dashboard shows an "Upcoming Sessions" card. Data access helpers live in `lib/sessions.ts`; Zoom/Teams API integration lives in `lib/meetings.ts`. **Important:** the Prisma model is `ClassSession` (not `Session`) to avoid colliding with the NextAuth `Session` table — always use `prisma.classSession`.

**Document Library:** Super admins manage document collections at `/super-admin/library`. Each collection has a title, description, optional AI-generated thumbnail, and targeted org/role visibility via `targetOrgIds` and `targetRoles` arrays. Documents are uploaded to Vercel Blob (`@vercel/blob`). Download and view events are tracked per user/org via `LibraryDocumentEvent`. Org admins can view collections at `/admin/library` and edit collection title/description. Users see targeted collections in the sidebar (as individual nav items linking to `/library?c=<id>`) and at `/library`. Super admin library reports show download stats per org and per document. AI-assisted metadata generation uses Gemini for title/description and Imagen for thumbnails.

**Surveys:** Super admins create surveys at `/super-admin/surveys`. Each survey has questions (multiple choice, yes/no, free text, rating scale, multi-select), targeted audiences (by org and/or role via `SurveyTarget`), and a lifecycle: `DRAFT` -> `PUBLISHED` -> `CLOSED`. Users see pending surveys on their dashboard and respond at `/surveys/[surveyId]`. AI insights can be generated per survey using Gemini (types: `SUMMARY`, `COMPARATIVE`, `RECOMMENDATIONS`). Survey results are viewable at `/super-admin/surveys/[surveyId]/results`. Survey reports with CSV export are available at `/super-admin/reports`.

**Integration API:** External systems (e.g. Microsoft Dynamics 365 via Power Automate) can pull reporting data from `/api/integrations/reports`. Authentication uses SHA-256 hashed API keys with Bearer token auth. Keys are managed at `/super-admin/integrations` (create, revoke, view prefix/last used). The endpoint supports `?section=training|library|surveys` filtering. API keys are stored as hashed values (`IntegrationApiKey` model) -- the raw key is shown only once on creation.

**SAML SSO:** Per-org SAML/SSO configuration is stored in `OrgSsoConfig` (fields: `emailDomain`, `ssoUrl`, `entityId`, `certificate`, `autoProvision`, `defaultRole`). Org admins configure SSO at `/admin/settings/sso`. Charity-level SAML SSO is stored in `CharitySsoConfig` with an `enforceForCharityUsers` option. Super admins configure charity SSO at `/super-admin/settings/sso`. The SAML callback is handled at `/api/auth/saml/callback` and login initiation at `/api/auth/saml/login`. SSO check endpoint at `/api/auth/sso-check` determines if a user's email domain has an SSO config.

**Observations:** The three enums (`Domain`, `Frequency`, `Context`) are the vocabulary for logging behaviours. Behaviour lists per domain live in `lib/constants.ts`. Helper functions for aggregating observations are in `lib/observations.ts`. Charts on the reports page use Recharts.

## Known Issues / Deployment Notes

- **Vercel 500 on NextAuth routes:** If all `/api/auth/*` routes return 500 after deploy, check that `DATABASE_URL` uses the Neon pooler URL (port 6543) not the direct URL, and that `NEXTAUTH_URL` matches the deployed URL (`https://asd-training-app-v2.vercel.app`) with no trailing slash.
- **Prisma client not found on Vercel:** The build script runs `prisma generate && next build` to ensure the client is always regenerated -- do not separate these.
- **Schema changes:** Run `npx prisma db push` for quick iteration locally. Use `npx prisma migrate dev` if you need a tracked migration file. **Critical:** `.env.local` points to the **dev** Neon branch (`ep-lucky-cherry-a8toqlw5`). To push schema to **production** (`ep-blue-thunder-a88kb0cy`), run `npx vercel env pull .env.production --environment production --yes` then `npx dotenv-cli -e .env.production -- npx prisma db push`. Always push to both dev and production when adding/changing columns that are queried at runtime (e.g. feature flags on Organisation) — otherwise production will crash on queries referencing missing columns.
- **Super admin panel:** Available at `/super-admin`, SUPER_ADMIN role only. Manages organisations, training content, announcements, and platform-wide reports.
- **Org admin panel:** Available at `/admin`, ORG_ADMIN role only. Manages users within their organisation, org-scoped announcements, and org reports.
- **SSO Azure AD config:** The Azure app registration must have `signInAudience: AzureADandPersonalMicrosoftAccount` in the manifest to support both personal Microsoft accounts and work/school accounts. Set this in Azure Portal --> App registrations --> Manifest editor. Redirect URI: `https://asd-training-app-v2.vercel.app/api/auth/callback/azure-ad`.
- **SSO Google config:** Google OAuth consent screen must be configured in Google Cloud Console. Redirect URI: `https://asd-training-app-v2.vercel.app/api/auth/callback/google`.
- **SSO users must be pre-created:** SSO login rejects emails not already in the database. Admins must create user accounts first; SSO then links via manual Account record creation in the signIn callback.
- **Forced password change:** Users with `mustChangePassword: true` are redirected to `/change-password` by middleware and cannot access any other route until they change their password.
- **MFA enforcement:** SUPER_ADMIN and ORG_ADMIN users without TOTP enabled are redirected to `/mfa-setup` by middleware and cannot access any other route until MFA is configured.
- **Dev/Prod environments:** Neon database branching is set up. Production uses the main Neon branch; Development uses the `dev` branch (endpoint: `ep-lucky-cherry-a8toqlw5`). Vercel has separate env vars for Production and Development environments. Local dev pulls Development env vars via `npx vercel env pull .env.local`. Git workflow: work on `dev` branch -> merge to `main` -> deploy with `npx vercel --prod --yes`.
- **Vercel Blob:** Document uploads and AI-generated thumbnails use `@vercel/blob`. Requires `BLOB_READ_WRITE_TOKEN` env var.
- **CHARITY_EMPLOYEE role:** Delegated charity-level access. Permissions are configured per-user via the `charityPermissions` array. The super admin sidebar dynamically filters nav items based on these permissions.
