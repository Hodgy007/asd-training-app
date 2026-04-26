# Feedback System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a platform-wide Feedback widget — topbar button → modal → DB row + email to Charity Admins, including a captured client-side log buffer for bug context. Charity Admins triage at `/super-admin/feedback`.

**Architecture:** New `FeedbackSubmission` Prisma model. A tiny client-side log buffer wraps `console.*` and listens for uncaught errors / unhandled rejections. The modal reads the buffer at submit time, POSTs to `/api/feedback`, which validates, stores, and emails all `SUPER_ADMIN`s via Resend. Inbox UI is at `/super-admin/feedback` with status flow NEW → IN_PROGRESS → RESOLVED, gated to `SUPER_ADMIN` only.

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma, Neon Postgres, NextAuth v4, Vitest, Playwright, Resend, Tailwind, lucide-react.

**Spec:** `docs/superpowers/specs/2026-04-26-feedback-system-design.md`

---

## File Structure

### Created

| Path | Responsibility |
|---|---|
| `lib/client-log-buffer.ts` | Console wrapper + window error listeners + 50-entry ring buffer + `getBufferedLogs()` |
| `lib/__tests__/client-log-buffer.test.ts` | Unit tests for the buffer |
| `lib/feedback-email.ts` | Builds + sends the feedback email via Resend |
| `lib/__tests__/feedback-email.test.ts` | Unit tests for email recipients + subject + escaping |
| `components/providers/log-buffer-mount.tsx` | Client-only mount that imports `client-log-buffer` once |
| `components/feedback/feedback-modal.tsx` | Modal: type selector, textarea, disclosure block, submit |
| `app/api/feedback/route.ts` | `POST` — auth + rate limit + validate + insert + email |
| `app/api/feedback/__tests__/route.test.ts` | Tests for submit |
| `app/api/super-admin/feedback/route.ts` | `GET` list with filters + counts |
| `app/api/super-admin/feedback/[id]/route.ts` | `GET` detail + `PATCH` status/notes |
| `app/api/super-admin/feedback/__tests__/route.test.ts` | Tests for inbox APIs |
| `app/(super-admin)/super-admin/feedback/page.tsx` | Inbox list UI |
| `app/(super-admin)/super-admin/feedback/[id]/page.tsx` | Inbox detail UI |
| `tests/e2e/feedback.spec.ts` | E2E: caregiver submits → admin sees + resolves |

### Modified

| Path | What changes |
|---|---|
| `prisma/schema.prisma` | New `FeedbackSubmission` model + `FeedbackType` + `FeedbackStatus` enums + reverse relations on `User` and `Organisation` |
| `app/(dashboard)/layout.tsx` | Mount `<LogBufferMount />` once |
| `components/layout/topbar.tsx` | Add Feedback button + lazy-loaded modal |
| `components/layout/super-admin-sidebar.tsx` | Add "Feedback" nav item with NEW-count pill |

---

### Task 1: Schema + Prisma generate + dev push

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the model and enums**

Append to `prisma/schema.prisma`:

```prisma
model FeedbackSubmission {
  id             String          @id @default(cuid())
  userId         String
  user           User            @relation("FeedbackSubmitter", fields: [userId], references: [id], onDelete: Cascade)
  organisationId String?
  organisation   Organisation?   @relation("OrgFeedback", fields: [organisationId], references: [id], onDelete: SetNull)

  type           FeedbackType
  message        String          @db.Text

  url            String
  userAgent      String          @db.Text
  viewport       String
  clientLogs     Json?

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

- [ ] **Step 2: Add reverse relations on `User`**

In the existing `model User { ... }` block, add:

```prisma
  feedbackSubmissions FeedbackSubmission[] @relation("FeedbackSubmitter")
  resolvedFeedback    FeedbackSubmission[] @relation("FeedbackResolver")
```

- [ ] **Step 3: Add reverse relation on `Organisation`**

In the existing `model Organisation { ... }` block, add:

```prisma
  feedback FeedbackSubmission[] @relation("OrgFeedback")
```

- [ ] **Step 4: Generate Prisma client and push to dev DB**

Run: `npm run prisma:push`
Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(feedback): add FeedbackSubmission model + enums"
```

> **Note:** Production push happens in Task 14 right before deploy.

---

### Task 2: Client log buffer

**Files:**
- Create: `lib/client-log-buffer.ts`
- Test: `lib/__tests__/client-log-buffer.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/client-log-buffer.test.ts`:

```typescript
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('client-log-buffer', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('keeps the newest 50 entries when more are pushed', async () => {
    const { getBufferedLogs } = await import('../client-log-buffer')
    for (let i = 0; i < 60; i++) console.log(`msg ${i}`)
    const logs = getBufferedLogs()
    expect(logs).toHaveLength(50)
    expect(logs[0].message).toBe('msg 10')
    expect(logs[49].message).toBe('msg 59')
  })

  it('captures console levels with the correct level field', async () => {
    const { getBufferedLogs } = await import('../client-log-buffer')
    console.log('a')
    console.warn('b')
    console.error('c')
    console.info('d')
    const logs = getBufferedLogs()
    const levels = logs.slice(-4).map((l) => l.level)
    expect(levels).toEqual(['log', 'warn', 'error', 'info'])
  })

  it('captures window error events', async () => {
    const { getBufferedLogs } = await import('../client-log-buffer')
    window.dispatchEvent(new ErrorEvent('error', { message: 'boom', filename: 'x.js', lineno: 10 }))
    const logs = getBufferedLogs()
    const last = logs[logs.length - 1]
    expect(last.level).toBe('error')
    expect(last.message).toContain('boom')
    expect(last.source).toContain('x.js')
  })

  it('returns a copy of the buffer (caller mutation does not leak)', async () => {
    const { getBufferedLogs } = await import('../client-log-buffer')
    console.log('hello')
    const a = getBufferedLogs()
    a.push({ level: 'log', message: 'sneaky', ts: 0 })
    const b = getBufferedLogs()
    expect(b.find((e) => e.message === 'sneaky')).toBeUndefined()
  })

  it('still calls the original console method through (devtools see it)', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await import('../client-log-buffer')
    console.log('hi')
    expect(spy).toHaveBeenCalledWith('hi')
    spy.mockRestore()
  })

  it('is idempotent on re-import (does not double-wrap)', async () => {
    await import('../client-log-buffer')
    const wrapped = console.log
    await import('../client-log-buffer')
    expect(console.log).toBe(wrapped)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/__tests__/client-log-buffer.test.ts`
Expected: FAIL with "Cannot find module '../client-log-buffer'"

- [ ] **Step 3: Implement the buffer**

Create `lib/client-log-buffer.ts`:

