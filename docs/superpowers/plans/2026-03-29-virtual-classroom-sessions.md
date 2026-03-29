# Virtual Classroom Sessions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add org-scoped virtual classroom sessions with Zoom/Teams/custom links, host assignment, attendee management, and attendance tracking.

**Architecture:** New Prisma models (Session, SessionAttendee, OrgMeetingConfig) with CRUD API routes under `/api/admin/sessions/`. Org admin pages for session management, a user-facing sessions page for hosts/attendees, and dashboard integration showing upcoming sessions. Meeting auto-generation via Zoom/Teams APIs when orgs configure their credentials.

**Tech Stack:** Next.js 14, Prisma, Neon PostgreSQL, Tailwind CSS, Lucide icons, Zoom API (Server-to-Server OAuth), Microsoft Graph API

---

## File Structure

### New Files
- `prisma/schema.prisma` — add Session, SessionAttendee, OrgMeetingConfig models + enums
- `lib/sessions.ts` — session data access helpers
- `lib/meetings.ts` — Zoom/Teams API integration for auto-generating meeting links
- `app/api/admin/sessions/route.ts` — GET list / POST create session
- `app/api/admin/sessions/[sessionId]/route.ts` — GET / PATCH / DELETE session
- `app/api/admin/sessions/[sessionId]/attendees/route.ts` — PUT replace attendees
- `app/api/admin/sessions/[sessionId]/attendance/route.ts` — PATCH bulk attendance
- `app/api/admin/sessions/[sessionId]/generate-meeting/route.ts` — POST auto-generate meeting link
- `app/api/admin/settings/meetings/route.ts` — GET / PUT meeting config
- `app/api/admin/settings/meetings/test/route.ts` — POST test connection
- `app/api/sessions/upcoming/route.ts` — GET upcoming sessions for current user
- `app/api/sessions/[sessionId]/route.ts` — GET / PATCH session (host access)
- `app/(org-admin)/admin/sessions/page.tsx` — session list page
- `app/(org-admin)/admin/sessions/new/page.tsx` — create session page
- `app/(org-admin)/admin/sessions/[sessionId]/page.tsx` — session detail/edit page
- `app/(org-admin)/admin/settings/meetings/page.tsx` — meeting integration config page
- `app/(dashboard)/sessions/page.tsx` — user-facing sessions list
- `app/(dashboard)/sessions/[sessionId]/page.tsx` — user-facing session detail (host can edit)
- `components/dashboard/upcoming-sessions.tsx` — dashboard card for upcoming sessions

### Modified Files
- `components/layout/org-admin-sidebar.tsx` — add Sessions + Meeting Settings nav items
- `components/layout/sidebar.tsx` — add Sessions nav item for leaf roles
- `app/(dashboard)/dashboard/page.tsx` — add upcoming sessions card
- `middleware.ts` — allow hosts to access `/admin/sessions/*` (or use `/sessions/*` route)

---

### Task 1: Add Prisma Models and Push Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add enums and models to schema**

Add the following new enums and models to `prisma/schema.prisma`. Also add the relation fields to the existing `User` and `Organisation` models.

New enums (add before the existing `Role` enum):
```prisma
enum MeetingPlatform {
  ZOOM
  TEAMS
  CUSTOM
}

enum SessionStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
```

New models (add after the existing QuizQuestion model):
```prisma
model Session {
  id             String          @id @default(cuid())
  title          String
  description    String?         @db.Text
  scheduledAt    DateTime
  duration       Int
  meetingUrl     String?
  recordingUrl   String?
  platform       MeetingPlatform @default(CUSTOM)
  status         SessionStatus   @default(SCHEDULED)
  hostId         String
  createdById    String
  organisationId String
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  host         User              @relation("SessionHost", fields: [hostId], references: [id])
  createdBy    User              @relation("SessionCreator", fields: [createdById], references: [id])
  organisation Organisation      @relation(fields: [organisationId], references: [id])
  attendees    SessionAttendee[]
}

model SessionAttendee {
  id        String    @id @default(cuid())
  sessionId String
  userId    String
  attended  Boolean   @default(false)
  joinedAt  DateTime?

  session Session @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([sessionId, userId])
}

model OrgMeetingConfig {
  id             String          @id @default(cuid())
  organisationId String          @unique
  platform       MeetingPlatform
  apiKey         String?
  apiSecret      String?
  tenantId       String?
  configured     Boolean         @default(false)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  organisation Organisation @relation(fields: [organisationId], references: [id])
}
```

