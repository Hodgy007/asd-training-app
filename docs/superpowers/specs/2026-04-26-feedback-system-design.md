# Feedback System — Design

**Date:** 2026-04-26
**Status:** Approved (brainstorm)
**Author:** Simon + Claude

## Summary

A platform-wide feedback widget that lets any authenticated user submit a typed message about the app. Submissions are stored in the database, automatically annotated with browser context and recent client-side log entries, and emailed to all Charity Admins (`SUPER_ADMIN`). Charity Admins triage submissions through a new inbox at `/super-admin/feedback`.

## Goals

- Make it trivial for caregivers, students, CDOs, org admins, and charity employees to report bugs and suggestions without leaving the page they're on.
- Capture enough technical context (URL, user agent, viewport, recent console + uncaught error logs) that a developer can reproduce the issue without bouncing back to the user.
- Give Charity Admins a single inbox to triage submissions through a simple status flow (NEW → IN_PROGRESS → RESOLVED).

## Non-goals

- No anonymous / pre-auth feedback. The login and forgot-password pages do not surface the widget.
- No reply-from-app. If a Charity Admin wants to follow up, they email the user directly.
- No screenshot capture. Word descriptions are faster and avoid the PII-redaction problem.
- No org-admin involvement in v1. Feedback is treated as platform-level; org admins do not receive emails or have an inbox.
- No `manage_feedback` delegated permission. The inbox is gated to `SUPER_ADMIN` only — `CHARITY_EMPLOYEE` users are excluded regardless of their `charityPermissions`.
- No notifications back to the submitter. The toast on submit is the only confirmation.

## Architecture overview

```
┌──────────────────────┐    POST /api/feedback     ┌──────────────────────┐
│  Topbar Feedback btn │ ───────────────────────▶  │  /api/feedback       │
│  → FeedbackModal     │                           │  - auth + rate limit │
│  reads logBuffer     │                           │  - zod validate      │
└──────────────────────┘                           │  - insert row        │
        ▲                                          │  - send email (async)│
        │ getBufferedLogs()                        └──────┬───────────────┘
        │                                                 │
┌──────────────────────┐                                  ▼
│  client-log-buffer   │                          ┌──────────────────────┐
│  - wraps console.*   │                          │  Resend → all        │
│  - error/rejection   │                          │  SUPER_ADMIN users   │
│  - 50-entry ring     │                          └──────────────────────┘
│  - mounted in        │
│    dashboard layout  │                          ┌──────────────────────┐
└──────────────────────┘                          │  /super-admin/       │
                                                  │  feedback (inbox)    │
                                                  │  - list + filters    │
                                                  │  - detail + status   │
                                                  └──────────────────────┘
```

## Data model

### New Prisma model

```prisma
model FeedbackSubmission {
  id             String          @id @default(cuid())
  userId         String
  user           User            @relation("FeedbackSubmitter", fields: [userId], references: [id], onDelete: Cascade)
  organisationId String?
  organisation   Organisation?   @relation(fields: [organisationId], references: [id], onDelete: SetNull)

  type           FeedbackType
  message        String          @db.Text

  url            String
  userAgent      String          @db.Text
  viewport       String          // "1920x1080"
  clientLogs     Json?           // [{ level, message, ts, source? }, ...]

  status         FeedbackStatus  @default(NEW)
  resolvedAt     DateTime?
  resolvedById   String?
  resolvedBy     User?           @relation("FeedbackResolver", fields: [resolvedById], references: [id], onDelete: SetNull)
  adminNotes     String?         @db.Text

  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  @@index([status, createdAt])
  @@index([userId])
}

enum FeedbackType {
  BUG
  SUGGESTION
  QUESTION
  OTHER
}

enum FeedbackStatus {
  NEW
  IN_PROGRESS
  RESOLVED
}
```

### Reverse relations

- `User.feedbackSubmissions  FeedbackSubmission[] @relation("FeedbackSubmitter")`
- `User.resolvedFeedback      FeedbackSubmission[] @relation("FeedbackResolver")`
- `Organisation.feedback      FeedbackSubmission[]`

