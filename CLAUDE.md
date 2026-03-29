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
- `app/(dashboard)/` -- all leaf-role authenticated pages, wrapped by `app/(dashboard)/layout.tsx` which renders the sidebar + topbar shell
- `app/(super-admin)/` -- super admin pages (`/super-admin/*`), own layout with `SuperAdminSidebar`
- `app/(org-admin)/` -- org admin pages (`/admin/*`), own layout with `OrgAdminSidebar`
- `app/(mfa)/` -- `/mfa-setup` and `/mfa-verify` pages for TOTP enrollment and verification
- `app/(change-password)/` -- `/change-password` page for forced password changes
- `app/api/` -- all API routes; auth state is checked via `getServerSession(authOptions)` at the top of each handler
- `app/privacy/` -- public privacy policy page

**Authentication:** NextAuth v4 with `CredentialsProvider` (email + bcrypt password) plus `GoogleProvider` and `AzureADProvider` for SSO. Uses `strategy: 'jwt'` (JWT sessions, not database sessions). `PrismaAdapter` is still configured -- it is required for SSO `Account` record linking even though sessions are JWT. The JWT callback extends the token with `id`, `role`, `organisationId`, `mustChangePassword`, `totpEnabled`, and `mfaPending`; the session callback surfaces those onto `session.user`. SSO users must be pre-created by an admin (no self-registration via SSO); the `signIn` callback rejects unknown emails. Deactivated users (`active: false`) and users in deactivated organisations are blocked at sign-in. Session is accessed on the server via `getServerSession(authOptions)` and on the client via `SessionProvider` in `components/providers/session-provider.tsx`.

**MFA/TOTP:** SUPER_ADMIN and ORG_ADMIN roles are required to enable TOTP MFA. Uses the `otpauth` library with `qrcode` for QR display. The middleware enforces MFA in three stages: (1) `mustChangePassword` -- redirect to `/change-password`, (2) `mfaPending` -- redirect to `/mfa-verify` for users with TOTP enabled who haven't verified yet this session, (3) admin roles without TOTP enabled -- redirect to `/mfa-setup` until configured. Login flow for MFA users: password check --> `mfaPending: true` in JWT --> redirect to `/mfa-verify` --> TOTP code submitted via second `signIn()` call with `totpCode` --> `mfaPending: false` --> session active.

**Multi-tenant organisations:** The `Organisation` model supports multi-tenancy. Each org has `allowedModuleIds` (which training modules its users can access) and `allowedRoles` (which roles can be assigned). Users belong to an organisation via `organisationId`. Org admins manage their own org's users, announcements, and reports at `/admin/*`. Super admins manage all organisations at `/super-admin/organisations`.

**Database:** Prisma ORM. Core models:
- `User`, `Child`, `Observation`, `TrainingProgress`, `AiInsight` -- original models for caregiving features
- `Account`, `Session`, `VerificationToken` -- NextAuth adapter tables
- `Organisation` -- multi-tenant org with `allowedModuleIds`, `allowedRoles`, `slug`
- `Announcement` -- org-scoped or global announcements with optional expiry
- `Module`, `Lesson`, `QuizQuestion` -- training content CMS (replaces hardcoded TS files)
- `PasswordResetToken` -- for forgot-password email flow

All child/observation data cascades on user delete. Module/Lesson/QuizQuestion cascade on parent delete. The Prisma singleton lives in `lib/prisma.ts`.

**Roles and RBAC:** Seven roles -- `SUPER_ADMIN`, `ORG_ADMIN`, `CAREGIVER`, `CAREER_DEV_OFFICER`, `STUDENT`, `INTERN`, `EMPLOYEE`. Role helpers live in `lib/rbac.ts`:
- `isSuperAdmin(session)` -- platform-wide admin
- `isOrgAdmin(session)` -- manages one organisation
- `isLeafRole(session)` -- any of the five end-user roles (CAREGIVER, CAREER_DEV_OFFICER, STUDENT, INTERN, EMPLOYEE)
- `isAdmin(session)` -- backwards-compat alias for `isSuperAdmin`
- `canAccessCareers(session)` -- CAREER_DEV_OFFICER only
- `canAccessCaregiving(session)` -- CAREGIVER only

