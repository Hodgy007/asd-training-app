# AAA Digital Platform — Handover Plan

**Version 2.0 · 11 May 2026 · Confidential — Ambitious about Autism**

Complete handover guide for transferring ownership of the AAA Digital Platform from the development team to Ambitious about Autism, including service-account transfer, go-live checklist, and operational handoff steps.

This document is regenerated from markdown via `npm run handover:build` — see `docs/handover/README.md` for the build process.

> **Changes since v1.0 (May 2026):** Removed the "child profiles" reference from §1 (feature was deleted in commit `8968cf0`). Updated cost estimates and env var table to reflect current platform features (cohorts, brand assets, integration API).

## 1. System Overview

The AAA Digital Platform is a Next.js 14 training application for Ambitious about Autism, deployed on Vercel with a PostgreSQL database hosted on Neon. It delivers training to the charity's own staff and to external organisations — schools, colleges, universities and employers — alongside virtual classroom workshops, a document library, a two-tier job board and aggregate impact reporting. AI features run through the Vercel AI Gateway (Gemini / Claude / GPT); text-to-speech via ElevenLabs; transactional email via Resend; optional payments via Stripe. Authentication uses NextAuth v4 with JWT sessions, supporting email/password, OAuth (Google + Microsoft Azure AD), and per-org SAML SSO.

| Component | Technology | Hosted at |
|---|---|---|
| Frontend & API | Next.js 14 / TypeScript | Vercel (`asd-training-app-v2`) |
| Database | PostgreSQL via Prisma ORM | Neon (pooler port 6543) |
| Authentication | NextAuth v4 JWT sessions | In-app (no external auth service) |
| File storage | Vercel Blob | Vercel |
| AI features | Vercel AI Gateway → Gemini / Claude / GPT | Vercel |
| Text-to-speech | ElevenLabs API (Lily voice) | ElevenLabs |
| Email | Resend API | Resend |
| Payments | Stripe (gated by `ENABLE_PAYMENTS`) | Stripe |
| Cohort import (optional) | Eventbrite | Eventbrite |

## 2. Service Accounts — What Must Be Transferred

All credentials listed below are currently owned by the developer. **The charity must create their own accounts and replace every credential before going live.**

| Service | Action required | Where |
|---|---|---|
| Vercel | Create Pro account → import GitHub repo | `vercel.com` |
| Neon | Create account → create project → copy connection strings | `neon.tech` |
| GitHub | Transfer repo ownership or fork | `github.com` |
| Google Cloud | Create OAuth 2.0 client for Google sign-in (optional) | `console.cloud.google.com` |
| Microsoft Azure | Register app for Microsoft SSO (optional) | `portal.azure.com` |
| Resend | Create account → verify domain → get API key | `resend.com` |
| ElevenLabs | Create account → get API key | `elevenlabs.io` |
| Eventbrite | Create OAuth app (only if using cohort import) | `eventbrite.com` |
| Stripe | Create account (charity discount available; only if enabling payments) | `stripe.com` |

## 3. Credentials to Replace in Vercel

All environment variables live in Vercel → Project → Settings → Environment Variables. Update each variable for the **Production** environment, then trigger a new deployment.