Add to the existing `User` model:
```prisma
hostedSessions   Session[]          @relation("SessionHost")
createdSessions  Session[]          @relation("SessionCreator")
sessionAttendees SessionAttendee[]
```

Add to the existing `Organisation` model:
```prisma
sessions      Session[]
meetingConfig OrgMeetingConfig?
```

- [ ] **Step 2: Push schema to database**

```bash
cp .env.local .env
# Ensure .env has DATABASE_URL and DIRECT_URL
npx prisma db push
rm .env
```

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add Session, SessionAttendee, OrgMeetingConfig models"
```

---

### Task 2: Session Data Access Layer

**Files:**
- Create: `lib/sessions.ts`

- [ ] **Step 1: Create lib/sessions.ts**

```typescript
import prisma from './prisma'
import type { Session, SessionAttendee, SessionStatus, MeetingPlatform } from '@prisma/client'

export type SessionWithDetails = Session & {
  host: { id: string; name: string | null; email: string }
  createdBy: { id: string; name: string | null }
  attendees: (SessionAttendee & { user: { id: string; name: string | null; email: string; role: string } })[]
  _count: { attendees: number }
}

const SESSION_INCLUDE = {
  host: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true } },
  attendees: {
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { user: { name: 'asc' as const } },
  },
  _count: { select: { attendees: true } },
}

export async function getOrgSessions(orgId: string, status?: SessionStatus) {
  const where: Record<string, unknown> = { organisationId: orgId }
  if (status) where.status = status
  return prisma.session.findMany({
    where,
    include: SESSION_INCLUDE,
    orderBy: { scheduledAt: 'desc' },
  })
}

export async function getSessionById(sessionId: string) {
  return prisma.session.findUnique({
    where: { id: sessionId },
    include: SESSION_INCLUDE,
  })
}

export async function getUpcomingSessions(userId: string) {
  return prisma.session.findMany({
    where: {
      status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      scheduledAt: { gte: new Date() },
      OR: [
        { attendees: { some: { userId } } },
        { hostId: userId },
      ],
    },
    include: {
      host: { select: { id: true, name: true, email: true } },
      _count: { select: { attendees: true } },
    },
    orderBy: { scheduledAt: 'asc' },
    take: 10,
  })
}

export async function resolveAttendees(
  orgId: string,
  selection: { allRoles?: boolean; roles?: string[]; userIds?: string[] }
): Promise<string[]> {
  const userIds = new Set<string>(selection.userIds ?? [])

  if (selection.allRoles) {
    const users = await prisma.user.findMany({
      where: { organisationId: orgId, active: true, role: { notIn: ['SUPER_ADMIN', 'ORG_ADMIN'] } },
      select: { id: true },
    })
    users.forEach((u) => userIds.add(u.id))
  } else if (selection.roles && selection.roles.length > 0) {
    const users = await prisma.user.findMany({
      where: { organisationId: orgId, active: true, role: { in: selection.roles as any } },
      select: { id: true },
    })
    users.forEach((u) => userIds.add(u.id))
  }

  return [...userIds]
}

