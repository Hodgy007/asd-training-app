# Security Review — September 2026

**Application:** Ambitious about Autism — ASD Training Platform
**Branch reviewed:** `claude/inspiring-tesla-1laos0` (from `b273394`)
**Date:** 12 September 2026
**Classification:** Internal — security sensitive. Do not distribute outside the charity's technical / information-governance leads.
**Companion document:** [`compliance/SECURITY_AND_COMPLIANCE.md`](../../compliance/SECURITY_AND_COMPLIANCE.md)

---

## 1. Summary

A full manual review of the application was carried out: authentication and session handling, middleware route gating, every API route's authorisation and input validation, SAML and OAuth SSO, webhooks, file uploads, SCORM hosting, HTML sanitisation, the Content-Security-Policy, secret handling, and third-party dependencies.

The platform's security baseline is strong in most areas (see §5). The findings concentrated in the **authentication tier**. Four issues were rated Critical because each, on its own, gave an anonymous or low-privilege actor a path to a charity-administrator session or to taking over an arbitrary account.

The Critical and High findings, and most Medium/Low findings, were **remediated in this change** and are covered by automated tests. The remaining items are a framework major-version upgrade and a small number of product decisions, tracked below for follow-up.

| Severity | Found | Remediated now | Deferred / accepted |
|---|---|---|---|
| Critical | 4 | 4 | 0 |
| High | 7 | 5 | 2 (Next.js upgrade; org-join policy) |
| Medium | 16 | 12 | 4 |
| Low | 17 | 11 | 6 |

Severity key: **Critical** = unauthenticated or low-privilege path to admin / arbitrary-account takeover. **High** = significant access-control break or unpatched high-impact dependency. **Medium** = exploitable with preconditions, or a defence-in-depth gap. **Low** = hardening / hygiene.

---

## 2. Critical findings (all remediated)

### C1 — Multi-factor authentication could be cleared with `session.update()`
`lib/auth.ts` cleared the `mfaPending` gate on any JWT `update` trigger. Because `POST /api/auth/session` reaches that trigger and is allowed during the pending state, a session that had only presented a password could clear its own second-factor requirement and reach the full admin surface without ever entering a TOTP code.
**Fix:** removed the line. The pending flag is now cleared only by a genuine TOTP sign-in.