```typescript
export type LogLevel = 'log' | 'info' | 'warn' | 'error'

export interface LogEntry {
  level: LogLevel
  message: string
  ts: number
  source?: string
}

const MAX_ENTRIES = 50
const buffer: LogEntry[] = []

function push(entry: LogEntry) {
  buffer.push(entry)
  if (buffer.length > MAX_ENTRIES) buffer.splice(0, buffer.length - MAX_ENTRIES)
}

function stringifyArgs(args: unknown[]): string {
  return args
    .map((a) => {
      if (a instanceof Error) return a.stack || a.message
      if (typeof a === 'string') return a
      try {
        return JSON.stringify(a)
      } catch {
        return String(a)
      }
    })
    .join(' ')
}

declare global {
  interface Window {
    __aaaLogBufferInstalled?: boolean
  }
}

function install() {
  if (typeof window === 'undefined') return
  if (window.__aaaLogBufferInstalled) return
  window.__aaaLogBufferInstalled = true

  const levels: LogLevel[] = ['log', 'info', 'warn', 'error']
  for (const level of levels) {
    const original = console[level].bind(console)
    console[level] = (...args: unknown[]) => {
      push({ level, message: stringifyArgs(args), ts: Date.now() })
      original(...args)
    }
  }

  window.addEventListener('error', (event) => {
    const source = [event.filename, event.lineno, event.colno].filter(Boolean).join(':')
    push({
      level: 'error',
      message: event.message || String(event.error),
      source: source || undefined,
      ts: Date.now(),
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    const message = reason instanceof Error ? reason.stack || reason.message : stringifyArgs([reason])
    push({ level: 'error', message: `Unhandled rejection: ${message}`, ts: Date.now() })
  })
}

install()

export function getBufferedLogs(): LogEntry[] {
  return buffer.slice()
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/__tests__/client-log-buffer.test.ts`
Expected: PASS — 6 tests

- [ ] **Step 5: Commit**

```bash
git add lib/client-log-buffer.ts lib/__tests__/client-log-buffer.test.ts
git commit -m "feat(feedback): add client-side log buffer for feedback context"
```

---

### Task 3: Log buffer mount + dashboard layout integration

**Files:**
- Create: `components/providers/log-buffer-mount.tsx`
- Modify: `app/(dashboard)/layout.tsx`

- [ ] **Step 1: Create the mount component**

Create `components/providers/log-buffer-mount.tsx`:

```tsx
'use client'

import { useEffect } from 'react'

export function LogBufferMount() {
  useEffect(() => {
    void import('@/lib/client-log-buffer')
  }, [])
  return null
}
```

- [ ] **Step 2: Mount it in the dashboard layout**

In `app/(dashboard)/layout.tsx`, add the import near the other component imports:

```tsx
import { LogBufferMount } from '@/components/providers/log-buffer-mount'
```

Then render `<LogBufferMount />` once inside the top-level returned `<div>` (just above `<div className="hidden md:flex w-64 ...">`).

- [ ] **Step 3: Verify build still passes**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/providers/log-buffer-mount.tsx app/(dashboard)/layout.tsx
git commit -m "feat(feedback): mount log buffer on all authenticated routes"
```

---

### Task 4: Feedback email helper

**Files:**
- Create: `lib/feedback-email.ts`
- Test: `lib/__tests__/feedback-email.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/feedback-email.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findMany: vi.fn() },
  },
}))

const sendMock = vi.fn()
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send: sendMock } })),
}))

import { prisma } from '@/lib/prisma'
import { buildFeedbackEmail, sendFeedbackEmail } from '../feedback-email'

const baseSubmission = {
  id: 'fb_1',
  type: 'BUG' as const,
  message: 'Quiz won\'t submit on Module 3',
  url: 'https://example.com/training',
  userAgent: 'Mozilla/5.0',
  viewport: '1920x1080',
  clientLogs: [{ level: 'error', message: 'boom <script>', ts: 1700000000000 }],
  createdAt: new Date('2026-04-26T10:00:00Z'),
  user: { name: 'Alice', email: 'a@example.com', role: 'CAREGIVER' },
  organisation: { name: 'Example Org' },
}

