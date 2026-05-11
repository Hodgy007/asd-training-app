# AAA Digital Platform — Technical Setup Guide

**Version 2.0 · 11 May 2026 · Ambitious about Autism**

Developer and DevOps reference for setup, deployment, and operation of the AAA Digital Platform.

> **Changes since v1.0:** Added Eventbrite cohort integration env vars, brand-asset upload notes, and an updated CSP table that reflects the May 2026 client-direct Blob upload changes. Removed the `ENABLE_OAUTH_SSO` env variable — OAuth is now toggled in the admin UI (`OAuthSsoConfig` table).

## 1. Architecture Overview

| Layer | Technology | Hosted at |
|---|---|---|
| Frontend & API | Next.js 14 App Router, TypeScript | Vercel (`asd-training-app-v2`) |
| Database | PostgreSQL, Prisma ORM | Neon (pooler port 6543) |
| Authentication | NextAuth v4 JWT sessions, TOTP MFA | In-app |
| File storage | Vercel Blob | Vercel |
| AI features | Vercel AI Gateway → Gemini / Claude / GPT | Vercel |
| Text-to-speech | ElevenLabs API (Lily voice, cached to Blob) | ElevenLabs |
| Email | Resend API (transactional) | Resend |
| Payments | Stripe (`ENABLE_PAYMENTS=false` in prod by default) | Stripe |
| Cohort import (optional) | Eventbrite | Eventbrite |

**Route groups:** `(auth)` → public login / register / reset; `(dashboard)` → leaf roles; `(org-admin)` → ORG_ADMIN; `(super-admin)` → SUPER_ADMIN / CHARITY_EMPLOYEE; `(mfa)` → MFA flow; `(change-password)` → forced change.

**Auth flow:** credentials / OAuth / SAML → JWT callback extends token (`id`, `role`, `organisationId`, `mustChangePassword`, `totpEnabled`, `mfaPending`, `hasPassword`, `effectivePrograms`, `charityPermissions`, `cvBuilderEnabled`, `careersAdvisorEnabled`, `isParentOrg`) → session callback → middleware checks role / MFA / password.

## 2. Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 18+ (20 LTS recommended) | Runtime |
| npm | 9+ | Package management |
| Git | Any recent version | Source control |
| Stripe CLI | Latest | Local webhook forwarding (optional) |
| Playwright | Installed via npm | E2E testing |

**External service accounts required:** Vercel, Neon, GitHub, Resend, ElevenLabs. **Optional:** Google Cloud (Google SSO), Azure AD (Microsoft SSO), Eventbrite (cohort import), Stripe (payments).

## 3. Repository Setup

```bash
git clone https://github.com/Hodgy007/asd-training-app.git
cd asd-training-app
npm install
```

| Script | Command | Purpose |
|---|---|---|
| `dev` | `npm run dev` | Start dev server on `localhost:3000` |
| `build` | `npm run build` | `prisma generate` + Vitest + `next build` |
| `test` | `npm run test` | Run Vitest unit tests |
| `test:e2e` | `npm run test:e2e` | Run Playwright E2E tests |
| `prisma:push` | `npm run prisma:push` | Push schema to database |
| `prisma:studio` | `npm run prisma:studio` | Open Prisma Studio |
| `prisma:seed` | `npm run prisma:seed` | Seed demo users |
| `prisma:generate` | `npm run prisma:generate` | Regenerate Prisma client after schema changes |
| `handover:build` | `npm run handover:build` | Rebuild all handover PDFs from markdown sources |

## 4. Key Directory Structure

| Path | Purpose |
|---|---|
| `app/(auth)/` | Login, register, forgot-password, reset-password, welcome, sso-complete (all public) |
| `app/(dashboard)/` | Leaf-role pages (dashboard, training, cv-builder, careers-advisor, jobs, etc.) |
| `app/(org-admin)/` | Org admin pages (`/admin/*`) |
| `app/(super-admin)/` | Super admin pages (`/super-admin/*`) |
| `app/(mfa)/` | MFA setup and verify pages |
| `app/api/` | All API route handlers |
| `components/` | Shared React components |
| `lib/` | Server-side utilities, AI runner, auth helpers, RBAC, rate limit, sanitisers |
| `prisma/` | `schema.prisma`, `seed.ts` |
| `types/` | TypeScript type extensions (session, next-auth) |
| `middleware.ts` | Route protection, MFA enforcement, role redirects |
| `public/` | Static assets (logo, favicon) |
| `docs/guides/` | User-facing markdown guides (source of truth for handover PDFs) |
| `docs/handover/` | Handover PDFs + their markdown sources + build tooling |
| `scripts/` | Build/maintenance scripts (e.g. `build-handover-pdfs.mjs`) |

## 5. Environment Variables

