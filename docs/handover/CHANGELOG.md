# Handover Documentation Changelog

The PDF documents in this folder were generated at the original handover. The platform has been updated since — anything in a PDF that contradicts what's in this changelog is **out of date**; trust the markdown sources in `docs/guides/`, `CLAUDE.md`, and the platform's in-app How To Guide pages instead.

Re-generate the PDFs from the up-to-date markdown sources when convenient.

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