export function canManageSession(
  session: { hostId: string; organisationId: string },
  user: { id: string; role: string; organisationId?: string | null }
): boolean {
  if (user.role === 'ORG_ADMIN' && user.organisationId === session.organisationId) return true
  if (session.hostId === user.id) return true
  return false
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/sessions.ts
git commit -m "feat: add session data access layer"
```

---

### Task 3: Meeting Integration (Zoom/Teams API)

**Files:**
- Create: `lib/meetings.ts`

- [ ] **Step 1: Create lib/meetings.ts**

```typescript
import prisma from './prisma'

interface MeetingResult {
  success: boolean
  meetingUrl?: string
  error?: string
}

async function getZoomAccessToken(accountId: string, clientId: string, clientSecret: string): Promise<string> {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`, {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  if (!res.ok) throw new Error(`Zoom auth failed: ${res.status}`)
  const data = await res.json()
  return data.access_token
}

export async function createZoomMeeting(
  accountId: string,
  clientId: string,
  clientSecret: string,
  title: string,
  scheduledAt: Date,
  duration: number
): Promise<MeetingResult> {
  try {
    const token = await getZoomAccessToken(accountId, clientId, clientSecret)
    const res = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: title,
        type: 2, // scheduled
        start_time: scheduledAt.toISOString(),
        duration,
        settings: { join_before_host: true, waiting_room: false },
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { success: false, error: err.message || `Zoom API error: ${res.status}` }
    }
    const data = await res.json()
    return { success: true, meetingUrl: data.join_url }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Zoom API error' }
  }
}

export async function createTeamsMeeting(
  clientId: string,
  clientSecret: string,
  tenantId: string,
  title: string,
  scheduledAt: Date,
  duration: number
): Promise<MeetingResult> {
  try {
    // Get access token via client credentials flow
    const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }),
    })
    if (!tokenRes.ok) throw new Error(`Teams auth failed: ${tokenRes.status}`)
    const tokenData = await tokenRes.json()
    const token = tokenData.access_token

    const endTime = new Date(scheduledAt.getTime() + duration * 60000)
    const res = await fetch('https://graph.microsoft.com/v1.0/communications/onlineMeetings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: title,
        startDateTime: scheduledAt.toISOString(),
        endDateTime: endTime.toISOString(),
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { success: false, error: err.error?.message || `Teams API error: ${res.status}` }
    }
    const data = await res.json()
    return { success: true, meetingUrl: data.joinWebUrl }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Teams API error' }
  }
}

export async function generateMeetingLink(
  orgId: string,
  title: string,
  scheduledAt: Date,
  duration: number
): Promise<MeetingResult> {
  const config = await prisma.orgMeetingConfig.findUnique({ where: { organisationId: orgId } })
  if (!config || !config.configured || !config.apiKey || !config.apiSecret) {
    return { success: false, error: 'Meeting integration not configured for this organisation' }
  }

  if (config.platform === 'ZOOM') {
    return createZoomMeeting(config.apiKey, config.apiKey, config.apiSecret, title, scheduledAt, duration)
  }

  if (config.platform === 'TEAMS') {
    if (!config.tenantId) return { success: false, error: 'Teams tenant ID not configured' }
    return createTeamsMeeting(config.apiKey, config.apiSecret, config.tenantId, title, scheduledAt, duration)
  }

  return { success: false, error: 'Unsupported platform' }
}

export async function testMeetingConnection(
  platform: string,
  apiKey: string,
  apiSecret: string,
  tenantId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (platform === 'ZOOM') {
      await getZoomAccessToken(apiKey, apiKey, apiSecret)
      return { success: true }
    }
    if (platform === 'TEAMS') {
      if (!tenantId) return { success: false, error: 'Tenant ID required for Teams' }
      const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: apiKey,
          client_secret: apiSecret,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }),
      })
      if (!res.ok) return { success: false, error: `Authentication failed: ${res.status}` }
      return { success: true }
    }
    return { success: false, error: 'Unsupported platform' }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Connection failed' }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/meetings.ts
git commit -m "feat: add Zoom and Teams meeting API integration"
```

---

### Task 4: Session CRUD API Routes

**Files:**
- Create: `app/api/admin/sessions/route.ts`
- Create: `app/api/admin/sessions/[sessionId]/route.ts`

- [ ] **Step 1: Create session list + create route**

`app/api/admin/sessions/route.ts`:
- GET: returns all sessions for the user's org. Auth: ORG_ADMIN or any user who is a host in this org. Filter by `status` query param.
- POST: creates a session. Body: `{ title, description?, scheduledAt, duration, platform, meetingUrl?, hostId, attendees: { allRoles?, roles?, userIds? } }`. Uses `resolveAttendees()` to create SessionAttendee rows. Auth: ORG_ADMIN or the designated host.

- [ ] **Step 2: Create single session route**

`app/api/admin/sessions/[sessionId]/route.ts`:
- GET: returns session with attendees. Auth: `canManageSession()`.
- PATCH: updates session fields. Auth: `canManageSession()`.
- DELETE: deletes session + cascading attendees. Auth: ORG_ADMIN only.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/sessions/
git commit -m "feat: add session CRUD API routes"
```

---

### Task 5: Attendee, Attendance, and Meeting Generation API Routes

**Files:**
- Create: `app/api/admin/sessions/[sessionId]/attendees/route.ts`
- Create: `app/api/admin/sessions/[sessionId]/attendance/route.ts`
- Create: `app/api/admin/sessions/[sessionId]/generate-meeting/route.ts`

- [ ] **Step 1: Create attendee replacement route**

`app/api/admin/sessions/[sessionId]/attendees/route.ts`:
- PUT: replaces all attendees. Body: `{ allRoles?, roles?, userIds? }`. Deletes existing SessionAttendee rows, resolves new selection, creates new rows. Auth: `canManageSession()`.

- [ ] **Step 2: Create attendance route**

`app/api/admin/sessions/[sessionId]/attendance/route.ts`:
- PATCH: bulk update attendance. Body: `{ attendees: [{ userId, attended, joinedAt? }] }`. Auth: `canManageSession()`.

- [ ] **Step 3: Create meeting generation route**

`app/api/admin/sessions/[sessionId]/generate-meeting/route.ts`:
- POST: calls `generateMeetingLink()` from `lib/meetings.ts`, stores URL on session. Auth: `canManageSession()`.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/sessions/
git commit -m "feat: add attendee, attendance, and meeting generation API routes"
```

---

### Task 6: Meeting Config API Routes

**Files:**
- Create: `app/api/admin/settings/meetings/route.ts`
- Create: `app/api/admin/settings/meetings/test/route.ts`

- [ ] **Step 1: Create meeting config CRUD**

`app/api/admin/settings/meetings/route.ts`:
- GET: returns OrgMeetingConfig for user's org (or null). Auth: ORG_ADMIN.
- PUT: creates or updates config. Body: `{ platform, apiKey, apiSecret, tenantId? }`. Sets `configured: true` if all required fields present. Auth: ORG_ADMIN.

- [ ] **Step 2: Create test connection route**

`app/api/admin/settings/meetings/test/route.ts`:
- POST: calls `testMeetingConnection()`. Body: `{ platform, apiKey, apiSecret, tenantId? }`. Auth: ORG_ADMIN.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/settings/
git commit -m "feat: add meeting config API routes"
```

---

### Task 7: User-Facing Session API Routes

**Files:**
- Create: `app/api/sessions/upcoming/route.ts`
- Create: `app/api/sessions/[sessionId]/route.ts`

- [ ] **Step 1: Create upcoming sessions route**

`app/api/sessions/upcoming/route.ts`:
- GET: returns upcoming sessions the user is invited to or hosting. Uses `getUpcomingSessions()`. Auth: any authenticated user.

- [ ] **Step 2: Create user-facing session detail route**

`app/api/sessions/[sessionId]/route.ts`:
- GET: returns session detail. Auth: user must be attendee, host, or org admin.
- PATCH: updates session fields. Auth: host only (uses `canManageSession()`).

- [ ] **Step 3: Commit**

```bash
git add app/api/sessions/
git commit -m "feat: add user-facing session API routes"
```

---

### Task 8: Update Sidebars

**Files:**
- Modify: `components/layout/org-admin-sidebar.tsx`
- Modify: `components/layout/sidebar.tsx`

- [ ] **Step 1: Add Sessions and Meeting Settings to org admin sidebar**

In `components/layout/org-admin-sidebar.tsx`, add `Calendar` and `Video` to the lucide-react import. Update NAV_ITEMS:

```typescript
const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Users', icon: Users, exact: true },
  { href: '/admin/sessions', label: 'Sessions', icon: Calendar },
  { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/settings/meetings', label: 'Meeting Settings', icon: Video },
]
```

- [ ] **Step 2: Add Sessions to main sidebar**

In `components/layout/sidebar.tsx`, add `Calendar` to the lucide-react import. Add sessions link before Settings for all leaf roles:

```typescript
items.push({ href: '/sessions', label: 'Sessions', icon: Calendar })
items.push({ href: '/settings', label: 'Settings', icon: Settings })
```

- [ ] **Step 3: Commit**

```bash
git add components/layout/org-admin-sidebar.tsx components/layout/sidebar.tsx
git commit -m "feat: add Sessions nav items to sidebars"
```

---

### Task 9: Org Admin Session List Page

**Files:**
- Create: `app/(org-admin)/admin/sessions/page.tsx`

- [ ] **Step 1: Create session list page**

Client component that fetches sessions from `GET /api/admin/sessions`. Shows:
- Page header "Virtual Classroom Sessions" with "Create Session" button
- Filter tabs: All / Upcoming / Completed / Cancelled
- Session cards with: title, date/time, host name, platform badge (Zoom blue, Teams purple, Custom grey), attendee count, status badge (Scheduled green, In Progress amber, Completed sage, Cancelled red)
- Click card → link to `/admin/sessions/[sessionId]`
- Empty state with Calendar icon

Follow existing org admin page patterns (card styling, badges, dark mode).

- [ ] **Step 2: Commit**

```bash
git add "app/(org-admin)/admin/sessions/page.tsx"
git commit -m "feat: add org admin session list page"
```

---

### Task 10: Org Admin Create Session Page

**Files:**
- Create: `app/(org-admin)/admin/sessions/new/page.tsx`

- [ ] **Step 1: Create session form page**

Client component with form fields:
- Title (text input, required)
- Description (textarea, optional)
- Date & Time (datetime-local input, required)
- Duration (number input, minutes, default 60)
- Platform (dropdown: Zoom / Microsoft Teams / Custom Link)
- Meeting Link (text input) + "Auto-generate" button (shown if org has meeting config for selected platform — check via `GET /api/admin/settings/meetings`)
- Host (searchable dropdown of org users — fetch from `GET /api/admin/users`)
- Attendee selection:
  - "All members" toggle
  - Role checkboxes (CAREGIVER, CAREER_DEV_OFFICER, STUDENT, INTERN, EMPLOYEE)
  - "Add individual" search input with user results
  - Selected users shown as chips

On submit: POST to `/api/admin/sessions`, redirect to session list on success.

- [ ] **Step 2: Commit**

```bash
git add "app/(org-admin)/admin/sessions/new/page.tsx"
git commit -m "feat: add create session page"
```

---

### Task 11: Org Admin Session Detail Page

**Files:**
- Create: `app/(org-admin)/admin/sessions/[sessionId]/page.tsx`

- [ ] **Step 1: Create session detail/edit page**

Client component that fetches session from `GET /api/admin/sessions/[sessionId]`. Shows:
- Breadcrumb: Sessions > Session Title
- Editable fields: title, description, date/time, duration, meeting link, recording link, host dropdown, platform dropdown
- "Auto-generate Meeting" button (if org has config)
- Status controls: "Start Session" (SCHEDULED → IN_PROGRESS), "Complete" (→ COMPLETED), "Cancel" (→ CANCELLED)
- Attendee section:
  - Table: name, email, role badge, attended checkbox, joined at
  - "Mark all present" / "Mark all absent" buttons
  - Save attendance button (PATCH `/api/admin/sessions/[sessionId]/attendance`)
- "Edit Attendees" button opens the same selection UI as create page (PUT `/api/admin/sessions/[sessionId]/attendees`)
- Recording URL input + save
- Delete button (with confirmation)
- Back link to session list

- [ ] **Step 2: Commit**

```bash
git add "app/(org-admin)/admin/sessions/[sessionId]/page.tsx"
git commit -m "feat: add session detail page with attendance tracking"
```

---

### Task 12: Meeting Settings Page

**Files:**
- Create: `app/(org-admin)/admin/settings/meetings/page.tsx`

- [ ] **Step 1: Create meeting config page**

Client component that fetches config from `GET /api/admin/settings/meetings`. Shows:
- Page header "Meeting Integration"
- Platform selector (Zoom / Microsoft Teams)
- Conditional fields:
  - Zoom: Account ID, Client ID, Client Secret
  - Teams: Client ID, Client Secret, Tenant ID
- "Test Connection" button → POST `/api/admin/settings/meetings/test` → shows success/error
- "Save" button → PUT `/api/admin/settings/meetings`
- Current status badge: "Connected" (green) or "Not configured" (grey)

- [ ] **Step 2: Commit**

```bash
git add "app/(org-admin)/admin/settings/meetings/page.tsx"
git commit -m "feat: add meeting integration settings page"
```

---

### Task 13: User-Facing Sessions Pages

**Files:**
- Create: `app/(dashboard)/sessions/page.tsx`
- Create: `app/(dashboard)/sessions/[sessionId]/page.tsx`

- [ ] **Step 1: Create sessions list page**

Client component fetching from `GET /api/sessions/upcoming`. Shows:
- "Your Sessions" header
- Two sections: "Sessions You're Hosting" (if any) and "Upcoming Sessions"
- Each session card: title, date/time, host name, platform badge, duration, attendee count
- "Join" button (opens meetingUrl in new tab) for sessions with a link
- "Manage" link for sessions the user is hosting → `/sessions/[sessionId]`

- [ ] **Step 2: Create session detail page**

Client component fetching from `GET /api/sessions/[sessionId]`. Shows:
- Session info: title, description, date/time, duration, platform, host
- "Join Meeting" button (if meetingUrl set)
- If user is host: editable meeting link, recording link, status controls, attendance management (same as org admin detail but scoped to host permissions)
- If user is attendee: read-only view

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/sessions/"
git commit -m "feat: add user-facing sessions pages"
```

---

### Task 14: Dashboard Integration

**Files:**
- Create: `components/dashboard/upcoming-sessions.tsx`
- Modify: `app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Create upcoming sessions dashboard component**

Client component `UpcomingSessions` that:
- Fetches from `GET /api/sessions/upcoming`
- Shows "Upcoming Sessions" card with next 3 sessions
- Each row: title, date/time (formatted nicely), host name, platform badge, "Join" button
- "View all" link to `/sessions`
- Shows nothing if no upcoming sessions

- [ ] **Step 2: Add to dashboard**

In `app/(dashboard)/dashboard/page.tsx`, import and add `<UpcomingSessions />` after the announcements section, before the stats row. Show for all roles (it's self-filtering based on the user's session invitations).

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/upcoming-sessions.tsx "app/(dashboard)/dashboard/page.tsx"
git commit -m "feat: add upcoming sessions to dashboard"
```

---

### Task 15: Build, Type-Check, and Deploy

- [ ] **Step 1: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Push and deploy**

```bash
git push origin main
npx vercel deploy --prod
```

- [ ] **Step 4: Post-deploy verification**

- Login as org admin → navigate to `/admin/sessions`
- Create a session with some attendees
- Check the host's dashboard shows the session
- Check an attendee's dashboard shows the session
- Test meeting settings page
- Verify the "Join" button opens the meeting link
