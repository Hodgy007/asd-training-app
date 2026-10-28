# Plan: close the two MFA bypasses (28 Oct 2026)

## Problems

1. **TOTP-only sign-in.** `lib/auth.ts` `authorize()` accepts `{ email, totpCode }`
   with no proof the caller already presented the password. Anyone who knows an
   email and a current code gets a full session. The only throttle is the
   per-IP login limiter; `mfaVerifyLimiter` in `lib/rate-limit.ts` is unused.
2. **Reset link → MFA-free session.** `/api/auth/welcome` accepts any
   `PasswordResetToken` regardless of `purpose`, and mints a session with
   `mfaPending: false`. A forgot-password link for a TOTP-enabled admin
   therefore signs them in without TOTP. It also sets `active: true`
   unconditionally.

## Shared groundwork (done)

`TOKEN_PURPOSE` constant (`RESET` / `ACTIVATION` / `WELCOME`) added to
`lib/reset-token.ts`. Everything below imports it.

## Task A — auth core (Sonnet subagent)

Files: `lib/auth.ts`, `app/api/auth/welcome/route.ts`, new tests beside them.

- TOTP branch of `authorize(credentials, req)`:
  - Read the caller's current NextAuth JWT from the request cookies (handle the
    `__Secure-` prefix and chunked cookies — use `getToken` from `next-auth/jwt`
    if it works with the `req` NextAuth passes to `authorize`; verify in
    `node_modules/next-auth`).
  - Reject unless that token exists, has `mfaPending === true`, and its `id`
    equals the user found by email. Same opaque error as other failures.
  - Apply `mfaVerifyLimiter` keyed by user id before validating the code.
- `/api/auth/welcome` (GET and POST): only accept rows with
  `purpose === TOKEN_PURPOSE.WELCOME`. Reject inactive users / inactive orgs
  instead of reactivating them (drop `active: true` from the update). Mint the
  session with `mfaPending: user.totpEnabled === true`.
- Unit tests for each rejection path plus the happy path.

## Task B — token creators (Haiku 5.5 subagent)

Files: `app/api/auth/register/route.ts`, `lib/eventbrite-sync.ts`, their tests.

- Both create `/welcome` magic links. Add `purpose: TOKEN_PURPOSE.WELCOME` to
  their `passwordResetToken.create` data.
- Update any test assertions on the create payload.
- Leave forgot-password, account-provisioning, org provisioning and the admin
  invite route alone — they send `/reset-password` links and keep their
  existing purposes.

## Integration (main session)

- `npx prisma generate`, `npx tsc --noEmit`, `npx vitest run`.
- Review both diffs, commit on `claude/application-review-efe48c`.

## Known trade-off

Welcome links issued before deploy were stored with the default `RESET`
purpose, so they stop working at `/welcome`. They expire within 24h anyway;
affected users can register again or use forgot-password.

## Out of scope (follow-ups)

TOTP replay protection (needs a last-used-step column), Microsoft
email-linking hardening, Next.js upgrade.