> **Critical:** `DATABASE_URL` must use the Neon **pooler** URL (port 6543) in production. Using the direct URL (port 5432) will exhaust connection limits on serverless.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Neon pooler — port 6543 with `?pgbouncer=true` |
| `DIRECT_URL` | Yes | Neon direct — port 5432, Prisma migrations only |
| `NEXTAUTH_SECRET` | Yes | 32+ char random secret: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes | Production URL, no trailing slash |
| `AI_GATEWAY_API_KEY` | Yes | Vercel AI Gateway key (multi-provider AI) |
| `RESEND_API_KEY` | Yes | Transactional email |
| `BLOB_READ_WRITE_TOKEN` | Yes | Vercel Blob file storage |
| `ELEVENLABS_API_KEY` | Yes | Text-to-speech (Lily voice) |
| `EMAIL_LOGO_URL` | Optional | Override AAA logo URL in transactional emails |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth button hidden if absent |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth client secret |
| `AZURE_AD_CLIENT_ID` | Optional | Microsoft OAuth button hidden if absent |
| `AZURE_AD_CLIENT_SECRET` | Optional | Azure AD OAuth client secret |
| `AZURE_AD_TENANT_ID` | Optional | Use `common` for all account types |
| `DISABLE_MFA` | Optional | Set `true` to skip MFA enforcement (dev only) |
| `ENABLE_PAYMENTS` | Optional | Set `true` to expose `/courses` and Stripe checkout |
| `STRIPE_SECRET_KEY` | Payments | Stripe secret key (`sk_test_…` / `sk_live_…`) |
| `STRIPE_PUBLISHABLE_KEY` | Payments | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Payments | Stripe webhook signing secret (`whsec_…`) |

> **Note:** The `ENABLE_OAUTH_SSO` env variable was removed in May 2026. OAuth providers are now toggled per-environment by a Charity Admin in `/super-admin/settings/sso` (DB-backed `OAuthSsoConfig`). Setting `GOOGLE_CLIENT_ID` / `AZURE_AD_CLIENT_ID` makes the providers *available*; flipping the admin toggle makes them *active*.

Eventbrite credentials are configured per-organisation in the admin UI rather than via env vars — see `/super-admin/settings/eventbrite`.

```bash
# Pull env vars from Vercel (dev branch):
npx vercel env pull .env.local

# Pull production env vars:
npx vercel env pull .env.production --environment production --yes
```

## 6. Database Setup (Neon)

Two Neon branches are in use: **main** (production, endpoint `ep-blue-thunder-a88kb0cy`) and **dev** (development, endpoint `ep-lucky-cherry-a8toqlw5`). Local dev pulls the dev branch env vars via `npx vercel env pull .env.local`.

```bash
# Push schema changes to dev database:
npm run prisma:push

# Push schema to PRODUCTION:
npx dotenv-cli -e .env.production -- npx prisma db push

# Seed demo users:
npm run prisma:seed

# Seed training content:
npx tsx prisma/seed-training-content.ts
```

> **Warn:** Always push schema to **BOTH** dev AND production when adding columns that are queried at runtime. Production will crash if it references a missing column.

