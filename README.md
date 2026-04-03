# ASD Early Identification Training App

Next.js 14 SaaS platform for ASD early identification training, child observation tracking, and careers support. Includes an AI-powered CV Builder and AI Careers Advisor for autistic young people.

**Live URL:** https://asd-training-app-v2.vercel.app
**Repo:** https://github.com/Hodgy007/asd-training-app
**Stack:** Next.js 14 · TypeScript · Prisma · PostgreSQL (Neon) · NextAuth v4 · Google Gemini AI · Tailwind CSS

### Key Features
- **Training modules** — ASD awareness and Careers CPD training with quizzes
- **Child observations** — behavioural tracking with AI-generated insights (practitioners)
- **CV Builder** — 8-step autism-friendly wizard with AI writing assistance, PDF + Word export, 3 templates (Accessible/Modern/Classic), career professional student view, CV stats in admin reports
- **AI Careers Advisor** — guided Q&A wizard (6 core + 4 optional questions) generates personalised careers reports via Gemini AI, with PDF export, career professional student view, and admin reports integration
- **Document library** — file sharing with Vercel Blob storage
- **Virtual workshops** — Zoom/Teams integration with attendance tracking
- **Surveys** — targeted questionnaires with AI-generated insights
- **Multi-tenant** — organisation-scoped users, content, and reports
- **8 roles** — Charity Admin, Charity Employee, Org Admin, Practitioner, Careers Professional, Student, Intern, Employee
- **SSO** — Google, Azure AD, per-org SAML
- **MFA** — TOTP enforcement for admin roles

---

## Environment Variables (Vercel)

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Neon **pooler** — port **6543** with `?pgbouncer=true` |
| `DIRECT_URL` | Neon **direct** — port **5432** (Prisma migrations only) |
| `NEXTAUTH_SECRET` | JWT signing secret (32+ random chars) |
| `NEXTAUTH_URL` | `https://asd-training-app-v2.vercel.app` (no trailing slash) |
| `GEMINI_API_KEY` | Google Gemini API key (AI insights, quiz gen, CV writing) |
| `RESEND_API_KEY` | Resend API key (forgot-password emails) |
| `GOOGLE_CLIENT_ID` | Google OAuth (optional) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| `AZURE_AD_CLIENT_ID` | Azure AD (optional) |
| `AZURE_AD_CLIENT_SECRET` | Azure AD secret |
| `AZURE_AD_TENANT_ID` | `common` or specific tenant ID |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob (document uploads, AI thumbnails) |

---

## Deployment Troubleshooting Log

### Issue 1 — Prisma Client not generated (resolved — commit `4b3d1df`)
**Error:** `PrismaClientInitializationError` during Vercel build — Prisma auto-generation not triggered due to Vercel dependency caching.
**Fix:** Added `prisma generate &&` before `next build` in `package.json` build script.

### Issue 2 — 500 on all NextAuth routes after deploy (in progress — session: 2026-03-19)
**Symptom:** App returns 500 on `/`, `/api/auth/session`, `/api/auth/providers`. Login page (`/login`) loads fine (200). No errors visible in Vercel build logs.
**Root cause identified:** `DATABASE_URL` was using Supabase direct connection (port 5432). Vercel serverless functions open a new DB connection per request, exhausting Supabase free-tier connection limits.
**Fix applied (commit `2cebaf6`):** Updated `prisma/schema.prisma` to add `directUrl = env("DIRECT_URL")`. Updated `DATABASE_URL` in Vercel to use pooler (port 6543 + `?pgbouncer=true`). Added `DIRECT_URL` env var pointing to port 5432.
**Status:** Vercel redeploy needed with new env vars applied. If still 500 after redeploy, check **Vercel → Deployments → latest → Functions tab** for runtime error detail.
**Next step if still failing:** Check `NEXTAUTH_URL` has no trailing slash in Vercel env vars, then inspect Vercel function logs for the exact runtime exception.

---

## Key Directories

```
app/(dashboard)/cv-builder/     # CV Builder pages (wizard, preview, student view)
app/(dashboard)/careers-advisor/ # AI Careers Advisor pages (wizard, student view)
app/(dashboard)/training/       # Training module pages
app/(dashboard)/children/       # Child observation pages (practitioners only)
app/(super-admin)/              # Charity admin pages
app/(org-admin)/                # Org admin pages
app/api/cv-builder/             # CV Builder API (CRUD, AI, PDF, DOCX, students)
app/api/careers-advisor/        # Careers Advisor API (sessions, AI report, PDF, students)
app/api/children/               # Children + observations + AI insights API
app/api/training/               # Training progress API
components/cv-builder/          # CV Builder components (wizard, steps, shared)
components/careers-advisor/     # Careers Advisor components (wizard, steps, pill selector)
lib/cv-ai.ts                    # CV AI functions (statement, rephrase, skills, improve)
lib/careers-advisor-ai.ts       # Careers Advisor AI report generation
lib/careers-advisor-pdf.tsx     # Careers Advisor PDF template
lib/cv-templates/               # CV PDF templates (accessible, modern, classic)
lib/gemini.ts                   # Observation AI functions
lib/rbac.ts                     # Role-based access control helpers
prisma/schema.prisma            # All database models (28+)
```

### AI Integration
Uses `gemini-2.5-flash` via `@google/genai`. Three AI modules:
- **`lib/gemini.ts`** — observation insights (summary, patterns, guidance, full report). All prompts: never diagnose, never suggest autism.
- **`lib/cv-ai.ts`** — CV writing assistance (personal statements, bullet point rephrasing, skill suggestions, description improvement). All prompts: strength-focused, UK English, never mention disabilities.
- **`lib/careers-advisor-ai.ts`** — personalised careers report generation from questionnaire answers (strengths, career suggestions, next steps, workplace support). All prompts: strength-focused, UK English, UK-specific resources, never mention autism/disability.

---

## Local Development

```bash
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed
npm run dev
```