describe('buildFeedbackEmail', () => {
  it('formats the subject as [Feedback - <Type>] <preview>', () => {
    const { subject } = buildFeedbackEmail(baseSubmission, 'http://x')
    expect(subject).toBe('[Feedback - Bug] Quiz won\'t submit on Module 3')
  })

  it('truncates long messages in the subject to 60 chars + ellipsis', () => {
    const long = 'x'.repeat(120)
    const { subject } = buildFeedbackEmail({ ...baseSubmission, message: long }, 'http://x')
    expect(subject).toBe(`[Feedback - Bug] ${'x'.repeat(60)}…`)
  })

  it('escapes HTML in message and log entries', () => {
    const { html } = buildFeedbackEmail(baseSubmission, 'http://x')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('includes a clickable admin link', () => {
    const { html } = buildFeedbackEmail(baseSubmission, 'https://app.example.com')
    expect(html).toContain('https://app.example.com/super-admin/feedback/fb_1')
  })
})

describe('sendFeedbackEmail', () => {
  beforeEach(() => {
    sendMock.mockReset()
    vi.mocked(prisma.user.findMany).mockReset()
    process.env.RESEND_API_KEY = 'test_key'
    process.env.NEXTAUTH_URL = 'https://app.example.com'
  })

  it('sends only to active SUPER_ADMINs', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { email: 'admin1@example.com' },
      { email: 'admin2@example.com' },
    ] as any)
    sendMock.mockResolvedValue({ data: {} })
    await sendFeedbackEmail(baseSubmission)
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { role: 'SUPER_ADMIN', active: true },
      select: { email: true },
    })
    expect(sendMock).toHaveBeenCalledOnce()
    const call = sendMock.mock.calls[0][0]
    expect(call.to).toEqual(['admin1@example.com', 'admin2@example.com'])
  })

  it('logs a warning and returns without throwing when there are no recipients', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([])
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(sendFeedbackEmail(baseSubmission)).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalled()
    expect(sendMock).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/__tests__/feedback-email.test.ts`
Expected: FAIL with "Cannot find module '../feedback-email'"

- [ ] **Step 3: Implement the helper**

Create `lib/feedback-email.ts`:

```typescript
import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'

export interface FeedbackEmailInput {
  id: string
  type: 'BUG' | 'SUGGESTION' | 'QUESTION' | 'OTHER'
  message: string
  url: string
  userAgent: string
  viewport: string
  clientLogs: Array<{ level: string; message: string; ts: number; source?: string }> | null
  createdAt: Date
  user: { name: string | null; email: string; role: string }
  organisation: { name: string } | null
}

const TYPE_LABEL: Record<FeedbackEmailInput['type'], string> = {
  BUG: 'Bug',
  SUGGESTION: 'Suggestion',
  QUESTION: 'Question',
  OTHER: 'Other',
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatLogLine(entry: { level: string; message: string; ts: number; source?: string }): string {
  const time = new Date(entry.ts).toISOString().slice(11, 19)
  const src = entry.source ? `  (${entry.source})` : ''
  return `[${time}] ${entry.level.padEnd(5)} ${entry.message}${src}`
}

export function buildFeedbackEmail(submission: FeedbackEmailInput, baseUrl: string) {
  const typeLabel = TYPE_LABEL[submission.type]
  const preview = submission.message.length > 60
    ? submission.message.slice(0, 60) + '…'
    : submission.message
  const subject = `[Feedback - ${typeLabel}] ${preview}`

  const logs = submission.clientLogs ?? []
  const logsText = logs.map(formatLogLine).join('\n')
  const logsHtml = logs.map((l) => escapeHtml(formatLogLine(l))).join('\n')

  const adminLink = `${baseUrl}/super-admin/feedback/${submission.id}`
  const orgName = submission.organisation?.name ?? '(no org)'
  const submitterName = submission.user.name ?? '(unnamed)'

  const html = `
    <div style="font-family: sans-serif; max-width: 640px; margin: 0 auto; color: #1f2937;">
      <h2 style="color: #f5821f; margin-bottom: 4px;">${escapeHtml(typeLabel)} feedback</h2>
      <p style="color: #6b7280; margin-top: 0;">Submitted ${escapeHtml(submission.createdAt.toISOString())}</p>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <tr><td style="padding: 4px 8px; color:#6b7280;">From</td><td style="padding: 4px 8px;">${escapeHtml(submitterName)} &lt;${escapeHtml(submission.user.email)}&gt;</td></tr>
        <tr><td style="padding: 4px 8px; color:#6b7280;">Role</td><td style="padding: 4px 8px;">${escapeHtml(submission.user.role)}</td></tr>
        <tr><td style="padding: 4px 8px; color:#6b7280;">Organisation</td><td style="padding: 4px 8px;">${escapeHtml(orgName)}</td></tr>
        <tr><td style="padding: 4px 8px; color:#6b7280;">Page</td><td style="padding: 4px 8px;"><a href="${escapeHtml(submission.url)}">${escapeHtml(submission.url)}</a></td></tr>
        <tr><td style="padding: 4px 8px; color:#6b7280;">Viewport</td><td style="padding: 4px 8px;">${escapeHtml(submission.viewport)}</td></tr>
        <tr><td style="padding: 4px 8px; color:#6b7280;">User agent</td><td style="padding: 4px 8px; font-size: 12px; color: #6b7280;">${escapeHtml(submission.userAgent)}</td></tr>
      </table>

      <h3 style="margin-bottom: 4px;">Message</h3>
      <pre style="white-space: pre-wrap; background: #f9fafb; border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; font-family: inherit; margin-top: 0;">${escapeHtml(submission.message)}</pre>

      ${logs.length > 0 ? `
      <details style="margin-top: 16px;">
        <summary style="cursor: pointer; color: #6b7280;">Recent client logs (${logs.length})</summary>
        <pre style="white-space: pre-wrap; background: #f3f4f6; border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; font-size: 12px; font-family: monospace;">${logsHtml}</pre>
      </details>` : ''}

      <p style="margin-top: 24px;">
        <a href="${escapeHtml(adminLink)}" style="display:inline-block;background:#f5821f;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">View in admin</a>
      </p>
    </div>
  `

  const text = [
    `${typeLabel} feedback`,
    `Submitted ${submission.createdAt.toISOString()}`,
    '',
    `From: ${submitterName} <${submission.user.email}>`,
    `Role: ${submission.user.role}`,
    `Organisation: ${orgName}`,
    `Page: ${submission.url}`,
    `Viewport: ${submission.viewport}`,
    `User agent: ${submission.userAgent}`,
    '',
    'Message:',
    submission.message,
    '',
    logs.length > 0 ? '=== Recent client logs ===' : '',
    logsText,
    '',
    `View in admin: ${adminLink}`,
  ].join('\n')

  return { subject, html, text }
}

export async function sendFeedbackEmail(submission: FeedbackEmailInput): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set — feedback email not sent', { submissionId: submission.id })
    return
  }

  const recipients = await prisma.user.findMany({
    where: { role: 'SUPER_ADMIN', active: true },
    select: { email: true },
  })

  if (recipients.length === 0) {
    console.warn('No active SUPER_ADMIN users — feedback email not sent', { submissionId: submission.id })
    return
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'https://asd-training-app-v2.vercel.app'
  const { subject, html, text } = buildFeedbackEmail(submission, baseUrl)

  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: 'Ambitious About Autism <onboarding@resend.dev>',
    to: recipients.map((r) => r.email),
    subject,
    html,
    text,
  })
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/__tests__/feedback-email.test.ts`
Expected: PASS — 6 tests

- [ ] **Step 5: Commit**

```bash
git add lib/feedback-email.ts lib/__tests__/feedback-email.test.ts
git commit -m "feat(feedback): add email builder + sender for feedback submissions"
```

---

### Task 5: Submit API route

**Files:**
- Create: `app/api/feedback/route.ts`
- Test: `app/api/feedback/__tests__/route.test.ts`
- Modify: `lib/rate-limit.ts` (add `feedbackLimiter`)

- [ ] **Step 1: Add the rate limiter**

In `lib/rate-limit.ts`, after the existing `inviteLimiter` line, add:

```typescript
// Feedback submit: 5 per 15 minutes per user
export const feedbackLimiter = createRateLimiter('feedback', 15 * 60 * 1000, 5)
```

- [ ] **Step 2: Write the failing test**

Create `app/api/feedback/__tests__/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    feedbackSubmission: { create: vi.fn() },
    user: { findMany: vi.fn().mockResolvedValue([]) },
  },
}))
vi.mock('@/lib/feedback-email', () => ({
  sendFeedbackEmail: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/rate-limit', async () => {
  const actual = await vi.importActual<typeof import('@/lib/rate-limit')>('@/lib/rate-limit')
  return { ...actual, feedbackLimiter: { check: vi.fn(() => ({ success: true })) } }
})

import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { sendFeedbackEmail } from '@/lib/feedback-email'
import { feedbackLimiter } from '@/lib/rate-limit'
import { POST } from '../route'

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/feedback', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

const validBody = {
  type: 'BUG',
  message: 'Quiz button is not clickable on iOS',
  url: 'https://example.com/training',
  userAgent: 'Mozilla/5.0',
  viewport: '375x667',
  clientLogs: [],
}

describe('POST /api/feedback', () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset()
    vi.mocked(prisma.feedbackSubmission.create).mockReset()
    vi.mocked(sendFeedbackEmail).mockClear()
    vi.mocked(feedbackLimiter.check).mockReturnValue({ success: true })
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate-limited', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1', organisationId: 'o1' } } as any)
    vi.mocked(feedbackLimiter.check).mockReturnValue({ success: false, retryAfterMs: 60000 })
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(429)
  })

  it('returns 400 when validation fails (message too short)', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1', organisationId: 'o1' } } as any)
    const res = await POST(makeRequest({ ...validBody, message: 'hi' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when too many client log entries', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1', organisationId: 'o1' } } as any)
    const tooMany = Array.from({ length: 51 }, (_, i) => ({ level: 'log', message: String(i), ts: 0 }))
    const res = await POST(makeRequest({ ...validBody, clientLogs: tooMany }))
    expect(res.status).toBe(400)
  })

  it('inserts submission with organisationId from session, not body', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1', organisationId: 'o-real' } } as any)
    vi.mocked(prisma.feedbackSubmission.create).mockResolvedValue({
      id: 'fb_1',
      type: 'BUG',
      message: validBody.message,
      url: validBody.url,
      userAgent: validBody.userAgent,
      viewport: validBody.viewport,
      clientLogs: [],
      createdAt: new Date(),
      user: { name: 'A', email: 'a@x', role: 'CAREGIVER' },
      organisation: null,
    } as any)
    const res = await POST(makeRequest({ ...validBody, organisationId: 'o-spoof' } as any))
    expect(res.status).toBe(200)
    const args = vi.mocked(prisma.feedbackSubmission.create).mock.calls[0][0]
    expect((args.data as any).organisationId).toBe('o-real')
  })

  it('does not 500 when email send fails', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1', organisationId: 'o1' } } as any)
    vi.mocked(prisma.feedbackSubmission.create).mockResolvedValue({
      id: 'fb_2',
      type: 'BUG', message: validBody.message, url: validBody.url, userAgent: validBody.userAgent,
      viewport: validBody.viewport, clientLogs: [], createdAt: new Date(),
      user: { name: 'A', email: 'a@x', role: 'CAREGIVER' }, organisation: null,
    } as any)
    vi.mocked(sendFeedbackEmail).mockRejectedValueOnce(new Error('resend down'))
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(200)
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run app/api/feedback/__tests__/route.test.ts`
Expected: FAIL with "Cannot find module '../route'"

- [ ] **Step 4: Implement the route**

Create `app/api/feedback/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { feedbackLimiter } from '@/lib/rate-limit'
import { sendFeedbackEmail } from '@/lib/feedback-email'

const logEntrySchema = z.object({
  level: z.enum(['log', 'info', 'warn', 'error']),
  message: z.string().max(2000),
  ts: z.number(),
  source: z.string().max(500).optional(),
})

const bodySchema = z.object({
  type: z.enum(['BUG', 'SUGGESTION', 'QUESTION', 'OTHER']),
  message: z.string().trim().min(10).max(5000),
  url: z.string().max(500),
  userAgent: z.string().max(500),
  viewport: z.string().regex(/^\d+x\d+$/),
  clientLogs: z.array(logEntrySchema).max(50),
})

function stripControlChars(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limit = feedbackLimiter.check(`u:${session.user.id}`)
  if (!limit.success) {
    return NextResponse.json(
      { error: 'You have sent feedback recently. Please wait a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) } }
    )
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }
  const data = parsed.data

  const submission = await prisma.feedbackSubmission.create({
    data: {
      userId: session.user.id,
      organisationId: session.user.organisationId ?? null,
      type: data.type,
      message: stripControlChars(data.message.trim()),
      url: data.url,
      userAgent: data.userAgent,
      viewport: data.viewport,
      clientLogs: data.clientLogs.map((l) => ({ ...l, message: l.message.slice(0, 2000) })),
    },
    include: {
      user: { select: { name: true, email: true, role: true } },
      organisation: { select: { name: true } },
    },
  })

  try {
    await sendFeedbackEmail({
      id: submission.id,
      type: submission.type,
      message: submission.message,
      url: submission.url,
      userAgent: submission.userAgent,
      viewport: submission.viewport,
      clientLogs: submission.clientLogs as any,
      createdAt: submission.createdAt,
      user: submission.user,
      organisation: submission.organisation,
    })
  } catch (err) {
    console.error('sendFeedbackEmail failed', { submissionId: submission.id, err })
  }

  return NextResponse.json({ id: submission.id })
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run app/api/feedback/__tests__/route.test.ts`
Expected: PASS — 6 tests

- [ ] **Step 6: Commit**

```bash
git add app/api/feedback/route.ts app/api/feedback/__tests__/route.test.ts lib/rate-limit.ts
git commit -m "feat(feedback): add POST /api/feedback submit route"
```

---

### Task 6: Feedback modal component

**Files:**
- Create: `components/feedback/feedback-modal.tsx`

- [ ] **Step 1: Create the modal**

Create `components/feedback/feedback-modal.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { getBufferedLogs } from '@/lib/client-log-buffer'

type FeedbackType = 'BUG' | 'SUGGESTION' | 'QUESTION' | 'OTHER'

const TYPES: { value: FeedbackType; label: string }[] = [
  { value: 'BUG', label: 'Bug' },
  { value: 'SUGGESTION', label: 'Suggestion' },
  { value: 'QUESTION', label: 'Question' },
  { value: 'OTHER', label: 'Other' },
]

interface FeedbackModalProps {
  open: boolean
  onClose: () => void
}

export function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const [type, setType] = useState<FeedbackType>('BUG')
  const [message, setMessage] = useState('')
  const [showContext, setShowContext] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submittedToast, setSubmittedToast] = useState(false)

  if (!open) return null

  function reset() {
    setType('BUG')
    setMessage('')
    setShowContext(false)
    setError(null)
    setSubmitting(false)
  }

  async function handleSubmit() {
    setError(null)
    if (message.trim().length < 10) {
      setError('Please give us a few more words — 10 characters minimum.')
      return
    }
    setSubmitting(true)
    try {
      const logs = getBufferedLogs()
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type,
          message: message.trim(),
          url: window.location.href,
          userAgent: navigator.userAgent,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          clientLogs: logs,
        }),
      })
      if (!res.ok) {
        if (res.status === 429) {
          setError('You have sent feedback recently. Please wait a few minutes.')
        } else if (res.status === 401) {
          setError('You are no longer signed in. Please refresh and try again.')
        } else {
          setError('Something went wrong sending your feedback. Please try again.')
        }
        setSubmitting(false)
        return
      }
      setSubmittedToast(true)
      setTimeout(() => {
        setSubmittedToast(false)
        reset()
        onClose()
      }, 1500)
    } catch {
      setError('Network error — please try again.')
      setSubmitting(false)
    }
  }

  const previewLogs = getBufferedLogs()

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Send feedback</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {submittedToast ? (
          <p className="text-emerald-700 dark:text-emerald-300 font-medium py-8 text-center">
            Thanks — we got it.
          </p>
        ) : (
          <>
            <fieldset className="mb-4">
              <legend className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Type</legend>
              <div className="flex flex-wrap gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    aria-pressed={type === t.value}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
                      type === t.value
                        ? 'bg-primary-500 border-primary-500 text-white'
                        : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="block mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor="fb-msg">
              What's on your mind?
            </label>
            <textarea
              id="fb-msg"
              rows={5}
              maxLength={5000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Describe what happened, what you expected, or your suggestion..."
            />
            <div className="text-right text-xs text-slate-500 dark:text-slate-400 mb-3">{message.length}/5000</div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              We'll also include the page URL, your browser, and recent error logs to help us fix it.{' '}
              <button
                type="button"
                onClick={() => setShowContext((v) => !v)}
                className="underline text-primary-600 dark:text-primary-400"
              >
                {showContext ? 'Hide' : 'Show'} what we're sending
              </button>
            </p>

            {showContext && (
              <pre className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 max-h-48 overflow-auto mb-3">
                {`URL: ${typeof window !== 'undefined' ? window.location.href : ''}
Viewport: ${typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : ''}
User agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : ''}

Recent logs (${previewLogs.length}):
${previewLogs.map((l) => `[${new Date(l.ts).toISOString().slice(11, 19)}] ${l.level} ${l.message}`).join('\n')}`}
              </pre>
            )}

            {error && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400 mb-3">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50"
              >
                {submitting ? 'Sending...' : 'Send'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build still passes**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/feedback/feedback-modal.tsx
git commit -m "feat(feedback): add feedback modal component"
```

---

### Task 7: Topbar Feedback button + modal wiring

**Files:**
- Modify: `components/layout/topbar.tsx`

- [ ] **Step 1: Wire the button + lazy-loaded modal**

Replace the contents of `components/layout/topbar.tsx` with:

```tsx
'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useSession } from 'next-auth/react'
import { Menu, MessageSquarePlus } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { getRoleLabel } from '@/lib/rbac'
import { useColorTheme } from '@/components/providers/color-theme-provider'
import { NotificationsBell } from './notifications-bell'
import { clsx } from 'clsx'

const FeedbackModal = dynamic(
  () => import('@/components/feedback/feedback-modal').then((m) => m.FeedbackModal),
  { ssr: false }
)

interface TopbarProps {
  onMenuClick: () => void
  title?: string
}

export function Topbar({ onMenuClick, title }: TopbarProps) {
  const { data: session } = useSession()
  const { colorTheme } = useColorTheme()
  const isClassic = colorTheme === 'classic'
  const isDark = colorTheme === 'dark'
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  const initials = session?.user?.name
    ? session.user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  void isClassic
  void isDark
  const headerBg = 'bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800'
  const iconColor =
    'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800'
  const titleColor = 'text-slate-900 dark:text-slate-100'
  const nameColor = titleColor
  const roleColor = 'text-slate-500 dark:text-slate-400'

  return (
    <>
      <header className={clsx('h-20 flex items-center justify-between px-4 md:px-6 flex-shrink-0', headerBg)}>
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className={clsx('md:hidden p-2 rounded-xl transition-colors', iconColor)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          {title && <h1 className={clsx('text-lg font-semibold hidden md:block', titleColor)}>{title}</h1>}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setFeedbackOpen(true)}
            className={clsx('flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors', iconColor)}
          >
            <MessageSquarePlus className="h-4 w-4" />
            <span className="hidden sm:inline">Feedback</span>
          </button>

          <ThemeToggle />

          <NotificationsBell iconClassName={iconColor} />

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
              <span className="text-xs font-bold text-white">{initials}</span>
            </div>
            <div className="hidden md:block">
              <p className={clsx('text-sm font-medium leading-tight', nameColor)}>{session?.user?.name || 'User'}</p>
              <p className={clsx('text-xs', roleColor)}>
                {session?.user?.role ? getRoleLabel(session.user.role) : 'User'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  )
}
```

- [ ] **Step 2: Verify build still passes**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/layout/topbar.tsx
git commit -m "feat(feedback): add Feedback button + modal to topbar"
```

---

### Task 8: Inbox list API

**Files:**
- Create: `app/api/super-admin/feedback/route.ts`
- Test: `app/api/super-admin/feedback/__tests__/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `app/api/super-admin/feedback/__tests__/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    feedbackSubmission: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}))

import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { GET } from '../route'

function makeReq(qs = '') {
  return new NextRequest(`http://localhost/api/super-admin/feedback${qs}`)
}

describe('GET /api/super-admin/feedback', () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset()
    vi.mocked(prisma.feedbackSubmission.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.feedbackSubmission.count).mockResolvedValue(0)
    vi.mocked(prisma.feedbackSubmission.groupBy).mockResolvedValue([] as any)
  })

  it('returns 403 for non-SUPER_ADMIN', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1', role: 'CHARITY_EMPLOYEE' } } as any)
    const res = await GET(makeReq())
    expect(res.status).toBe(403)
  })

  it('returns 403 for ORG_ADMIN', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1', role: 'ORG_ADMIN' } } as any)
    const res = await GET(makeReq())
    expect(res.status).toBe(403)
  })

  it('returns items + totals + statusCounts for SUPER_ADMIN', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1', role: 'SUPER_ADMIN' } } as any)
    vi.mocked(prisma.feedbackSubmission.findMany).mockResolvedValue([{ id: 'fb_1' }] as any)
    vi.mocked(prisma.feedbackSubmission.count).mockResolvedValue(1)
    vi.mocked(prisma.feedbackSubmission.groupBy).mockResolvedValue([
      { status: 'NEW', _count: { _all: 3 } } as any,
      { status: 'RESOLVED', _count: { _all: 2 } } as any,
    ])
    const res = await GET(makeReq())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.items).toHaveLength(1)
    expect(json.total).toBe(1)
    expect(json.statusCounts).toEqual({ NEW: 3, IN_PROGRESS: 0, RESOLVED: 2 })
  })

  it('passes status filter to findMany', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1', role: 'SUPER_ADMIN' } } as any)
    await GET(makeReq('?status=NEW'))
    const args = vi.mocked(prisma.feedbackSubmission.findMany).mock.calls[0][0]
    expect(args?.where).toMatchObject({ status: 'NEW' })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run app/api/super-admin/feedback/__tests__/route.test.ts`
Expected: FAIL with "Cannot find module '../route'"

- [ ] **Step 3: Implement the route**

Create `app/api/super-admin/feedback/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { FeedbackStatus, FeedbackType, Prisma } from '@prisma/client'

const PAGE_SIZE_DEFAULT = 25

const STATUSES: FeedbackStatus[] = ['NEW', 'IN_PROGRESS', 'RESOLVED']
const TYPES: FeedbackType[] = ['BUG', 'SUGGESTION', 'QUESTION', 'OTHER']

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const statusParam = searchParams.get('status')
  const typeParam = searchParams.get('type')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || String(PAGE_SIZE_DEFAULT), 10) || PAGE_SIZE_DEFAULT))

  const where: Prisma.FeedbackSubmissionWhereInput = {}
  if (statusParam && (STATUSES as string[]).includes(statusParam)) {
    where.status = statusParam as FeedbackStatus
  }
  if (typeParam && (TYPES as string[]).includes(typeParam)) {
    where.type = typeParam as FeedbackType
  }

  const [items, total, grouped] = await Promise.all([
    prisma.feedbackSubmission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        organisation: { select: { id: true, name: true } },
      },
    }),
    prisma.feedbackSubmission.count({ where }),
    prisma.feedbackSubmission.groupBy({ by: ['status'], _count: { _all: true } }),
  ])

  const statusCounts: Record<FeedbackStatus, number> = { NEW: 0, IN_PROGRESS: 0, RESOLVED: 0 }
  for (const row of grouped) {
    statusCounts[row.status as FeedbackStatus] = row._count._all
  }

  return NextResponse.json({ items, total, page, pageSize, statusCounts })
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run app/api/super-admin/feedback/__tests__/route.test.ts`
Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add app/api/super-admin/feedback/route.ts app/api/super-admin/feedback/__tests__/route.test.ts
git commit -m "feat(feedback): add GET /api/super-admin/feedback inbox list"
```

