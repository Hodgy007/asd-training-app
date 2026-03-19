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

## Local Development

```bash
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed
npm run dev
```