### Why denormalise `organisationId`?

The submitter's org is copied onto the row at submit time rather than walked via `user.organisationId`. If a user is later moved to a different org or deactivated, the inbox should still show where the feedback came from at the time it was sent. `onDelete: SetNull` on the org relation means deleting an org doesn't lose the row.

### Why JSON for `clientLogs`?

We never query inside log entries. A relational table would be over-engineering. Structure: `[{ level: 'log'|'info'|'warn'|'error', message: string, ts: number, source?: string }]`. Each entry's `message` is capped server-side at 2000 chars; the array is capped at 50 entries.

## Components and files

### Client-side log buffer

**`lib/client-log-buffer.ts`** (new):
- On import: wraps `console.log/info/warn/error` so each call appends `{ level, message, ts: Date.now() }` to a ring buffer (max 50 entries; oldest dropped).
- The wrapper still calls through to the original `console.*` so devtools behaviour is unchanged.
- Adds `window.addEventListener('error', ...)` and `window.addEventListener('unhandledrejection', ...)` listeners that append `{ level: 'error', message, source: filename:line, ts }`.
- Exports `getBufferedLogs(): LogEntry[]` returning a shallow copy of the buffer.
- Buffer is in-memory only — survives SPA route changes; cleared on full page reload (deliberate — captures the recent state of the current session).
- Idempotent: re-importing does not re-wrap (guard with a module-level flag).

**`components/providers/log-buffer-mount.tsx`** (new):
- Tiny client component (`"use client"`) whose only job is to import `lib/client-log-buffer` so the wrapper installs at app boot.
- Mounted once in `app/(dashboard)/layout.tsx` (so it activates on any authenticated route, not on `/login`).

### Topbar button

**`components/layout/topbar.tsx`** (modify):
- Add a "Feedback" text button next to the bell. Text label, not icon-only — accessibility.
- Clicking opens `<FeedbackModal>`, lazy-loaded via `next/dynamic` so the buffer-reader code isn't shipped to the login bundle.

### Feedback modal

**`components/feedback/feedback-modal.tsx`** (new):
- Type pill group: Bug / Suggestion / Question / Other. Bug pre-selected.
- Textarea: required, min 10 chars, max 5000. Live char count.
- Disclosure: "We'll also include the page URL, your browser, and recent error logs to help us fix it." with a "Show what we're sending" toggle that expands a read-only preview block (URL, viewport, UA, formatted log entries).
- On submit: POST `/api/feedback` with `{ type, message, url, userAgent, viewport, clientLogs }` (read at submit time, not modal open time, so any errors triggered while the user types are captured).
- On 200: toast "Thanks — we got it" and close.
- On error: inline error message; modal stays open so the user doesn't lose their text.
- Reset form on close.

### API: submit

**`app/api/feedback/route.ts`** (new):
- `POST` only. `getServerSession(authOptions)`; reject if unauthenticated → 401.
- Rate limit: 5 / 15 min per user via `lib/rate-limit.ts` (key: `feedback:<userId>`).
- Zod schema:
  - `type ∈ FeedbackType`
  - `message`: trimmed, 10–5000 chars
  - `url`: ≤ 500 chars
  - `userAgent`: ≤ 500 chars
  - `viewport`: matches `/^\d+x\d+$/`
  - `clientLogs`: array, ≤ 50 items; each `{ level, message: ≤ 2000 chars, ts: number, source?: string }`
- Server-side sanitisation: trim message, strip control characters except newline/tab, truncate any log line that slipped past the client limit.
- Insert `FeedbackSubmission` (denormalising `organisationId` from session).
- Send email inside a `try/catch` — email failures are logged server-side but do not 500 the request. We'd rather lose the email than reject the feedback (the row is in the DB and the admin will still see it in the inbox). The await still happens before responding so we don't return before Resend has accepted the message in the happy path.
- Return `{ id }`.

### API: inbox

