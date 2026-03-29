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

There is no test suite. Linting is via TypeScript (`tsc --noEmit`).

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

**Authentication:** NextAuth v4 with `CredentialsProvider` (email + bcrypt password) plus `GoogleProvider` and `AzureADProvider` for SSO. Uses `strategy: 'jwt'` (JWT sessions, not database sessions). **No PrismaAdapter** -- SSO account linking is handled manually in the `signIn` callback, which checks for an existing `Account` record by `provider + providerAccountId` and creates one if missing. This replaces the previous PrismaAdapter approach and avoids `OAuthAccountNotLinked` errors. The JWT callback extends the token with `id`, `role`, `organisationId`, `mustChangePassword`, `totpEnabled`, `mfaPending`, and `effectiveModules` (the user's resolved module IDs); the session callback surfaces all of those onto `session.user`. SSO users must be pre-created by an admin (no self-registration via SSO); the `signIn` callback rejects unknown emails and returns an error redirect. Deactivated users (`active: false`) and users in deactivated organisations are blocked at sign-in. Session is accessed on the server via `getServerSession(authOptions)` and on the client via `SessionProvider` in `components/providers/session-provider.tsx`.

**SSO setup:** Google OAuth and Azure AD are configured as app-level one-time setup (not per-org). Redirect URIs:
- Google: `https://asd-training-app-v2.vercel.app/api/auth/callback/google`
- Azure AD: `https://asd-training-app-v2.vercel.app/api/auth/callback/azure-ad`

**Login page:** Redesigned with a segmented toggle between "Email & Password" (credentials form with forgot-password link) and "Single Sign-On" (Google and Microsoft buttons). No demo credentials are shown. SSO errors from the `error` query param are displayed in the same error banner as credentials errors.

**effectiveModules in session:** The JWT token includes the user's effective module IDs (`effectiveModules`), computed by `lib/modules.ts:getEffectiveModules()`. Priority: user-level `allowedModuleIds` > org-level `allowedModuleIds` > fallback (ASD modules only). This is set on credentials login, SSO login, and session update triggers. The session type is extended in `types/index.ts` to include `effectiveModules: string[]`.

**MFA/TOTP:** SUPER_ADMIN and ORG_ADMIN roles are required to enable TOTP MFA. Uses the `otpauth` library with `qrcode` for QR display. The middleware enforces MFA in three stages: (1) `mustChangePassword` -- redirect to `/change-password`, (2) `mfaPending` -- redirect to `/mfa-verify` for users with TOTP enabled who haven't verified yet this session, (3) admin roles without TOTP enabled -- redirect to `/mfa-setup` until configured. Login flow for MFA users: password check --> `mfaPending: true` in JWT --> redirect to `/mfa-verify` --> TOTP code submitted via second `signIn()` call with `totpCode` --> `mfaPending: false` --> session active.

**Multi-tenant organisations:** The `Organisation` model supports multi-tenancy. Each org has `allowedModuleIds` (which training modules its users can access) and `allowedRoles` (which roles can be assigned). Users belong to an organisation via `organisationId`. Org admins manage their own org's users, announcements, and reports at `/admin/*`. Super admins manage all organisations at `/super-admin/organisations`.

**Module access as training plans:** Org admin user creation and super admin org settings present module access as two toggles -- "ASD Awareness Training" (covers `module-1` through `module-5`) and "Careers CPD Training" (covers `careers-module-1` through `careers-module-4`) -- rather than exposing individual module IDs. The mapping lives in `lib/modules.ts` which exports `ASD_MODULE_IDS`, `CAREERS_MODULE_IDS`, and helper functions `hasAsdAccess()` / `hasCareersAccess()`.

**Database:** Prisma ORM. Core models:
- `User`, `Child`, `Observation`, `TrainingProgress`, `AiInsight` -- original models for caregiving features
- `Account`, `Session`, `VerificationToken` -- NextAuth tables (Account used for SSO linking; Session and VerificationToken retained in schema but not used by JWT strategy)
- `Organisation` -- multi-tenant org with `allowedModuleIds`, `allowedRoles`, `slug`
- `Announcement` -- org-scoped or global announcements with optional expiry
- `Module`, `Lesson`, `QuizQuestion` -- training content CMS (replaces hardcoded TS files)
- `PasswordResetToken` -- for forgot-password email flow
- `ClassSession`, `SessionAttendee` -- virtual classroom sessions (named `ClassSession` to avoid collision with the NextAuth `Session` table; always access via `prisma.classSession`)
- `OrgMeetingConfig` -- per-org Zoom/Teams API credentials and settings for auto-generating meeting links

All child/observation data cascades on user delete. Module/Lesson/QuizQuestion cascade on parent delete. The Prisma singleton lives in `lib/prisma.ts`.

**Roles and RBAC:** Seven roles -- `SUPER_ADMIN`, `ORG_ADMIN`, `CAREGIVER`, `CAREER_DEV_OFFICER`, `STUDENT`, `INTERN`, `EMPLOYEE`. Role helpers live in `lib/rbac.ts`:
- `isSuperAdmin(session)` -- platform-wide admin
- `isOrgAdmin(session)` -- manages one organisation
- `isLeafRole(session)` -- any of the five end-user roles (CAREGIVER, CAREER_DEV_OFFICER, STUDENT, INTERN, EMPLOYEE)
- `isAdmin(session)` -- backwards-compat alias for `isSuperAdmin`
- `canAccessCareers(session)` -- CAREER_DEV_OFFICER only
- `canAccessCaregiving(session)` -- CAREGIVER only

Leaf role types are also exported from `types/index.ts` as `LEAF_ROLES`. Navigation is role-gated via three sidebars: `components/layout/super-admin-sidebar.tsx` (super admin), `components/layout/org-admin-sidebar.tsx` (org admin), `components/layout/sidebar.tsx` (leaf roles). The middleware enforces route access: SUPER_ADMIN and ORG_ADMIN cannot access leaf-role routes (`/dashboard`, `/training`, `/careers`, `/children`, `/reports`, `/settings`), **except** SUPER_ADMIN can access `/training` and `/careers` for content preview. ORG_ADMIN is always redirected away from leaf-role routes.

**Role home pages:** SUPER_ADMIN --> `/super-admin`, ORG_ADMIN --> `/admin`, all leaf roles --> `/dashboard`.

**Super admin training preview:** SUPER_ADMIN can access `/training` and `/careers` pages to preview training content as a learner. The middleware allows this via a `previewPaths` check, and the dashboard layout (`app/(dashboard)/layout.tsx`) bypasses the admin redirect for these paths. The super admin Training Content page (`/super-admin/training`) has a View button (opens training as learner in a new tab) and an Edit button. The lesson editor redirects back to the module page after save.

**Dashboard role-gating:** The dashboard page (`app/(dashboard)/dashboard/page.tsx`) is role-aware:
- **CAREGIVER** sees: children stats (count, observations), "Add a child" quick action, children list, and recent observations section.
- **Non-caregivers** (CAREER_DEV_OFFICER, STUDENT, INTERN, EMPLOYEE) see only: lessons completed stat card and training progress. Children-related stats, quick actions, and observations are hidden.
- The welcome message adapts: "training progress and observations" for caregivers, "training progress" for others.

**Disclaimer caregiver-only:** The important warning banner ("This tool supports observation and pattern recognition only...") is rendered by `components/ui/caregiver-disclaimer.tsx`, a client component that checks `session.user.role === 'CAREGIVER'` and returns `null` for all other roles. It is included in the root layout (`app/layout.tsx`). The page title is "Training & Observation Platform".

**Training content (database-driven):** Training content lives in `Module`, `Lesson`, and `QuizQuestion` database tables. Two module types: `ASD` (for caregivers) and `CAREERS` (for career dev officers). Data access layer at `lib/training-db.ts` provides two sets of queries: super-admin queries (include inactive records for editing) and user-facing queries (active records only). Super admins edit content via a WYSIWYG editor (`react-quill-new`) at `/super-admin/training` and can generate quiz questions with AI (Gemini). Seed training data with `npx tsx prisma/seed-training-content.ts`. Progress API is shared: `POST /api/training/progress` accepts any `moduleId`/`lessonId` combination. The `TrainingProgress` model tracks completion per user.

**Sidebar navigation by role:**
- SUPER_ADMIN: Overview, Organisations, Training Content, Announcements, Reports
- ORG_ADMIN: Users, Announcements, Reports, Sessions
- CAREGIVER: Dashboard, ASD Training, Child Observations, Reports, Sessions, Settings
- CAREER_DEV_OFFICER: Dashboard, Careers Training, Sessions, Settings
- STUDENT / INTERN / EMPLOYEE: Dashboard, then **only** the training links matching their `effectiveModules` (ASD Training if any `module-*` IDs present, Careers Training if any `careers-*` IDs present), Sessions, Settings

**Dark mode role badges:** All role badges across all admin views (sidebar, org admin user list, super admin org settings) have dark mode color variants using `dark:bg-*/40 dark:text-*-300` patterns.

**Org admin reports:** Reports show proper module names and training plan labels ("ASD Awareness Training", "Careers CPD Training") instead of raw module IDs.

**AI layer:** `lib/gemini.ts` contains four functions that call `gemini-2.5-flash` via `@google/genai`. All prompts explicitly instruct the model never to diagnose or suggest autism. Full reports are persisted to the `AiInsight` table; the API route is `app/api/children/[childId]/insights/route.ts`. Gemini is also used for AI-generated quiz questions in the training CMS.

**Virtual Classroom Sessions:** Org admins create sessions at `/admin/sessions`. Each session has a title, date/time, duration, platform (Zoom / Teams / Custom), host, and a list of attendees. Attendees can be selected as: all org members, specific roles, or individual users. Both the host and the org admin have full management rights over a session. Meeting links can be pasted manually or auto-generated via the Zoom or Teams API using per-org credentials stored in `OrgMeetingConfig` (configured at `/admin/settings/meetings`). Status flow: `SCHEDULED` → `IN_PROGRESS` → `COMPLETED` (or `CANCELLED`). Attendance is tracked via checkboxes on the `SessionAttendee` join model; a recording URL can be added after the session completes. Users view their upcoming and past sessions at `/sessions`, and the dashboard shows an "Upcoming Sessions" card. Data access helpers live in `lib/sessions.ts`; Zoom/Teams API integration lives in `lib/meetings.ts`. **Important:** the Prisma model is `ClassSession` (not `Session`) to avoid colliding with the NextAuth `Session` table — always use `prisma.classSession`.

**Observations:** The three enums (`Domain`, `Frequency`, `Context`) are the vocabulary for logging behaviours. Behaviour lists per domain live in `lib/constants.ts`. Helper functions for aggregating observations are in `lib/observations.ts`. Charts on the reports page use Recharts.

## Known Issues / Deployment Notes

- **Vercel 500 on NextAuth routes:** If all `/api/auth/*` routes return 500 after deploy, check that `DATABASE_URL` uses the Neon pooler URL (port 6543) not the direct URL, and that `NEXTAUTH_URL` matches the deployed URL (`https://asd-training-app-v2.vercel.app`) with no trailing slash.
- **Prisma client not found on Vercel:** The build script runs `prisma generate && next build` to ensure the client is always regenerated -- do not separate these.
- **Schema changes:** Run `npx prisma db push` for quick iteration locally. Use `npx prisma migrate dev` if you need a tracked migration file.
- **Super admin panel:** Available at `/super-admin`, SUPER_ADMIN role only. Manages organisations, training content, announcements, and platform-wide reports.
- **Org admin panel:** Available at `/admin`, ORG_ADMIN role only. Manages users within their organisation, org-scoped announcements, and org reports.
- **SSO Azure AD config:** The Azure app registration must have `signInAudience: AzureADandPersonalMicrosoftAccount` in the manifest to support both personal Microsoft accounts and work/school accounts. Set this in Azure Portal --> App registrations --> Manifest editor. Redirect URI: `https://asd-training-app-v2.vercel.app/api/auth/callback/azure-ad`.
- **SSO Google config:** Google OAuth consent screen must be configured in Google Cloud Console. Redirect URI: `https://asd-training-app-v2.vercel.app/api/auth/callback/google`.
- **SSO users must be pre-created:** SSO login rejects emails not already in the database. Admins must create user accounts first; SSO then links via manual Account record creation in the signIn callback.
- **Forced password change:** Users with `mustChangePassword: true` are redirected to `/change-password` by middleware and cannot access any other route until they change their password.
- **MFA enforcement:** SUPER_ADMIN and ORG_ADMIN users without TOTP enabled are redirected to `/mfa-setup` by middleware and cannot access any other route until MFA is configured.