See [§7 Environment Variables Reference](#7-environment-variables-reference) for the full list.

## 4. Handover Checklist

| Phase | Task | Status |
|---|---|---|
| **Phase 1 — Accounts** | Create Vercel account | ☐ |
| | Create Neon account | ☐ |
| | Fork/transfer GitHub repo | ☐ |
| | Create Resend account + verify domain | ☐ |
| | Create ElevenLabs account | ☐ |
| **Phase 2 — Database** | Create Neon project | ☐ |
| | Copy pooler URL (`DATABASE_URL`) | ☐ |
| | Copy direct URL (`DIRECT_URL`) | ☐ |
| | Run: `npx prisma db push` | ☐ |
| **Phase 3 — Auth** | Generate `NEXTAUTH_SECRET` | ☐ |
| | Set `NEXTAUTH_URL` to production domain | ☐ |
| | (Optional) Create Google OAuth app + add redirect URI | ☐ |
| | (Optional) Create Azure AD app + add redirect URI | ☐ |
| **Phase 4 — Env vars** | Add all env vars to Vercel Production environment | ☐ |
| | Pull to local: `npx vercel env pull .env.local` | ☐ |
| **Phase 5 — Deploy** | Push code to GitHub | ☐ |
| | Verify Vercel auto-deploy succeeds | ☐ |
| | Test login (email + Google + Microsoft) | ☐ |
| **Phase 6 — Content** | Log in as Charity Admin | ☐ |
| | Create first real organisation | ☐ |
| | Add first org admin user | ☐ |
| | Seed training content if needed | ☐ |
| | Upload initial brand assets | ☐ |
| | Configure AI prompt registry (review tone & model per prompt) | ☐ |
| **Phase 7 — Compliance** | Confirm ICO registration number is set on `/privacy` | ☐ |
| | Accept DPAs with Vercel, Neon, Resend, ElevenLabs | ☐ |
| | Verify upstream LLM providers covered by Vercel sub-processor list | ☐ |
| **Phase 8 — Handover** | Remove developer's personal credentials | ☐ |
| | Test full user journey end-to-end | ☐ |
| | Document any customisations | ☐ |

## 5. Microsoft SSO Setup

| # | Step | Details |
|---|---|---|
| 1 | Go to Azure Portal | Navigate to `portal.azure.com` and sign in with your Microsoft account. |
| 2 | Open App registrations | Search "App registrations" in the top search bar and click it. |
| 3 | New registration | Click "+ New registration" at the top of the page. |
| 4 | Name the app | Enter a name such as "AAA Digital Platform". |
| 5 | Set account types | Select "Accounts in any organizational directory and personal Microsoft accounts". |
| 6 | Add redirect URI | Choose "Web" and enter `https://your-domain.vercel.app/api/auth/callback/azure-ad`. |
| 7 | Click Register | You will be taken to the app overview. |
| 8 | Copy Application (client) ID | This is your `AZURE_AD_CLIENT_ID`. |
| 9 | Copy Directory (tenant) ID | Use `common` in your env vars unless restricting to one tenant. |
| 10 | Create a client secret | Certificates & secrets → New client secret → set expiry → Add. |
| 11 | Copy the secret value | Copy the Value (NOT the ID) immediately — it's only shown once. This is `AZURE_AD_CLIENT_SECRET`. |
| 12 | Add to Vercel | Settings → Environment Variables → add `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID`. |
| 13 | Redeploy | Trigger a new deployment so the variables take effect. |
| 14 | Enable in admin UI | Sign in as Charity Admin → Settings → SSO → flip the "Microsoft" toggle on. The button will then appear on the login page. |

The redirect URI must exactly match what is set in Azure. If you use a custom domain, update the URI in Azure to match.

## 6. Google SSO Setup (Optional)

| # | Step | Details |
|---|---|---|
| 1 | Google Cloud Console | Go to `console.cloud.google.com` and sign in. |
| 2 | Create a project | Click the project dropdown → New Project → name it → Create. |
| 3 | OAuth consent screen | APIs & Services → OAuth consent screen → External → Create. |
| 4 | Fill consent screen | App name, support email, developer email. Save and Continue. |
| 5 | Create credentials | Credentials → + Create Credentials → OAuth client ID. |
| 6 | Application type | "Web application". |
| 7 | Add redirect URI | `https://your-domain.vercel.app/api/auth/callback/google`. |
| 8 | Copy credentials | Add as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Vercel. |
| 9 | Enable in admin UI | Sign in as Charity Admin → Settings → SSO → flip "Google" toggle on. |

## 7. Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Neon pooler connection string (port 6543, `pgbouncer=true`) |
| `DIRECT_URL` | Yes | Neon direct connection string (port 5432, migrations only) |
| `NEXTAUTH_SECRET` | Yes | 32+ character random string for JWT signing (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Yes | Full production URL with no trailing slash |
| `AI_GATEWAY_API_KEY` | Yes | Vercel AI Gateway key (multi-provider AI) |
| `RESEND_API_KEY` | Yes | Resend email API key for transactional emails |
| `ELEVENLABS_API_KEY` | Yes | ElevenLabs text-to-speech API key (Lily voice) |
| `BLOB_READ_WRITE_TOKEN` | Yes | Vercel Blob token for file uploads and document storage |
| `EMAIL_LOGO_URL` | No | Override AAA logo URL in transactional emails (defaults to deployment URL) |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID (login button hidden if absent) |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `AZURE_AD_CLIENT_ID` | No | Azure AD app client ID (login button hidden if absent) |
| `AZURE_AD_CLIENT_SECRET` | No | Azure AD app client secret |
| `AZURE_AD_TENANT_ID` | No | Use `common` for all accounts or specific tenant ID |
| `STRIPE_SECRET_KEY` | No | Stripe secret key (`sk_test_…` / `sk_live_…`) |
| `STRIPE_PUBLISHABLE_KEY` | No | Stripe publishable key (`pk_test_…` / `pk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook signing secret (`whsec_…`) |
| `STRIPE_SUBSCRIPTION_PRICE_YEARLY` | No | Stripe Price ID for yearly All-Access tier |
| `ENABLE_PAYMENTS` | No | Set to `true` to expose `/courses` and Stripe checkout (keep `false` until live) |
| `DISABLE_MFA` | No | Set to `true` to skip MFA enforcement (development only — not recommended in prod) |

## 8. DNS & Custom Domain

To point a custom domain (e.g. `education.ambitiousaboutautism.com`) at the platform:

| # | Step | Details |
|---|---|---|
| 1 | Add domain in Vercel | Vercel dashboard → Project → Settings → Domains → Add. Vercel provides the required DNS records. |
| 2 | Update DNS records | In your domain registrar's DNS panel, add the A record (or CNAME) shown by Vercel. Propagation can take up to 48 hours. |
| 3 | Update `NEXTAUTH_URL` | Change the env var to the new domain (no trailing slash). Redeploy. |
| 4 | Update Google redirect URI | Google Cloud Console → Credentials → your OAuth client → add new domain. |
| 5 | Update Azure redirect URI | Azure Portal → App registrations → your app → Authentication → update Redirect URI. |
| 6 | Verify SSL | Vercel provisions an SSL certificate automatically via Let's Encrypt. Check the domain in Vercel shows "Valid Configuration". |

## 9. Cost Breakdown

| Service | Free tier | Paid tier | Est. monthly |
|---|---|---|---|
| Vercel | Hobby (personal only — not for commercial/charity use) | Pro $20/mo | $20–40 |
| Neon | 0.5 GB storage, 1 project | Scale $19/mo | $0–19 |
| Resend | 3,000 emails/mo | $20/mo for 50k | $0–20 |
| ElevenLabs | 10k chars/mo | Starter $5/mo | $5–22 |
| Stripe | No monthly fee | 1.4% + 20p per transaction | Transaction fees only |
| Eventbrite (optional) | Free (API access free for orgs) | — | $0 |
| GitHub | Free for public repos | Free | $0 |
| Google OAuth | Free | Free | $0 |
| Azure AD | Free (basic) | Free for SSO | $0 |

For a charity running this at small scale (under 100 users, low email volume) the total monthly cost is likely **£0–£30**. Vercel Hobby is free but cannot be used for commercial/charity use — must be Pro.

## 10. Testing Checklist

| Test | Expected result |
|---|---|
| Email + password login | Redirects to `/dashboard` (leaf role) or `/super-admin` (Charity Admin) |
| Google SSO login (if enabled) | Redirects correctly; account linked / self-registration prompt |
| Microsoft SSO login (if enabled) | Redirects correctly; account linked / self-registration prompt |
| Self-registration (existing org) | Welcome email arrives; magic-link sign-in lands on dashboard |
| Self-registration (no org / public toolkit) | Same flow as above |
| Forgot-password email | Email arrives within 2 minutes; reset link works |
| Training module loads | Lesson content renders; TTS play button functions |
| Progress is saved | Completing a lesson updates progress; certificate shown |
| File upload (document library) | File uploads to Vercel Blob; appears in library via auth-gated proxy |
| Admin panel accessible | Charity Admin can view `/super-admin`; org admin can view `/admin` |
| MFA setup and verify | TOTP QR code scannable; 6-digit code accepted |
| Org admin creates a workshop | Session appears in `/sessions` for selected attendees |
| Quiz attempt records score | Score saved to `TrainingProgress`; quiz result shown |
| Report CSV export | Org admin can download report with correct data |
| Brand asset upload | Logo/banner uploaded to Vercel Blob; tagged with AI metadata |

## 11. Maintenance Guide

| Task | Frequency | How |
|---|---|---|
| Update dependencies | Monthly | `npm audit`; `npm update` |
| Review error logs | Weekly | Vercel → Functions → Logs |
| Database backups | Automatic | Neon handles backups (point-in-time restore) |
| Renew Azure secret | Every 1–2 years | Azure Portal → App → Certificates & secrets |
| Review user accounts | Quarterly | Super Admin panel → Users |
| Review charity employee permissions | Quarterly | Super Admin panel → Users → filter by `CHARITY_EMPLOYEE` |
| Regenerate handover PDFs | After material UI/feature change | `npm run handover:build` |
| Check Stripe payouts | As needed | Stripe dashboard (when payments enabled) |

## 12. Support & Resources

The developer (Simon Hodgson) is available for handover support. Contact via the project GitHub repository.

| Resource | URL |
|---|---|
| Platform (live) | `https://asd-training-app-v2.vercel.app` |
| GitHub repository | `https://github.com/Hodgy007/asd-training-app` |
| Vercel dashboard | `https://vercel.com/dashboard` |
| Neon dashboard | `https://console.neon.tech` |
| Resend dashboard | `https://resend.com/emails` |
| ElevenLabs dashboard | `https://elevenlabs.io/app` |
| NextAuth docs | `https://next-auth.js.org` |
| Prisma docs | `https://prisma.io/docs` |
| Ambitious about Autism | `https://ambitiousaboutautism.org.uk` |

## Appendix A — Going Live (Custom Domain · DNS · Email Authentication)

This appendix covers the steps to move the platform from the Vercel preview URL (`asd-training-app-v2.vercel.app`) to a production domain such as `education.ambitiousaboutautism.com`, and to authenticate the domain with Resend so that transactional emails are delivered reliably.

### A1. Setting up a custom domain on Vercel

#### Step 1 — Add the domain in Vercel

- Log in to `vercel.com` and open the `asd-training-app-v2` project.
- Go to Settings → Domains.
- Click Add Domain and enter the full domain (e.g. `education.ambitiousaboutautism.com`).
- Vercel will display the DNS record you need to create.

#### Step 2 — Create the DNS record at your registrar

Log in to the DNS management console for `ambitiousaboutautism.com` (commonly GoDaddy, Namecheap, Cloudflare, or the charity's IT provider). Add the record shown by Vercel:

| Type | Host | Value | TTL |
|---|---|---|---|
| CNAME | `education` | `cname.vercel-dns.com.` | 3600 |

The exact value shown by Vercel may differ — always copy it directly from the Vercel dashboard. DNS changes can take up to 48 hours to propagate.

#### Step 3 — Wait for Vercel to verify the domain

Return to the Vercel Domains page. Once the DNS record has propagated, the domain status will change from Pending to a green **Valid Configuration**. Vercel automatically provisions an SSL certificate via Let's Encrypt.

#### Step 4 — Update NEXTAUTH_URL (critical)

NextAuth uses `NEXTAUTH_URL` to build callback and redirect URLs. If this is not updated, all login attempts will fail after the domain switch.

- Settings → Environment Variables → find `NEXTAUTH_URL` → Edit.
- Change the value to the new domain (no trailing slash).
- Save, then redeploy.

> **Warning:** Do not update `NEXTAUTH_URL` until the domain is verified in Vercel and DNS is propagating — changing it too early will break logins on the old URL before the new one is working.

#### Step 5 — Update SSO callback URLs

If Google or Microsoft SSO is configured, their registered redirect URIs must be updated to include the new domain.

**Google OAuth:** Add `https://education.ambitiousaboutautism.com/api/auth/callback/google` to Authorised redirect URIs.

**Microsoft Azure AD:** Add `https://education.ambitiousaboutautism.com/api/auth/callback/azure-ad` to the app's Redirect URIs.

#### Step 6 — Smoke-test after the switch

| Test | Expected result |
|---|---|
| Home page loads | New domain shows the login page with a padlock (SSL) |
| Email/password login | Sign in lands on correct dashboard |
| Forgot password email | Reset link uses the new domain |
| Google SSO | Completes without redirect errors |
| Microsoft SSO | Completes without redirect errors |
| Old URL redirect | Add a redirect in Vercel Domains so the old URL sends users to the new one |

### A2. Email authentication — Resend DNS records

The platform sends transactional emails (welcome links, password resets, scheduled reports, invitations) via Resend. For these to be delivered reliably and not flagged as spam, the sending domain must be authenticated with **SPF**, **DKIM**, and **DMARC** DNS records.

> **Without these records, emails may be silently dropped into spam folders or rejected outright by recipient mail servers. This step is essential before the platform goes live with real users.**

#### Step 1 — Add your domain to Resend

- Log in to `resend.com` with the account holding the `RESEND_API_KEY` configured in Vercel.
- Domains → Add Domain.
- Enter `ambitiousaboutautism.com` (or whichever domain you want to send from).
- Select the region closest to your users (Europe is recommended for UK users).
- Resend will display a set of DNS records to add.

#### Step 2 — Add the DNS records at your registrar

The exact values are generated by Resend and unique to your account. The record types are always the same:

| Type | Host | Purpose | TTL |
|---|---|---|---|
| TXT | `resend._domainkey` | DKIM signing key | 3600 |
| TXT | `@` (or the domain) | SPF policy | 3600 |
| TXT | `_dmarc` | DMARC policy | 3600 |
| MX | `bounces` | Bounce notifications | 3600 |

**What each record does:**

- **DKIM** — adds a cryptographic signature to every outbound email, proving it came from your domain and was not tampered with.
- **SPF** — lists the mail servers authorised to send email on behalf of your domain.
- **DMARC** — tells receiving servers what to do when SPF or DKIM checks fail. Start with `p=none` to monitor before enforcing.
- **MX (bounces)** — routes bounce notifications back through Resend so they appear in the dashboard.

#### Step 3 — Verify the domain in Resend

After adding the DNS records, return to Resend → Domains → click **Verify**. If verification fails, wait 15–30 minutes for DNS to propagate and try again.

#### Step 4 — Send a test email

Trigger a Forgot Password for a test account. Inspect the email headers for `dkim=pass` and `spf=pass`.

#### DMARC policy progression (recommended)

| Phase | Policy | Behaviour |
|---|---|---|
| Week 1–4 | `p=none` | Monitor only. No emails blocked. |
| Month 2 | `p=quarantine` | Failed emails go to spam. Start blocking forgeries. |
| Month 3+ | `p=reject` | Failed emails are rejected outright. Full protection. |

> Once live, monitor the Resend dashboard weekly for bounce rates and spam complaints. A bounce rate above 5% or complaint rate above 0.1% can cause Resend to suspend the account.