---

### Task 9: Inbox detail + PATCH API

**Files:**
- Create: `app/api/super-admin/feedback/[id]/route.ts`
- Modify: `app/api/super-admin/feedback/__tests__/route.test.ts` (add detail tests in same file by importing the [id] route)

> **Note:** Keeping detail tests in a separate file is cleaner. Create a new test file.

- [ ] **Step 1: Create the test file**

Create `app/api/super-admin/feedback/__tests__/detail.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    feedbackSubmission: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { GET, PATCH } from '../[id]/route'

function getReq() { return new NextRequest('http://localhost/api/super-admin/feedback/fb_1') }
function patchReq(body: unknown) {
  return new NextRequest('http://localhost/api/super-admin/feedback/fb_1', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}
const ctx = { params: Promise.resolve({ id: 'fb_1' }) }

describe('GET /api/super-admin/feedback/[id]', () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset()
    vi.mocked(prisma.feedbackSubmission.findUnique).mockReset()
  })

  it('403 for non-super-admin', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u', role: 'ORG_ADMIN' } } as any)
    const res = await GET(getReq(), ctx)
    expect(res.status).toBe(403)
  })

  it('404 when not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u', role: 'SUPER_ADMIN' } } as any)
    vi.mocked(prisma.feedbackSubmission.findUnique).mockResolvedValue(null)
    const res = await GET(getReq(), ctx)
    expect(res.status).toBe(404)
  })

  it('returns submission with user + organisation joined', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u', role: 'SUPER_ADMIN' } } as any)
    vi.mocked(prisma.feedbackSubmission.findUnique).mockResolvedValue({ id: 'fb_1' } as any)
    const res = await GET(getReq(), ctx)
    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.feedbackSubmission.findUnique).mock.calls[0][0]).toMatchObject({
      where: { id: 'fb_1' },
      include: expect.objectContaining({
        user: expect.any(Object),
        organisation: expect.any(Object),
        resolvedBy: expect.any(Object),
      }),
    })
  })
})

describe('PATCH /api/super-admin/feedback/[id]', () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset()
    vi.mocked(prisma.feedbackSubmission.update).mockReset()
    vi.mocked(prisma.feedbackSubmission.findUnique).mockReset()
  })

  it('403 for non-super-admin', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u', role: 'CHARITY_EMPLOYEE' } } as any)
    const res = await PATCH(patchReq({ status: 'RESOLVED' }), ctx)
    expect(res.status).toBe(403)
  })

  it('stamps resolvedAt and resolvedById when transitioning to RESOLVED', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'admin1', role: 'SUPER_ADMIN' } } as any)
    vi.mocked(prisma.feedbackSubmission.findUnique).mockResolvedValue({ status: 'NEW' } as any)
    vi.mocked(prisma.feedbackSubmission.update).mockResolvedValue({ id: 'fb_1' } as any)
    await PATCH(patchReq({ status: 'RESOLVED' }), ctx)
    const args = vi.mocked(prisma.feedbackSubmission.update).mock.calls[0][0]
    expect((args.data as any).resolvedAt).toBeInstanceOf(Date)
    expect((args.data as any).resolvedById).toBe('admin1')
  })

  it('clears resolvedAt and resolvedById when moving back to NEW', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'admin1', role: 'SUPER_ADMIN' } } as any)
    vi.mocked(prisma.feedbackSubmission.findUnique).mockResolvedValue({ status: 'RESOLVED' } as any)
    vi.mocked(prisma.feedbackSubmission.update).mockResolvedValue({ id: 'fb_1' } as any)
    await PATCH(patchReq({ status: 'NEW' }), ctx)
    const args = vi.mocked(prisma.feedbackSubmission.update).mock.calls[0][0]
    expect((args.data as any).resolvedAt).toBeNull()
    expect((args.data as any).resolvedById).toBeNull()
  })

  it('400 on invalid status', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'admin1', role: 'SUPER_ADMIN' } } as any)
    vi.mocked(prisma.feedbackSubmission.findUnique).mockResolvedValue({ status: 'NEW' } as any)
    const res = await PATCH(patchReq({ status: 'BOGUS' }), ctx)
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run app/api/super-admin/feedback/__tests__/detail.test.ts`
Expected: FAIL with "Cannot find module '../[id]/route'"