Leaf role types are also exported from `types/index.ts` as `LEAF_ROLES`. Navigation is role-gated via three sidebars: `components/layout/super-admin-sidebar.tsx` (super admin), `components/layout/org-admin-sidebar.tsx` (org admin), `components/layout/sidebar.tsx` (leaf roles). The middleware enforces route access: SUPER_ADMIN and ORG_ADMIN cannot access leaf-role routes (`/dashboard`, `/training`, `/careers`, `/children`, `/reports`, `/settings`), and vice versa.

**Role home pages:** SUPER_ADMIN --> `/super-admin`, ORG_ADMIN --> `/admin`, all leaf roles --> `/dashboard`.

**Training content (database-driven):** Training content lives in `Module`, `Lesson`, and `QuizQuestion` database tables. Two module types: `ASD` (for caregivers) and `CAREERS` (for career dev officers). Data access layer at `lib/training-db.ts` provides two sets of queries: super-admin queries (include inactive records for editing) and user-facing queries (active records only). Super admins edit content via a WYSIWYG editor (`react-quill-new`) at `/super-admin/training` and can generate quiz questions with AI (Gemini). Seed training data with `npx tsx prisma/seed-training-content.ts`. Progress API is shared: `POST /api/training/progress` accepts any `moduleId`/`lessonId` combination. The `TrainingProgress` model tracks completion per user.

**Sidebar navigation by role:**
- SUPER_ADMIN: Overview, Organisations, Training Content, Announcements, Reports
- ORG_ADMIN: Users, Announcements, Reports
- CAREGIVER: Dashboard, ASD Training, Child Observations, Reports, Settings
- CAREER_DEV_OFFICER: Dashboard, Careers Training, Settings
- STUDENT / INTERN / EMPLOYEE: Dashboard, ASD Training, Careers Training, Settings

**AI layer:** `lib/gemini.ts` contains four functions that call `gemini-2.5-flash` via `@google/genai`. All prompts explicitly instruct the model never to diagnose or suggest autism. Full reports are persisted to the `AiInsight` table; the API route is `app/api/children/[childId]/insights/route.ts`. Gemini is also used for AI-generated quiz questions in the training CMS.

**Observations:** The three enums (`Domain`, `Frequency`, `Context`) are the vocabulary for logging behaviours. Behaviour lists per domain live in `lib/constants.ts`. Helper functions for aggregating observations are in `lib/observations.ts`. Charts on the reports page use Recharts.

## Known Issues / Deployment Notes

- **Vercel 500 on NextAuth routes:** If all `/api/auth/*` routes return 500 after deploy, check that `DATABASE_URL` uses the Neon pooler URL (port 6543) not the direct URL, and that `NEXTAUTH_URL` matches the deployed URL (`https://asd-training-app-v2.vercel.app`) with no trailing slash.
- **Prisma client not found on Vercel:** The build script runs `prisma generate && next build` to ensure the client is always regenerated -- do not separate these.
- **Schema changes:** Run `npx prisma db push` for quick iteration locally. Use `npx prisma migrate dev` if you need a tracked migration file.
- **Super admin panel:** Available at `/super-admin`, SUPER_ADMIN role only. Manages organisations, training content, announcements, and platform-wide reports.
- **Org admin panel:** Available at `/admin`, ORG_ADMIN role only. Manages users within their organisation, org-scoped announcements, and org reports.
- **SSO Azure AD config:** The Azure app registration must have `signInAudience: AzureADandPersonalMicrosoftAccount` in the manifest to support both personal Microsoft accounts and work/school accounts. Set this in Azure Portal --> App registrations --> Manifest editor.
- **SSO users must be pre-created:** SSO login rejects emails not already in the database. Admins must create user accounts first; SSO then links via `allowDangerousEmailAccountLinking`.
- **Forced password change:** Users with `mustChangePassword: true` are redirected to `/change-password` by middleware and cannot access any other route until they change their password.
- **MFA enforcement:** SUPER_ADMIN and ORG_ADMIN users without TOTP enabled are redirected to `/mfa-setup` by middleware and cannot access any other route until MFA is configured.
