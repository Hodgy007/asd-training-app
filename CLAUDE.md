# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Start local dev server (localhost:3000)
npm run build            # prisma generate + next build
npm run prisma:generate  # Regenerate Prisma client after schema changes
npm run prisma:push      # Push schema changes to the database (no migration file)
npm run prisma:seed      # Seed training content + demo user (tsx prisma/seed.ts)
npm run prisma:studio    # Open Prisma Studio (visual DB browser)
```

There is no test suite. Linting is via TypeScript (`tsc --noEmit`).

## Environment Variables

Copy `.env.example` to `.env.local` for local dev. For production (Vercel), the following env vars are required:

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Neon **pooler** — port **6543** with `?pgbouncer=true` |
| `DIRECT_URL` | Neon **direct** — port **5432** (Prisma migrations only) |
| `NEXTAUTH_SECRET` | JWT signing secret (32+ random chars) |
| `NEXTAUTH_URL` | `https://asd-training-app-v2.vercel.app` — no trailing slash |
| `GEMINI_API_KEY` | Google Gemini API key |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (optional — disables Google SSO if absent) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `AZURE_AD_CLIENT_ID` | Azure AD app client ID (optional — disables Microsoft SSO if absent) |
| `AZURE_AD_CLIENT_SECRET` | Azure AD client secret |
| `AZURE_AD_TENANT_ID` | Use `common` for personal + work accounts; or your tenant ID |

**Critical:** `DATABASE_URL` must use the Neon pooler (port 6543) in production. Using the direct connection (5432) exhausts connection limits on serverless. `DIRECT_URL` is used only by Prisma for migrations.

## Architecture

Next.js 14 App Router app. TypeScript throughout. Deployed to Vercel (`asd-training-app-v2`); database is PostgreSQL via **Neon** (migrated from Supabase — Supabase was IPv6-only, incompatible with Vercel Lambda); AI is Google Gemini.

**Route groups:**
- `app/(auth)/` — login and register pages, no auth required
- `app/(dashboard)/` — all authenticated pages, wrapped by `app/(dashboard)/layout.tsx` which renders the sidebar + topbar shell
- `app/api/` — all API routes; auth state is checked via `getServerSession(authOptions)` at the top of each handler

**Authentication:** NextAuth v4 with `CredentialsProvider` (email + bcrypt password) plus `GoogleProvider` and `AzureADProvider` for SSO. Uses `strategy: 'jwt'` (JWT sessions, not database sessions). `PrismaAdapter` is still configured — it is required for SSO `Account` record linking even though sessions are JWT. The JWT callback extends the token with `id` and `role`; the session callback surfaces those onto `session.user`. The `signIn` callback manually upserts new SSO users with role `CAREGIVER`; SSO users get `password: ''` (empty string — the field is non-nullable). Deactivated users (`active: false`) are blocked at sign-in. Session is accessed on the server via `getServerSession(authOptions)` and on the client via `SessionProvider` in `components/providers/session-provider.tsx`.

**Database:** Prisma ORM with five core models — `User`, `Child`, `Observation`, `TrainingProgress`, `AiInsight` — plus the three NextAuth adapter tables (`Account`, `Session`, `VerificationToken`). All child/observation data cascades on user delete. The Prisma singleton lives in `lib/prisma.ts`.

**AI layer:** `lib/gemini.ts` contains four functions that call `gemini-1.5-flash`. All prompts explicitly instruct the model never to diagnose or suggest autism. Full reports are persisted to the `AiInsight` table; the API route is `app/api/children/[childId]/insights/route.ts`.

**Roles and RBAC:** Three roles — `CAREGIVER`, `CAREER_DEV_OFFICER`, `ADMIN`. Users self-select role at registration (admin role cannot be self-assigned). Role helpers live in `lib/rbac.ts` (`hasRole`, `isAdmin`, `canAccessCareers`, `canAccessCaregiving`). Navigation is role-gated in `components/layout/sidebar.tsx`. Route pages check access via `canAccessCareers(session)` / `canAccessCaregiving(session)` and redirect to `/dashboard` if unauthorised.

**Training content:** Two separate training areas, both using the same `TrainingProgress` model for progress tracking:
- `lib/training-data.ts` — ASD awareness training for caregivers (5 modules). Module IDs: `module-1` … `module-5`.
- `lib/careers-training-data.ts` — Careers professional CPD for `CAREER_DEV_OFFICER`/`ADMIN` (4 modules). Module IDs: `careers-module-1` … `careers-module-4`. Lesson IDs are prefixed `careers-`. This prefix is used to filter careers progress separately in the careers hub page.

Progress API is shared: `POST /api/training/progress` accepts any `moduleId`/`lessonId` combination.

**Observations:** The three enums (`Domain`, `Frequency`, `Context`) are the vocabulary for logging behaviours. Behaviour lists per domain live in `lib/constants.ts`. Helper functions for aggregating observations are in `lib/observations.ts`. Charts on the reports page use Recharts.

## Known Issues / Deployment Notes

- **Vercel 500 on NextAuth routes:** If all `/api/auth/*` routes return 500 after deploy, check that `DATABASE_URL` uses the Neon pooler URL (port 6543) not the direct URL, and that `NEXTAUTH_URL` matches the deployed URL (`https://asd-training-app-v2.vercel.app`) with no trailing slash.
- **Prisma client not found on Vercel:** The build script runs `prisma generate && next build` to ensure the client is always regenerated — do not separate these.
- **Schema changes:** Run `npx prisma db push` for quick iteration locally. Use `npx prisma migrate dev` if you need a tracked migration file. After adding `CAREER_DEV_OFFICER` to the `Role` enum and `active` to `User`, run `npx prisma db push` before testing.
- **Admin panel:** Available at `/admin`, ADMIN role only. Inline role changes and deactivation happen via `PATCH /api/admin/users/[userId]`. Hard delete via `DELETE /api/admin/users/[userId]`. Admins cannot modify or delete their own account via the panel.
- **SSO Azure AD config:** The Azure app registration must have `signInAudience: AzureADandPersonalMicrosoftAccount` in the manifest to support both personal Microsoft accounts and work/school accounts. Set this in Azure Portal → App registrations → Manifest editor.