- [ ] **Step 3: Implement the route**

Create `app/api/super-admin/feedback/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const patchSchema = z.object({
  status: z.enum(['NEW', 'IN_PROGRESS', 'RESOLVED']).optional(),
  adminNotes: z.string().max(5000).nullable().optional(),
})

interface Ctx { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await ctx.params

  const submission = await prisma.feedbackSubmission.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      organisation: { select: { id: true, name: true } },
      resolvedBy: { select: { id: true, name: true, email: true } },
    },
  })

  if (!submission) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(submission)
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await ctx.params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const existing = await prisma.feedbackSubmission.findUnique({ where: { id }, select: { status: true } })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data: {
    status?: 'NEW' | 'IN_PROGRESS' | 'RESOLVED'
    adminNotes?: string | null
    resolvedAt?: Date | null
    resolvedById?: string | null
  } = {}
  if (parsed.data.status !== undefined) data.status = parsed.data.status
  if (parsed.data.adminNotes !== undefined) data.adminNotes = parsed.data.adminNotes

  if (parsed.data.status === 'RESOLVED' && existing.status !== 'RESOLVED') {
    data.resolvedAt = new Date()
    data.resolvedById = session.user.id
  }
  if (parsed.data.status && parsed.data.status !== 'RESOLVED' && existing.status === 'RESOLVED') {
    data.resolvedAt = null
    data.resolvedById = null
  }

  const updated = await prisma.feedbackSubmission.update({
    where: { id },
    data,
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      organisation: { select: { id: true, name: true } },
      resolvedBy: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json(updated)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run app/api/super-admin/feedback/__tests__/detail.test.ts`