**Prisma accessor gotchas:**
- The CV model accessor is `prisma.cV` (not `prisma.cv`).
- Virtual classroom sessions use `prisma.classSession` (not `prisma.session` — that's the NextAuth Session table).

## 7. Local Development

```bash
npm run dev
# Server starts on http://localhost:3000

# Forward Stripe webhooks (separate terminal):
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**Demo credentials** (seeded by `npm run prisma:seed`):

| Role | Email | Password |
|---|---|---|
| SUPER_ADMIN | `admin@asdawareness.org.uk` | `admin123` |
| EMPLOYEE | `demo@example.com` | `demo123` |

> **Warn:** The dev Neon branch may be paused after inactivity. If login fails with a database connection error, wake the branch up in the Neon console.

## 8. Testing

```bash
npm run test       # Vitest unit tests
npm run test:e2e   # Playwright E2E tests
npm run build      # Build (runs tests — failing test blocks deploy)
```

| Test type | Location | What is tested |
|---|---|---|
| Vitest unit | `lib/__tests__/` and `app/api/.../__tests__/` | RBAC helpers, permission counts, job visibility logic, SCORM progress mapping, AI runner sentinels |
| Playwright E2E | `playwright-report/` | Full browser flows — login, training, admin |
| Build gate | `npm run build` | Vitest runs before `next build` — failure blocks deploy |

> **Warn:** Do NOT use `isomorphic-dompurify` or `jsdom` at runtime — they break on Vercel serverless. `jsdom` is a `devDependency` only (Vitest env). Use `sanitize-html` for HTML sanitisation.

## 9. Deployment (Vercel)

Vercel GitHub integration auto-deploys on push to `main`. Preview deployments are created for all branches.

```bash
# Deploy to production via git (preferred):
git push origin main

# Manual deploy (only if no git push was made):
npx vercel deploy --prod
```

> **Info:** Never run `vercel deploy --prod` after a git push — Vercel auto-deploys from GitHub and a manual deploy creates a duplicate build.

| Step | Action |
|---|---|
| 1 | Vercel detects push to `main` |
| 2 | Runs build command: `prisma generate && cross-env NODE_ENV=test vitest run && next build` |
| 3 | Deploys to production URL: `https://asd-training-app-v2.vercel.app` |
| 4 | Preview URL available for branch deploys |

## 10. Content Security Policy

CSP is configured in `next.config.js` headers. Key directives that require explicit values:

| Directive | Required values | Reason |
|---|---|---|
| `connect-src` | `vercel.com`, `blob.vercel-storage.com`, `*.public.blob.vercel-storage.com` | Client-direct Blob uploads (SCORM packages, brand-asset zips) |
| `media-src` | `blob:` | TTS audio playback |
| `frame-src` | `blob:` | SCORM iframe content |
| `script-src` | `self`, `unsafe-eval` (dev only) | Next.js HMR |
| `font-src` | `fonts.gstatic.com` | Google Fonts |

> **Warn:** SCORM iframe sandbox requires `allow-same-origin`. Removing it causes subresource requests to 401. Do not attempt to harden without a signed-URL scheme. (History: tried it, broke playback, reverted in commit `c317351`.)

## 11. Key Architectural Decisions

**No PrismaAdapter.** NextAuth uses JWT sessions (not database sessions) with manual SSO account linking in the `signIn` callback. This avoids `OAuthAccountNotLinked` errors and simplifies the auth flow.

**`sanitize-html`, not DOMPurify.** `isomorphic-dompurify` requires `jsdom` which breaks on Vercel serverless. `sanitize-html` is a pure-Node sanitiser with no browser dependencies.

**SCORM buffering.** The SCORM asset route (`/api/scorm/[lessonId]/[...path]`) buffers binary bodies before responding. Streaming corrupts media files — same issue as the TTS route.

**TTS streaming, not redirect.** The `/api/tts` route streams MP3 bytes directly rather than redirecting to Blob. This allows magic-byte validation and prevents browser cache collisions.

**Neon over Supabase.** Supabase was IPv6-only — incompatible with Vercel Lambda which uses IPv4. Neon supports both. Migration was completed in May 2026.

**`scorm-again` v3.** Handles both SCORM 1.2 (`window.API`) and SCORM 2004 (`window.API_1484_11`). Version 3 supports concurrent requests and improved CMI state management.

**`prisma.cV`, not `prisma.cv`.** Prisma generates accessors from model names. The CV model is named "CV" (uppercase) so the accessor is `prisma.cV`. Similarly `ClassSession` avoids collision with NextAuth `Session`.

**OAuth toggled in DB, not env.** `OAuthSsoConfig` lets Charity Admins flip Google / Microsoft on per-environment without a redeploy. Replaces the old `ENABLE_OAUTH_SSO` env flag (removed May 2026).

**Auth-gated proxy routes for documents.** Library, training, and job document URLs are never linked directly to Vercel Blob — every request goes through `/api/library/documents/[docId]/file`, `/api/scorm/[lessonId]/[...path]`, or `/api/jobs/[jobId]/attachments/[attachmentId]/file`. Lets us enforce per-user entitlement, rate-limit, and audit access.

## 12. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| All `/api/auth/*` return 500 | Wrong `DATABASE_URL` (direct, not pooler) | Use Neon pooler URL port 6543 |
| Prisma client not found on Vercel | Client not regenerated before build | Build script must run `prisma generate` first |
| Login fails locally | Dev Neon branch paused | Wake branch in Neon console |
| Google SSO fails | Wrong redirect URI | Check Google Cloud Console → Credentials |
| Microsoft SSO fails | Wrong redirect URI or tenant | Check Azure Portal → App registrations |
| OAuth button missing from login page | Provider credentials set but admin toggle off | Sign in as Charity Admin → Settings → SSO → flip toggle |
| SCORM audio/video corrupted | Streaming not buffering | Ensure route buffers full body before response |
| TTS returns 200 but no audio | Non-MP3 response from ElevenLabs | Check `ELEVENLABS_API_KEY`; inspect magic bytes |
| Welcome email never arrives | Resend domain not verified, or sender domain mismatch | Verify domain in Resend → Domains; check `lib/email-templates/layout.ts` From address |
| Build fails — test error | Vitest runs in build | Fix failing unit test before deploying |
| MFA redirect loop | TOTP not enrolled | Log in as admin, go to `/mfa-setup`, complete setup |
| Brand asset upload 413 / CSP block | CSP missing Blob hosts | Verify `connect-src` includes `vercel.com` + `*.public.blob.vercel-storage.com` |
| Self-registration form blocked | Rate limit (5 / 15 min / IP) | Wait or use a different IP |
