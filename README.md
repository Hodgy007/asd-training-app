# ASD Early Identification Training App

Next.js 14 web app for caregivers and early years practitioners to complete ASD awareness training, manage child profiles, log behavioural observations, and receive AI-generated insights.

**Live URL:** https://asd-training-app.vercel.app
**Repo:** https://github.com/Hodgy007/asd-training-app
**Stack:** Next.js 14 · TypeScript · Prisma · PostgreSQL (Supabase) · NextAuth v4 · Google Gemini AI · Tailwind CSS

---

## Environment Variables (Vercel)

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Supabase pooler — port **6543** with `?pgbouncer=true` |
| `DIRECT_URL` | Supabase direct — port **5432** (used by Prisma for migrations) |
| `NEXTAUTH_SECRET` | JWT signing secret |
| `NEXTAUTH_URL` | `https://asd-training-app.vercel.app` (no trailing slash) |
| `GEMINI_API_KEY` | Google Gemini API key |

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

## App Structure

```
asd-training-app/
├── app/
│   ├── page.tsx                          # Root — redirects to /dashboard or /login
│   ├── layout.tsx                        # Root layout
│   ├── (auth)/
│   │   ├── login/page.tsx               # Login form
│   │   └── register/page.tsx            # Registration form
│   ├── (dashboard)/
│   │   ├── layout.tsx                   # Dashboard shell — sidebar + topbar
│   │   ├── dashboard/page.tsx           # Main dashboard overview
│   │   ├── training/
│   │   │   ├── page.tsx                 # Training module listing
│   │   │   ├── [moduleId]/page.tsx      # Lesson listing for a module
│   │   │   └── [moduleId]/[lessonId]/page.tsx  # Lesson viewer + quiz
│   │   ├── children/
│   │   │   ├── page.tsx                 # Child profile listing
│   │   │   └── [childId]/page.tsx       # Child detail + observations + AI insights
│   │   └── reports/page.tsx             # Reports + Recharts visualisations
│   └── api/
│       ├── auth/[...nextauth]/route.ts  # NextAuth handler
│       ├── auth/register/route.ts       # User registration
│       ├── children/route.ts            # GET list / POST create child
│       ├── children/[childId]/route.ts  # GET / PATCH / DELETE child
│       ├── children/[childId]/observations/route.ts
│       ├── children/[childId]/observations/[observationId]/route.ts
│       ├── children/[childId]/insights/route.ts  # Triggers Gemini AI report
│       └── training/progress/route.ts
├── components/
│   ├── layout/sidebar.tsx + topbar.tsx
│   ├── training/module-card, video-player, quiz-component
│   ├── children/child-card, add-child-form, observation-form
│   ├── observations/observation-table, domain-chart, weekly-summary
│   ├── ai/insights-panel, generate-report-btn
│   ├── providers/session-provider.tsx   # NextAuth SessionProvider wrapper
│   └── ui/button, card, badge, progress, modal, disclaimer
├── lib/
│   ├── auth.ts                          # NextAuth options + PrismaAdapter
│   ├── prisma.ts                        # Prisma client singleton
│   ├── gemini.ts                        # Gemini AI functions (summary, patterns, guidance, report)
│   ├── constants.ts                     # Behaviour lists per domain
│   ├── observations.ts                  # Observation helpers
│   └── training-data.ts                 # Static training content
├── prisma/
│   ├── schema.prisma                    # DB models (User, Child, Observation, AiInsight, TrainingProgress)
│   └── seed.ts                          # Seeds training content + demo user
└── types/index.ts
```

### Database Models
- **User** — email, bcrypt password, name, role (CAREGIVER | ADMIN)
- **Child** — name, DOB, notes, linked to User
- **Observation** — behaviourType, domain, frequency, context, notes, linked to Child
- **TrainingProgress** — moduleId, lessonId, score, completed, linked to User
- **AiInsight** — summary, patterns, recommendations, disclaimer, linked to Child
- **Account / Session / VerificationToken** — NextAuth adapter tables

### AI Integration
Uses `gemini-1.5-flash`. Four functions in `lib/gemini.ts`:
1. `generateObservationSummary` — carer-friendly 2–3 sentence summary
2. `detectPatterns` — bulleted domain pattern list
3. `generateActionGuidance` — 3–4 practical next steps
4. `generateInsightReport` — full report saved to AiInsight table

All prompts explicitly instruct the model: **never diagnose, never suggest autism**.

---

## Local Development

```bash
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed
npm run dev
```