Expected: PASS — 7 tests

- [ ] **Step 5: Commit**

```bash
git add app/api/super-admin/feedback/[id]/route.ts app/api/super-admin/feedback/__tests__/detail.test.ts
git commit -m "feat(feedback): add GET/PATCH /api/super-admin/feedback/[id]"
```

---

### Task 10: Inbox list page UI

**Files:**
- Create: `app/(super-admin)/super-admin/feedback/page.tsx`

- [ ] **Step 1: Create the page**

Create `app/(super-admin)/super-admin/feedback/page.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'

type Status = 'NEW' | 'IN_PROGRESS' | 'RESOLVED'
type Type = 'BUG' | 'SUGGESTION' | 'QUESTION' | 'OTHER'

interface Item {
  id: string
  type: Type
  message: string
  status: Status
  createdAt: string
  user: { id: string; name: string | null; email: string; role: string }
  organisation: { id: string; name: string } | null
}

interface ListResponse {
  items: Item[]
  total: number
  page: number
  pageSize: number
  statusCounts: Record<Status, number>
}

const STATUS_BADGE: Record<Status, string> = {
  NEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  IN_PROGRESS: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  RESOLVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
}

const TYPE_LABEL: Record<Type, string> = { BUG: 'Bug', SUGGESTION: 'Suggestion', QUESTION: 'Question', OTHER: 'Other' }

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const m = Math.round(diffMs / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  return `${d}d ago`
}

export default function FeedbackInboxPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const status = searchParams.get('status') as Status | null
  const type = searchParams.get('type') as Type | null

  const [data, setData] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (status) qs.set('status', status)
    if (type) qs.set('type', type)
    fetch(`/api/super-admin/feedback?${qs.toString()}`)
      .then((r) => r.json())
      .then((json: ListResponse) => setData(json))
      .finally(() => setLoading(false))
  }, [status, type])

  function setFilter(key: 'status' | 'type', value: string | null) {
    const qs = new URLSearchParams(searchParams.toString())
    if (value) qs.set(key, value)
    else qs.delete(key)
    router.push(`/super-admin/feedback?${qs.toString()}`)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Feedback</h1>

      <div className="flex flex-wrap gap-2">
        {(['ALL', 'NEW', 'IN_PROGRESS', 'RESOLVED'] as const).map((s) => {
          const active = (s === 'ALL' && !status) || s === status
          const count = s === 'ALL' ? null : data?.statusCounts[s as Status] ?? 0
          return (
            <button
              key={s}
              onClick={() => setFilter('status', s === 'ALL' ? null : s)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
                active
                  ? 'bg-primary-500 border-primary-500 text-white'
                  : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'
              }`}
            >
              {s === 'ALL' ? 'All' : s.replace('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
              {count !== null && <span className="ml-1.5 text-xs opacity-75">({count})</span>}
            </button>
          )
        })}

        <select
          value={type ?? ''}
          onChange={(e) => setFilter('type', e.target.value || null)}
          className="ml-auto px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200"
        >
          <option value="">All types</option>
          <option value="BUG">Bug</option>
          <option value="SUGGESTION">Suggestion</option>
          <option value="QUESTION">Question</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <p className="p-6 text-slate-500 dark:text-slate-400">Loading...</p>
        ) : !data || data.items.length === 0 ? (
          <p className="p-6 text-slate-500 dark:text-slate-400">No feedback yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 text-left text-slate-600 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Submitter</th>
                <th className="px-4 py-3 font-medium">Org</th>
                <th className="px-4 py-3 font-medium">Message</th>
                <th className="px-4 py-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => router.push(`/super-admin/feedback/${item.id}`)}
                  className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[item.status]}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">{TYPE_LABEL[item.type]}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{item.user.name ?? '(unnamed)'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{item.user.role}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{item.organisation?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-md truncate">{item.message}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{relativeTime(item.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        <Link href="/super-admin" className="hover:underline">← Back to overview</Link>
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Verify build still passes**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/(super-admin)/super-admin/feedback/page.tsx
git commit -m "feat(feedback): add inbox list page"
```

---

### Task 11: Inbox detail page UI

**Files:**
- Create: `app/(super-admin)/super-admin/feedback/[id]/page.tsx`

- [ ] **Step 1: Create the page**

Create `app/(super-admin)/super-admin/feedback/[id]/page.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

type Status = 'NEW' | 'IN_PROGRESS' | 'RESOLVED'
type Type = 'BUG' | 'SUGGESTION' | 'QUESTION' | 'OTHER'

interface LogEntry { level: string; message: string; ts: number; source?: string }

interface Detail {
  id: string
  type: Type
  message: string
  url: string
  userAgent: string
  viewport: string
  clientLogs: LogEntry[] | null
  status: Status
  adminNotes: string | null
  resolvedAt: string | null
  resolvedBy: { name: string | null; email: string } | null
  createdAt: string
  user: { id: string; name: string | null; email: string; role: string }
  organisation: { id: string; name: string } | null
}

const STATUS_BADGE: Record<Status, string> = {
  NEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  IN_PROGRESS: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  RESOLVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
}

export default function FeedbackDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [item, setItem] = useState<Detail | null>(null)
  const [status, setStatus] = useState<Status>('NEW')
  const [adminNotes, setAdminNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/super-admin/feedback/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((json: Detail) => {
        setItem(json)
        setStatus(json.status)
        setAdminNotes(json.adminNotes ?? '')
      })
      .catch(() => setError('Failed to load feedback'))
  }, [id])

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/super-admin/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status, adminNotes }),
      })
      if (!res.ok) {
        setError('Failed to save')
      } else {
        const updated: Detail = await res.json()
        setItem(updated)
      }
    } finally {
      setSaving(false)
    }
  }

  if (!item) {
    return <p className="text-slate-500 dark:text-slate-400">{error ?? 'Loading...'}</p>
  }

  return (
    <div className="space-y-4">
      <Link href="/super-admin/feedback" className="text-sm text-slate-500 dark:text-slate-400 hover:underline">
        ← Back to feedback
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[item.status]}`}>
                {item.status.replace('_', ' ')}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                {item.type}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(item.createdAt).toLocaleString()}</span>
            </div>
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">From</h2>
            <p className="text-slate-900 dark:text-slate-100">
              {item.user.name ?? '(unnamed)'} &lt;{item.user.email}&gt; — {item.user.role}
              {item.organisation && <> @ {item.organisation.name}</>}
            </p>

            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-4 mb-1">Page</h2>
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline break-all">
              {item.url}
            </a>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Viewport {item.viewport} · {item.userAgent}
            </p>

            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-4 mb-1">Message</h2>
            <pre className="whitespace-pre-wrap text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-sans">
{item.message}
            </pre>

            {item.clientLogs && item.clientLogs.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Recent client logs ({item.clientLogs.length})
                </summary>
                <pre className="mt-2 whitespace-pre-wrap text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 max-h-96 overflow-auto">
{item.clientLogs.map((l) => `[${new Date(l.ts).toISOString().slice(11, 19)}] ${l.level} ${l.message}${l.source ? `  (${l.source})` : ''}`).join('\n')}
                </pre>
              </details>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
            >
              <option value="NEW">New</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Admin notes</label>
            <textarea
              rows={6}
              maxLength={5000}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
            />
          </div>

          {item.resolvedAt && item.resolvedBy && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Resolved by {item.resolvedBy.name ?? item.resolvedBy.email} on{' '}
              {new Date(item.resolvedAt).toLocaleString()}
            </p>
          )}

          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            onClick={save}
            disabled={saving}
            className="w-full px-4 py-2 rounded-xl text-sm font-semibold bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build still passes**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/(super-admin)/super-admin/feedback/[id]/page.tsx
git commit -m "feat(feedback): add inbox detail page with status + notes"
```