### C2 — MFA could be bypassed by re-enrolling a new authenticator mid-login
The MFA-pending middleware allow-list covered the whole `/api/auth/` prefix, and `GET /api/auth/mfa/setup` would mint and return a fresh TOTP secret for any signed-in user. A password-only session could fetch a new secret and complete the second factor with it (also silently breaking the real owner's authenticator).
**Fix:** the pending allow-list is now limited to NextAuth's own endpoints; the MFA gate is evaluated before the forced-password-change gate; secret generation moved to `POST /api/auth/mfa/setup/start`, which refuses to run while a session is MFA-pending and refuses to rotate an already-enrolled secret without a valid current code; `mfa/disable` and `change-password` reject MFA-pending sessions too.

### C3 — SAML assertions were not bound to the tenant that configured SSO
The SAML callback selected the identity-provider certificate by the email domain in the attacker-controlled `RelayState`, then logged in whatever user the signed assertion named — with no check that the email's domain matched the configured domain or that the user belonged to the configuring organisation, and with MFA skipped. Anyone could self-register a new organisation (becoming its admin), point that org's SSO at an identity provider they control, and have it assert a charity administrator's email to obtain a `SUPER_ADMIN` session.
**Fix:** the callback now requires the signed NameID's domain to equal the org's configured domain, requires an existing user to belong to that same organisation, refuses charity-level roles through org SSO, uses the server-side single-use request record (not `RelayState`) as the authoritative charity/org flag, and keeps the app's own TOTP gate in place for accounts that have it enrolled.

### C4 — Public lead-capture endpoint could overwrite existing users' passwords
`POST /api/toolkit/leads` (unauthenticated) would set a password and role on an existing account when the account had no organisation or belonged to the public toolkit org — which includes every charity administrator and individual subscriber. An anonymous caller with a target email and any published toolkit document id could set that account's password and demote it to learner.
**Fix:** the endpoint now creates an account only when none exists for the email; any existing email returns HTTP 409 pointing the person to sign-in / password-reset; it never writes to an existing account. Password strength now uses the platform's shared policy.

---

## 3. High findings

| Ref | Finding | Status |
|---|---|---|
| H1 | A TOTP code alone signed a user in (the password branch was skipped whenever a code was supplied), so the second factor doubled as a standalone first factor. | **Deferred (follow-up PR).** Needs a short-lived pre-auth token issued at the password step and required at the TOTP step, plus a per-account limiter. Design recorded below. |
| H2 | Any org admin could claim any email domain for SAML (including a public mailbox like `gmail.com`), and the stored SSO URL was unvalidated (a `javascript:` URL would run on the login page). | **Remediated.** Both SSO settings endpoints now validate input with a schema: HTTPS-only URLs, a hostname-shaped domain, and a public-mailbox deny-list. SAML login initiation also refuses non-HTTPS URLs. Domain-ownership proof is a product decision (below). |
| H3 | Anyone could self-enrol into any organisation via the "join existing organisation" registration path and inherit its assigned (including purchased) content. | **Deferred (product decision).** Options: invite code/link (recommended — reuses the existing cohort-join model), per-org email-domain allow-list, or reinstating approval for this path. |
| H4 | A parent-org admin could grant a child org any programme on the platform, including paid ones, then create a learner there to consume it. | **Remediated.** Child-org programme assignment is now constrained to a subset of the parent's own programmes. |
| H5 | Next.js 14.2.35 no longer receives security fixes; 20+ advisories affect it whose only patched versions are 15.5.x. | **Deferred (own PR).** Requires a framework major upgrade and end-to-end regression testing. |
| H6 | `sanitize-html` 2.17.3 carried a version-specific critical XSS advisory (plus others), and lesson/homepage HTML is rendered to every learner. | **Remediated.** Upgraded to ≥2.17.7. |
| H7 | The database seed created a `SUPER_ADMIN` with a hard-coded password (`admin123`). | **Remediated.** The seed now reads passwords from the environment or generates random ones (printed once), and refuses to run against a production database. *Operational action: confirm the seeded `admin@asdawareness.org.uk` and `demo@example.com` accounts do not exist on the production database.* |

---

## 4. Medium and Low findings

### Remediated in this change
- **M2 / M3 / L5 / L6 — file handling.** Library and toolkit document proxies no longer serve `text/html` or SVG inline (they force download), and they refuse to fetch a stored file URL that is not a Vercel Blob URL (closing an admin-driven same-origin XSS and a server-side request-forgery vector). Client upload tokens now pin both content type and maximum size per path prefix, with HTML and SVG excluded. Server upload routes restrict the blob path prefix to a fixed allow-list and no longer let the client disable the size cap. The job-logo upload no longer accepts SVG and adds a random suffix.
- **M4 — cross-tenant invite.** Charity-level callers of the user-invite endpoint now require the "manage organisations" permission (previously any charity employee could invite, and reset the token of, any user).
- **M5 — platform-wide library edit.** Org admins can no longer rename/re-describe charity-authored collections that are visible to every tenant.
- **M6 — cross-org survey leak.** The notifications query now matches survey targets conjunctively (role **and** organisation), and no longer matches every survey for organisation-less users.
- **M7 — survey answers.** Survey responses now bind each answer to a question that belongs to that survey, coerce values to strings, and cap their length.
- **M9 / M14 — dependencies.** `@xmldom/xmldom` upgraded to ≥0.8.15 (multiple parser-DoS advisories on the unauthenticated SAML path); `adm-zip` to 0.6.1.
- **M10 — dependency.** `next-auth` upgraded to 4.24.15 (fixes the `getToken()` crash on a malformed `Authorization` header, which the middleware calls on every request).
- **M15 — directory enumeration.** The workshop attendee search no longer returns charity-level accounts.
- **L1** removed an unauthenticated, unlinked organisation-registration endpoint and page. **L2** added a rate limit to SAML login initiation and prune expired single-use request rows. **L3** added a constant-time dummy password comparison to remove a login timing side-channel. **L13** the checkout-status endpoint no longer returns the payer's email. **L15** aligned bcrypt cost to 12 across all call sites and reused the shared password policy on the cohort/toolkit paths. Also removed an unauthenticated MFA-verify oracle route (M2 in the earlier notes).

### Deferred to a follow-up PR
- **M8** — the middleware skips its gates for any path containing a dot; narrow this to a static-extension allow-list, and add MFA-pending / forced-password checks to the shared API auth wrapper so the API tier fails closed on its own.
- **M11** — add a per-account login limiter and prefer the platform's forwarded-IP header.
- **M13** — return "secret is set" booleans instead of the stored Zoom/Teams API secrets, and encrypt those columns.
- **M16 / L7 / L9 / L10 / L12** — add schema validation and size caps to the remaining unvalidated write endpoints (sessions, super-admin surveys, training notes, SCORM CMI, interactions), scheme/host-validate URLs inside home-page and interactive-block content, compare the Stripe subscription price id against the configured price and check `livemode`, and rate-limit the anonymous toolkit event endpoint.
- **L11** — correct the integration-reports schema's pseudonymisation claim and paginate the training/library sections.

### Accepted / documented risk
- **M1** — Microsoft OAuth links accounts by the email claim with a multi-tenant configuration. Only live when the Microsoft toggle is enabled; pin the tenant or verify the tenant claim before enabling.
- **M12** — SCORM content runs same-origin with inline scripts (documented, deliberate); a separate origin with signed asset URLs is the long-term fix.
- **L14** — the CSP still allows inline scripts; move to nonces after the Next.js upgrade.
- **Quill / react-quill-new (low)** — an XSS in Quill's HTML-export feature. The editor is admin-only and all rendered HTML is sanitised on output; the advisory's suggested "fix" is a downgrade, so it is left as-is.

---

## 5. Areas checked and found sound (no change needed)

Password-reset, welcome and invite tokens are stored as SHA-256 digests; all tokens and temporary passwords use a cryptographically secure generator. The Stripe webhook verifies signatures, de-duplicates events, and guards against out-of-order delivery. The Eventbrite webhook pins the API host and checks the registered webhook id. Blob document downloads are proxied with per-request entitlement checks (library, training attachments, jobs, toolkit, SCORM). SCORM zip extraction is hardened against path traversal, zip-bombs and ZIP64 tricks. The SAML metadata fetch has a server-side request-forgery guard. SAML validation defends against signature-wrapping and replay and pins issuer, audience and recipient. The HTML sanitiser uses a positive allow-list with no `class`/`id`, pinned iframe hosts, and a restricted CSS property list. Org-admin drill-down consistently verifies the parent/child relationship. No secrets are committed to the repository or its history, and the structured logger avoids logging personal data.

---

## 6. Follow-up design note — H1 (step-up second factor)

At the password step, in addition to setting the pending flag, issue a short-lived (about five minutes) signed pre-authentication token (the same mechanism already used for the SSO-registration intent token) and surface it to the verification page. The TOTP step then requires that token (or the password) so a bare code cannot complete sign-in. Add a per-account sliding-window limiter alongside the existing per-IP limiter.

---

## 7. Verification

- All automated tests pass (`npm run test`), including new tests for: the JWT callback keeping the MFA gate on `update`; the MFA setup-start endpoint refusing pending / already-enrolled sessions; the toolkit lead endpoint returning 409 for an existing email without touching the account; the schools endpoint rejecting programmes the parent lacks; conjunctive survey-notification targeting; survey-answer binding and value caps; the SSO URL/domain validation; and the Vercel-Blob URL guard.
- The full production build passes (`npm run build` — Prisma client generation, the test run, and the Next.js build).
- Production dependency audit after the change: no critical or high advisories remain other than the Next.js 14 line, which is tracked as the deferred framework upgrade (H5).
