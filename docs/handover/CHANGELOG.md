# Handover Documentation Changelog

The PDFs in this folder are **generated artefacts** — every PDF is built from a markdown source (see `README.md` for the source-to-PDF mapping). Edits should always go to the markdown, then a rebuild via `npm run handover:build`.

This changelog tracks what's changed since the last rebuild. When you regenerate the PDFs, you can clear entries that are now reflected in the freshly-built PDFs.

## 2026-05-16 — Integration Reports Guide added; AI usage caps; reports API v2

### What changed

**1. New handover PDF — Integration Reports Guide** ([PR #91](https://github.com/Hodgy007/asd-training-app/pull/91))

A new partner-facing guide for BI teams pulling platform data into Microsoft Excel, Power BI, and Microsoft Dynamics 365. Step-by-step recipes for Power Query, Power BI Desktop / Service, Power BI incremental refresh, Dynamics Custom Connector (from the platform's OpenAPI URL), and Power Automate flows. Includes a per-section data reference and full privacy notes on pseudonymisation. Source markdown at `docs/guides/integration-reports-guide.md`; PDF at `AAA_Integration_Reports_Guide.pdf`. The build script (`scripts/build-handover-pdfs.mjs`) now produces eight PDFs.

**2. Integration Reports API v2** ([PR #91](https://github.com/Hodgy007/asd-training-app/pull/91))

`/api/integrations/reports` was rewritten to be a usable BI source. Adds `?format=flat` (long-format rows with stable `rowId` primary keys for Dynamics Custom Connector mapping), `?since=<ISO>` incremental refresh on event-shaped sections, `?limit=` + `?cursor=` cursor pagination on surveys, weak `ETag` / `If-None-Match` 304s, two new sections (`cv`, `careers`), and a public OpenAPI 3.0 contract at `/api/integrations/reports/schema`. Two latent bugs fixed: training stats were including cohort orgs (mismatched the in-app super-admin reports), and `/api/integrations` wasn't in middleware `PUBLIC_PATHS` so unauthenticated Bearer calls were being redirected to `/login` before the route's own auth could run — external Power Automate / Dynamics clients were effectively broken before this fix.

**3. Daily per-user caps on AI endpoints** ([PR #91](https://github.com/Hodgy007/asd-training-app/pull/91))

Every AI endpoint now enforces a 24h sliding-window ceiling on top of the existing short-window burst limiter, so a stuck client or abusive loop can't run up the AI Gateway bill indefinitely. Caps: CV Builder AI 50/day, Careers Advisor 10/day, super-admin training generate 20/day, library doc generate 50/day, library collection generate 30/day. Daily-cap 429 responses include `code: 'DAILY_LIMIT'` so the client can show a "come back tomorrow" message.

### Affected PDFs

- `AAA_Integration_Reports_Guide.pdf` — **new**
- The other seven handover PDFs were not affected by this batch and have not been rebuilt. (The text about `/super-admin/integrations` key management was already in the Admin Guide.)

## 2026-05-11 — Handover pipeline + cohort, brand, library, sidebar changes

### What changed

This is a consolidation pass covering everything that shipped between 2026-05-10 (the last changelog entry) and 2026-05-11.

**1. Markdown source-of-truth + automated PDF build**

The PDFs are now generated from markdown via `npm run handover:build` (`scripts/build-handover-pdfs.mjs`). Every PDF has a markdown source in this folder or in `docs/guides/`. Styling lives in `docs/handover/_pdf-style.css`. See `docs/handover/README.md` for the full source-to-PDF mapping.

The five PDFs that previously had no markdown source — Data Dictionary, Technical Setup Guide, Self-Registration Flow, Handover Plan, Training Materials — now have markdown sources alongside them in `docs/handover/`. They were reconstructed from the PDF content and updated to reflect the current platform.

**2. Cohorts — Eventbrite as an attendee source** ([PR #81](https://github.com/Hodgy007/asd-training-app/pull/81))

A new cohort import path: Charity Admins can connect the charity's Eventbrite account once in **Settings → Eventbrite**, then on any cohort's Members tab use **Import from Eventbrite** to pull an event's attendee list directly into a cohort. The import is dedup-safe — re-running it picks up only new attendees. Backed by the new `CohortEventbriteEvent` model.

**3. Cohorts as a workshop attendee group** ([PR #71](https://github.com/Hodgy007/asd-training-app/pull/71))

Charity-level workshop creation now exposes **Cohorts** as a first-class attendee group alongside Organisations and individual users. The previous "by role" dimension was dropped (admins were already always inviting specific people). Clicking **Create Workshop** on a cohort detail page (`/super-admin/cohorts/[id]`) navigates with `?cohortId=<id>` and the new-workshop page seeds the picker.

**4. Library — list view, tile sizing, per-document feedback** ([PR #76](https://github.com/Hodgy007/asd-training-app/pull/76), [PR #79](https://github.com/Hodgy007/asd-training-app/pull/79))

The collection list page has three view modes — **List**, **Small tiles**, and **Large tiles**. Per-document feedback (thumbs-up / thumbs-down + comment) is enabled per document; results aggregate in the library reports. AI Assist is available in the inline edit panel on the list page.

**5. Sidebar collapse** ([PR #76](https://github.com/Hodgy007/asd-training-app/pull/76), [PR #78](https://github.com/Hodgy007/asd-training-app/pull/78))

Both the Charity Admin and Org Admin sidebars now have a **collapse toggle** at the top — useful on smaller laptops or for side-by-side workflows. The narrow rail keeps the icons but hides the labels.

**6. Brand Asset Store** ([PR #80](https://github.com/Hodgy007/asd-training-app/pull/80) and earlier commits)

A new **Brand Store** under Charity Admin holds the charity's logos, banners, icons, and illustrations. Two upload modes: single file or bulk-zip with auto-classification by filename + image dimensions, plus one-click move between types. AI banner generation and AI library thumbnails can use the Brand Store as context — tick "Use brand store as context" in the banner-generation modal. Backed by the new `BrandAsset` model.

**7. Compliance documents refreshed** ([PR #83](https://github.com/Hodgy007/asd-training-app/pull/83))

`docs/compliance/ROPA.md`, `DPIA.md`, and `AADC.md` rewritten to v2.0 after the child-observations removal. v1.0 of all three described the removed feature. Not user-facing, but mentioned here because the compliance pack is part of the handover deliverable.

### Affected handover PDFs (regenerated)

| Document | What changed |
| --- | --- |
| `AAA_Admin_Guide.pdf` | Super admin guide: sidebar nav updated; SSO toggle copy fixed; Practitioner role description fixed; new Cohorts > Eventbrite import section; Library section updated for list view + per-doc feedback; new **§17 Brand Asset Store**. Org admin guide: sidebar collapse toggle mentioned; Library section updated. |
| `AAA_User_Guide.pdf` | No content changes; rebuilt to reflect upstream markdown polish. |
| `AAA_Data_Dictionary.pdf` | Rewritten to v3.0. Added Cohort / CohortMembership / CohortEventbriteEvent / BrandAsset / OAuthSsoConfig / LibrarySection / SamlAuthnRequest / Toolkit models. Flagged `pendingApproval` columns as deprecated. |
| `AAA_Technical_Setup_Guide.pdf` | Rewritten to v2.0. Removed `ENABLE_OAUTH_SSO` env var; added Eventbrite + brand-asset notes; updated CSP table; troubleshooting expanded. |
| `AAA_Self_Registration_Flow.pdf` | Fully rewritten to v2.0. Describes the live magic-link + welcome-email flow, no admin approval gate, OAuth completion path. |
| `AAA_Digital_Platform_Handover_Plan.pdf` | Updated to v2.0. Removed child-profile mention; added Eventbrite to service list; updated env var table; added compliance phase to handover checklist. |
| `AAA_Training_Materials.pdf` | Updated to v2.0. Fixed the "self-registration disabled" FAQ. Added Charity Employee onboarding checklist. Added FAQs on cohorts and brand assets. |

### Up-to-date sources

- `CLAUDE.md` — canonical engineering reference.
- `docs/guides/super-admin-guide.md` / `org-admin-guide.md` / `caregiver-guide.md` / `careers-professional-guide.md` — role guides.
- `docs/handover/data-dictionary.md` / `handover-plan.md` / `self-registration-flow.md` / `technical-setup-guide.md` / `training-materials.md` — handover-only sources.
- `docs/handover/README.md` — build process + source-to-PDF mapping.
- `docs/compliance/ROPA.md` / `DPIA.md` / `AADC.md` — compliance pack.

---

## 2026-05-10 — CV Builder + AI Careers Advisor: proof-of-concept, not shipping

## 2026-05-10 — CV Builder + AI Careers Advisor: proof-of-concept, not shipping

### What changed

The **CV Builder** and **AI Careers Advisor** features were built as proofs of concept and are not part of the shipping product. All references to them have been removed from the user-facing markdown guides (`docs/guides/`) and from this handover changelog's coverage tables.

- The features may still appear in the live application code (`/cv-builder`, `/careers-advisor`, the org-level `cvBuilderEnabled` / `careersAdvisorEnabled` feature flags) — they have not been deleted, just unsupported and undocumented for end users.
- The Charity Admin **Reports** page may still surface CV Builder and Careers Advisor metrics; treat these as internal-only.
- Engineering reference docs (`CLAUDE.md`, `README.md`) intentionally still describe the implementation so future developers know what they're looking at, but those are for technical hand-over, not user-facing materials.

### Affected handover PDFs

| Document | Outdated sections |
| --- | --- |
| `AAA_User_Guide.pdf` | Any section walking learners through `/cv-builder` or `/careers-advisor`. |
| `AAA_Admin_Guide.pdf` | Any reference to CV Builder / Careers Advisor in the Reports section or in the org-level feature-flag toggles. |
| `AAA_Training_Materials.pdf` | Any training material that demos the CV Builder wizard or the AI Careers Advisor questionnaire. |
| `AAA_Self_Registration_Flow.pdf` | Already superseded by the auth overhaul below — also remove any CV Builder / Careers Advisor mentions. |

### Up-to-date sources

- **`docs/guides/super-admin-guide.md`** — CV Builder and Careers Advisor lines removed from inheritance settings, reports section, and AI features list.
- **`docs/guides/careers-professional-guide.md`** — Sections 5 (CV Builder) and 6 (AI Careers Advisor) deleted; table of contents, sidebar nav table, and dashboard feature tiles updated; subsequent sections renumbered.

---

## 2026-05-10 — Authentication & registration overhaul

### What changed

1. **OAuth (Google + Microsoft) is now admin-toggleable**
   - The old `ENABLE_OAUTH_SSO` environment-variable kill switch has been removed.
   - Google and Microsoft sign-in are now controlled per-environment by a charity admin in **Settings → SSO** (`/super-admin/settings/sso`).
   - Both providers default **off**. They register with NextAuth whenever their env credentials are set, but the actual sign-in only works when the matching DB toggle is on.
   - The settings UI shows an amber "credentials missing" warning if the env vars aren't populated, so the toggle can't be flipped on with nothing behind it.

2. **First-time OAuth users no longer hit a dead end**
   - A user who clicks **Sign in with Google** / **Sign in with Microsoft** and doesn't have a platform account is now redirected to a one-question self-registration page (`/register/sso-complete`).
   - They pick a role (autistic / parent or carer / supporter / professional) and land signed in automatically under the public user pool.
   - Previously they got an "Account not found" error and had to ask an admin to create their account first. That step is gone for OAuth users only — SAML SSO users still need to be pre-created (or have per-org `autoProvision` enabled).

3. **Magic-link self-registration**
   - `/register` is back in use. There are three modes:
     - **I work for or study at an existing organisation** — find the org in the typeahead, pick a role, submit. You receive a welcome email and pick your password on the resulting `/welcome` page.
     - **I want to register a new school or business** — set up your own organisation as the first admin. You still set a password inline here because the new ORG_ADMIN needs immediate access.
     - **I don't have an organisation** — register as an individual under the public user pool. Same magic-link welcome flow as the existing-org path.
   - The existing-org and no-org paths **never ask for a password during sign-up**. The system emails the welcome link (24h expiry); the recipient clicks it, picks a password, lands signed in.

4. **Admin-approval gate removed**
   - Self-registered users no longer wait in a "pending" state for an org admin to approve them.
   - Self-registered organisations no longer wait for super-admin approval — they become active immediately.
   - The **Pending Users** tab on the org admin Users page is gone.
   - The **Pending Approval** tab on `/super-admin/organisations` is gone.
   - The super-admin dashboard no longer shows a "Pending organisations" attention card.
   - The `pendingApproval` columns remain on the `User` and `Organisation` tables but are no longer read or written. Existing rows aren't affected. Optional cleanup query: `UPDATE "User" SET "pendingApproval" = false WHERE "pendingApproval" = true;` (and same for `Organisation`).

5. **Login page redesigned**
   - The previous **Email & Password / Single Sign-On** segmented toggle has been removed. Sign-in method is auto-detected from the email address you type.
   - If the email's domain has SAML SSO configured, the SSO button replaces (or supplements) the password form.
   - If charity-wide OAuth toggles are on, Google / Microsoft buttons appear inline above the password form.
   - The icon on the SSO badge was changed from a generic building to a shield-with-checkmark for a clearer security/identity signal.

### Affected handover PDFs

| Document | Outdated sections |
| --- | --- |
| `AAA_Admin_Guide.pdf` | Any reference to a "Pending Users" tab in the org-admin panel, or to a "Pending Approval" tab in the super-admin panel. Any guidance saying OAuth sign-in is disabled, or pointing at the `ENABLE_OAUTH_SSO` env var. |
| `AAA_User_Guide.pdf` | The login-page screenshots with a toggle between Email & Password / Single Sign-On. The "your administrator must create your account" copy on the registration page — self-registration is now live for end users. |
| `AAA_Self_Registration_Flow.pdf` | The whole document — flows now end with a welcome email + magic link, not a password chosen at submission. There is no admin approval step. |
| `AAA_Technical_Setup_Guide.pdf` | The `ENABLE_OAUTH_SSO` environment variable no longer exists. OAuth is toggled in the admin UI. The list of admin-UI tabs no longer includes the pending-users / pending-orgs tabs. |
| `AAA_Digital_Platform_Handover_Plan.pdf` | Any references to admin-approval workflows or the OAuth kill switch. |
| `AAA_Data_Dictionary.pdf` | The `User.pendingApproval` and `Organisation.pendingApproval` columns still exist but are no longer read or written. New rows are always written with `pendingApproval = false`. A new model `OAuthSsoConfig` exists (single row, gates the Google / Microsoft login buttons). |
| `AAA_Training_Materials.pdf` | Any walkthroughs that show approving a self-registered user from the org admin panel — that workflow doesn't exist anymore. |

### Up-to-date sources

- **`CLAUDE.md`** — the canonical engineering reference (authentication section, recent changes log).
- **`docs/guides/super-admin-guide.md`** — Section 15 (SSO Setup) was fully rewritten.
- **`docs/guides/org-admin-guide.md`** — login-page reference updated.
- **`docs/guides/caregiver-guide.md`** — "Your account" + login sections rewritten to describe magic-link self-registration.
- **`docs/guides/careers-professional-guide.md`** — login section rewritten.
- **In-app How To Guide** — under each role's sidebar. The Charity Admin and Org Admin "Users" panels include updated guidance on the new flows.
- **`README.md`** — authentication section + env var table updated.

### Implementation references

- DB model: `OAuthSsoConfig` (single row, `googleEnabled` / `microsoftEnabled`) in `prisma/schema.prisma`.
- Admin UI: `/super-admin/settings/sso`. API: `/api/super-admin/settings/oauth-sso`.
- Login page: `app/(auth)/login/page.tsx`. Welcome page: `app/(auth)/welcome/page.tsx`. SSO completion page: `app/(auth)/register/sso-complete/page.tsx`.
- Welcome API: `app/api/auth/welcome/route.ts`. SSO completion API: `app/api/auth/register/sso-complete/route.ts`. Welcome email template: `lib/email-templates/welcome.ts`.
- Auth wiring (provider registration + signIn callback gating): `lib/auth.ts`.