---

### Task 12: Sidebar entry + NEW count pill

**Files:**
- Modify: `components/layout/super-admin-sidebar.tsx`

- [ ] **Step 1: Add the nav item**

In `components/layout/super-admin-sidebar.tsx`:

1. Add `MessageSquare` to the lucide-react import block (line 6–17 area):

```tsx
import {
  LayoutDashboard,
  Building2,
  BarChart3,
  LogOut,
  X,
  Users,
  Settings,
  Package,
  Home,
  CreditCard,
  MessageSquare,
} from 'lucide-react'
```

2. In the `NAV_ITEMS` array, insert a new entry alphabetically (`Feedback` comes after `Home Page` since "F" < "H" — but the existing list keeps Overview first, so insert before `{ href: '/home', label: 'Home Page', ... }`):

```tsx
  { href: '/super-admin/feedback', label: 'Feedback', icon: MessageSquare, charityAdminOnly: true },
```

> **Alphabetical position:** Overview stays first. Then alphabetical: Feedback, Home Page, Organisations, Products, Reports, Subscribers, Users.

- [ ] **Step 2: Add the NEW count pill**

At the top of the `SuperAdminSidebar` component (after `const charityPermissions ...`), add a state + effect to fetch the count, and render it inside the Feedback link.

Add the imports at the top of the file (with the others):