**`app/api/super-admin/feedback/route.ts`** (new):
- `GET` only.
- Gated to `SUPER_ADMIN` only via `isSuperAdmin(session)` (not `hasPermission`).
- Query params: `status` (NEW / IN_PROGRESS / RESOLVED, optional), `type` (FeedbackType, optional), `page` (default 1), `pageSize` (default 25).
- Returns `{ items, total, statusCounts: { NEW, IN_PROGRESS, RESOLVED } }`. The status counts are used by the sidebar pill and the filter chips.
- Includes `user` (id, name, email, role) and `organisation` (id, name) in the result.

**`app/api/super-admin/feedback/[id]/route.ts`** (new):
- `GET` returns full submission with `user` and `organisation` joined.
- `PATCH` accepts `{ status?, adminNotes? }`. When `status` transitions to `RESOLVED` (and was not previously), server stamps `resolvedAt = now()` and `resolvedById = session.user.id`. Transitioning back from RESOLVED clears those fields. `adminNotes` is plain text, max 5000 chars.
- Both gated to `SUPER_ADMIN` only.

### Email

**`lib/feedback-email.ts`** (new):
- `sendFeedbackEmail(submission)`:
  - Recipients: all `User` rows where `role = 'SUPER_ADMIN'` AND `active = true`. If zero recipients, log warning and return (don't throw).
  - From: same address as forgot-password / invite.
  - Subject: `[Feedback - <Type>] <first 60 chars of message>`. e.g. `[Feedback - Bug] Quiz won't submit on Module 3`.
  - Body: HTML + plain-text alternative. Both contain:
    - Type, status (NEW), submitted-at.
    - Submitter: name, email, role label, org name.
    - Page URL (clickable in HTML), viewport, user agent.
    - Message, with line breaks preserved (HTML: `white-space: pre-wrap`; plain: passthrough).
    - Collapsed `<details>` block (HTML only) with the log dump formatted as `[12:04:33] error  Failed to fetch /api/...`. Plain-text version always includes the dump in a `=== Recent client logs ===` section.
    - Footer link: `View in admin → ${NEXTAUTH_URL}/super-admin/feedback/<id>`.
  - All user-supplied content (message, URL, log entries) HTML-escaped before interpolation.

### Inbox UI

**`app/(super-admin)/super-admin/feedback/page.tsx`** (new) — list:
- Table: Status badge, Type badge, Submitter (name + role-label), Org, Message preview (first 80 chars), Submitted (relative time).
- Filter chips: All / New / In Progress / Resolved (with counts). Secondary filter: Type dropdown.
- Default sort: newest first.
- Row click → detail page.

**`app/(super-admin)/super-admin/feedback/[id]/page.tsx`** (new) — detail:
- Two-pane layout.
- Left: type, status badge, submitter card (name, email, role, org), full message (line breaks preserved), page URL (clickable), viewport, UA, expandable client log block (monospace).
- Right: status dropdown (NEW / IN_PROGRESS / RESOLVED), `adminNotes` textarea, **Save** button. Shows `resolvedBy` + `resolvedAt` once resolved.
- Back link to list.

**`components/layout/super-admin-sidebar.tsx`** (modify):
- Add a "Feedback" entry between **Surveys** and **Announcements** (keeps alphabetical-within-section convention).
- Pill on the nav item shows the count of `NEW` items, fetched on layout render. Hidden when zero.

## Data flow (submit)

1. User clicks **Feedback** in topbar → modal opens.
2. User picks type, types message, clicks **Send**.
3. Modal reads `getBufferedLogs()`, `window.location.href`, `navigator.userAgent`, `${innerWidth}x${innerHeight}`.
4. POST `/api/feedback`.
5. Route validates, inserts row, kicks off `sendFeedbackEmail` (awaited but errors swallowed).
6. Returns `{ id }`. Modal toasts and closes.
7. All `SUPER_ADMIN`s receive the email; the row appears in `/super-admin/feedback` immediately.

## Error handling

- **Unauthenticated submit:** 401, modal shows "Please sign in again" inline; no retry loop.
- **Rate limit hit:** 429, modal shows "You've sent a few in quick succession. Please wait a few minutes." Form contents preserved.
- **Validation failure:** 400 with field-level errors; modal highlights the offending field.
- **Email failure:** Logged server-side (`console.error`) with the submission id. The DB row is still created; the admin can find it in the inbox even if the email never lands.
- **Zero `SUPER_ADMIN` recipients:** Warning logged; submission still saved. Edge case — at least one super admin exists in production.
- **Buffer not initialised** (e.g. user navigated to feedback flow before layout mount finished): `getBufferedLogs` returns `[]`. Submission proceeds with empty `clientLogs`.

## Security

- **Auth gate** on every API route. Inbox routes are `SUPER_ADMIN`-only (not delegated to `CHARITY_EMPLOYEE` permissions).
- **Rate limiting** prevents accidental floods and basic abuse.
- **Size caps** at the schema level (message 5000, log entries 50 × 2000 chars) bound payload size and DB row size.
- **HTML escaping** of all user-supplied content in the email body.
- **Control character stripping** on the message to prevent log forging.
- **No PII in client logs by design** — we don't redact, but we tell the user what we're sending and let them inspect via the disclosure block. Users who paste sensitive data into a textarea know what they're doing; this is the same trust model as forgot-password.

## Tests

### Unit (Vitest)

- **`lib/__tests__/client-log-buffer.test.ts`**
  - Buffer keeps newest 50 (push 60, assert length 50 with newest 50).
  - Captures `error` and `unhandledrejection` events.
  - Original `console.log` is called through.
  - `getBufferedLogs()` returns a copy (mutating it doesn't affect the buffer).
  - Re-import is idempotent (no double-wrapping).

- **`lib/__tests__/feedback-email.test.ts`**
  - Subject formatting: type label + first 60 chars + ellipsis when longer.
  - HTML escaping of message and log lines (e.g. `<script>` → `&lt;script&gt;`).
  - Recipient query selects only `SUPER_ADMIN` AND `active = true`.
  - Zero-recipient case logs warning, doesn't throw.

- **`app/api/feedback/__tests__/route.test.ts`**
  - 401 when unauthenticated.
  - Rate limit: 6th submit in 15 min returns 429.
  - Zod rejects: empty message, message > 5000, malformed viewport, > 50 log entries.
  - Org id denormalised from session, not request body.
  - Email failure does not 500 (mock Resend to throw).

- **`app/api/super-admin/feedback/__tests__/route.test.ts`**
  - 403 for non-`SUPER_ADMIN` (including `CHARITY_EMPLOYEE` with all permissions).
  - Status filter narrows results.
  - PATCH RESOLVED stamps `resolvedAt` + `resolvedById`.
  - PATCH back to NEW clears `resolvedAt` + `resolvedById`.

### E2E (Playwright)

- **`tests/e2e/feedback.spec.ts`** — full happy path:
  1. Log in as caregiver, click **Feedback**, select Bug, type message, submit, see toast.
  2. Log in as super admin, navigate to `/super-admin/feedback`, see the entry, open detail, mark RESOLVED, verify status updates.

## Migration / rollout

- One Prisma schema change. Run `npx prisma db push` against the **dev** branch first (default `.env.local`), then against **production** (`npx vercel env pull .env.production --environment production --yes && npx dotenv-cli -e .env.production -- npx prisma db push`).
- No new env vars (Resend already configured).
- No feature flag — ships enabled. If we need to disable in a hurry, hide the topbar button.
- Deploy via git push to `main` (Vercel auto-deploys per the user's `feedback_deploy` memory).

## Open questions

None at brainstorm sign-off. Implementation plan will surface concrete sequencing.

## Out of scope (follow-ups)

- Per-org routing (charity-only is v1).
- Reply-from-app with notification back to submitter.
- Screenshot capture.
- Public/anonymous feedback on login or marketing pages.
- A "voted on" or upvote signal across submissions.
- Bulk operations on the inbox (bulk resolve, bulk delete).
- Trend dashboards on volume / type breakdown.