```tsx
import { useEffect, useState } from 'react'
```

Inside the component body, after the existing `charityPermissions` line:

```tsx
  const [newFeedbackCount, setNewFeedbackCount] = useState(0)
  useEffect(() => {
    if (role !== 'SUPER_ADMIN') return
    fetch('/api/super-admin/feedback?status=NEW&pageSize=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.statusCounts) setNewFeedbackCount(j.statusCounts.NEW || 0)
      })
      .catch(() => {})
  }, [role])
```

Then in the `visibleItems.map(...)` block, replace the `{item.label}` line with:

```tsx
              <span className="flex-1">{item.label}</span>
              {item.href === '/super-admin/feedback' && newFeedbackCount > 0 && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
                  {newFeedbackCount}
                </span>
              )}
```

(Wrap the existing `{item.label}` in a `<span className="flex-1">` so the pill aligns to the right.)

- [ ] **Step 3: Verify build still passes**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/layout/super-admin-sidebar.tsx
git commit -m "feat(feedback): add Feedback to super admin sidebar with NEW count"
```

---

### Task 13: E2E test

**Files:**
- Create: `tests/e2e/feedback.spec.ts`

- [ ] **Step 1: Discover the existing E2E auth helper pattern**

Run: `ls tests/e2e/`
Read one of the existing specs to find the login helper used (e.g. `tests/e2e/auth.spec.ts` or similar). Match that pattern.

- [ ] **Step 2: Write the E2E test**

Create `tests/e2e/feedback.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

// Assumes seed users from prisma/seed.ts:
//  - caregiver@example.com / password
//  - admin@example.com    / password (SUPER_ADMIN)
// If your seed differs, adjust accordingly.

test.describe('Feedback', () => {
  test('caregiver submits → super admin sees + resolves', async ({ page, browser }) => {
    // 1) Caregiver logs in and submits feedback
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('caregiver@example.com')
    await page.getByLabel(/password/i).fill('password')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.getByRole('button', { name: /feedback/i }).click()
    await page.getByRole('button', { name: 'Bug' }).click()
    await page.getByLabel(/what's on your mind/i).fill('Quiz button not clickable on the iOS demo page')
    await page.getByRole('button', { name: /^send$/i }).click()
    await expect(page.getByText(/thanks — we got it/i)).toBeVisible()

    // 2) Super admin in a separate context resolves it
    const adminContext = await browser.newContext()
    const adminPage = await adminContext.newPage()
    await adminPage.goto('/login')
    await adminPage.getByLabel(/email/i).fill('admin@example.com')
    await adminPage.getByLabel(/password/i).fill('password')
    await adminPage.getByRole('button', { name: /sign in/i }).click()

    await adminPage.goto('/super-admin/feedback')
    await expect(adminPage.getByText('Quiz button not clickable on the iOS demo page')).toBeVisible()
    await adminPage.getByText('Quiz button not clickable on the iOS demo page').click()

    await adminPage.getByLabel(/status/i).selectOption('RESOLVED')
    await adminPage.getByRole('button', { name: /^save$/i }).click()
    await expect(adminPage.getByText(/resolved by/i)).toBeVisible()

    await adminContext.close()
  })
})
```

> **Note:** Adjust seed credentials if `prisma/seed.ts` uses different ones. Check that file before running.

- [ ] **Step 3: Run the E2E test**

Run: `npm run test:e2e -- feedback.spec.ts`
Expected: PASS.

> If the test fails because of missing seed users or different credentials, fix the credential strings to match `prisma/seed.ts` and re-run. Do not change the production behaviour to make the test pass.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/feedback.spec.ts
git commit -m "test(feedback): add E2E test for submit + resolve flow"
```

---

### Task 14: Production push + deploy

**Files:**
- None (deploy task)

- [ ] **Step 1: Run the full unit test suite**

Run: `npm run test`
Expected: All tests pass.

- [ ] **Step 2: Run the full build**

Run: `npm run build`
Expected: Prisma generate + vitest run + Next build all succeed.

- [ ] **Step 3: Push schema to production Neon branch**

Run:
```bash
npx vercel env pull .env.production --environment production --yes
npx dotenv-cli -e .env.production -- npx prisma db push
```
Expected: `Your database is now in sync with your Prisma schema.` against the production branch.

> Per CLAUDE.md, both dev and production Neon branches must be migrated before deploy or production crashes querying the new table.

- [ ] **Step 4: Push to main (Vercel auto-deploys)**

Run:
```bash
git push origin main
```

Per the user's `feedback_deploy` memory, never run `vercel deploy --prod` manually after a push — the Vercel GitHub integration auto-deploys.

- [ ] **Step 5: Smoke-test the deployed feature**

In a browser at https://asd-training-app-v2.vercel.app:
1. Log in as a charity admin → `/super-admin/feedback` loads with empty state.
2. Log in as a caregiver → click **Feedback** in topbar → submit a test "Bug" with message "Smoke test from production". Confirm toast.
3. Back as charity admin → reload `/super-admin/feedback` → see the row, click in, mark RESOLVED, confirm save. Check inbox for the email.

- [ ] **Step 6: Mark plan complete**

If everything works, the plan is done. If anything fails, open a follow-up task — do not push fixes via the deploy step alone.

---

## Self-Review Notes

- **Spec coverage:** every section of the spec maps to one or more tasks above. The data model, log buffer, modal, submit API, email, inbox APIs, inbox UI, sidebar entry, tests, and rollout are each covered.
- **Placeholders:** none — every step has concrete code, exact paths, and expected output.
- **Type consistency:** `FeedbackType`, `FeedbackStatus`, `LogEntry`, `Status`, `Type` aliases are consistent across tasks. `getBufferedLogs()` is the same signature in Task 2 (definition), Task 6 (consumer in modal), and the preview block. `feedbackLimiter` is added in Task 5 step 1 and consumed in step 4. `sendFeedbackEmail` and `buildFeedbackEmail` shapes match between Task 4 (defines them) and Task 5 (consumes `sendFeedbackEmail`).
- **Spec gap caught and added:** the spec said the sidebar would show a count of NEW items, refreshed on page load. Task 12 adds this explicitly.
