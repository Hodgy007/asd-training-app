# Virtual Classroom Sessions — Design Spec

**Date:** 2026-03-29
**Status:** Approved
**Branch:** `feat/virtual-classroom-sessions`

---

## Goal

Add virtual classroom sessions to the training platform. Org admins and hosts can schedule live sessions (Zoom, Microsoft Teams, or custom link), invite specific users or roles, and track attendance. Supports both auto-generated meetings (via API integration) and manual link pasting.

## Database Schema

### New Models

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

model Session {
  id             String          @id @default(cuid())
  title          String
  description    String?         @db.Text
  scheduledAt    DateTime
  duration       Int             // minutes
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
  tenantId       String?         // Teams only: Azure AD tenant ID
  configured     Boolean         @default(false)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  organisation Organisation @relation(fields: [organisationId], references: [id])
}
```

### Relation additions to existing models

Add to `User`:
```prisma
hostedSessions   Session[]          @relation("SessionHost")
createdSessions  Session[]          @relation("SessionCreator")
sessionAttendees SessionAttendee[]
```

Add to `Organisation`:
```prisma
sessions      Session[]
meetingConfig OrgMeetingConfig?
```

## Attendee Selection

When creating a session, the admin/host selects attendees via:

1. **"All Roles" toggle** — if on, every active user in the org is invited
2. **Role checkboxes** — select one or more roles (e.g. CAREGIVER, CAREER_DEV_OFFICER). All active users with that role in the org are invited.
3. **Individual user search** — type-ahead search of org users, add individually
4. **Combination** — roles + individual users are merged (deduplicated)

On save, the system resolves the selection into individual `SessionAttendee` rows (one per invited user). This means if new users join the org after the session is created, they are NOT automatically added — the admin must edit the session to add them.

## Permissions

Both the **host** (`hostId`) and the **org admin** (`session.user.role === 'ORG_ADMIN' && same org`) have full control over a session:

- Edit title, description, date/time, duration
- Add or change meeting link
- Add or change recording link
- Mark/unmark attendance for each attendee
- Cancel the session
- Change status (scheduled → in progress → completed)
- Add/remove attendees

Regular attendees can only:
- View session details
- Join via the meeting link
- See their own attendance status

## Meeting Link Flow

### Manual (always available)

A text input field for the meeting URL. Admin or host pastes a Zoom/Teams/Google Meet link.

### Auto-Generate (when API configured)

If the org has a valid `OrgMeetingConfig`:

**Zoom:**
- Uses Zoom Server-to-Server OAuth (API Key + API Secret)
- POST to `https://api.zoom.us/v2/users/me/meetings` to create meeting
- Returns `join_url` which is stored as `meetingUrl`
- Requires: `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET` per org

**Microsoft Teams:**
- Uses Microsoft Graph API with application permissions
- POST to `/v1.0/users/{userId}/onlineMeetings` to create meeting
- Returns `joinWebUrl` which is stored as `meetingUrl`
- Requires: `TEAMS_CLIENT_ID`, `TEAMS_CLIENT_SECRET`, `TEAMS_TENANT_ID` per org

The "Auto-generate" button is shown next to the meeting URL field when the org has a configured integration. If generation fails, the field falls back to manual entry with an error message.

### OrgMeetingConfig fields

- `platform` — ZOOM or TEAMS (determines which API to call)
- `apiKey` — Zoom: Account ID / Teams: Client ID
- `apiSecret` — Zoom: Client Secret / Teams: Client Secret
- For Teams, the tenant ID is derived from the apiKey format or stored as a third field

To keep it simple, store as two generic fields (`apiKey`, `apiSecret`) with a note in the UI about what each field means for each platform.

## API Routes

### Session CRUD (Org Admin + Host)

**`GET /api/admin/sessions`**
- Returns all sessions for the user's org, ordered by scheduledAt desc
- Query params: `status` filter, `page`, `pageSize`
- Auth: ORG_ADMIN or host of any session in the org

**`POST /api/admin/sessions`**
- Creates a new session
- Body: `{ title, description?, scheduledAt, duration, platform, meetingUrl?, hostId, attendees: { allRoles?: boolean, roles?: string[], userIds?: string[] } }`
- Resolves attendees to individual SessionAttendee rows
- Auth: ORG_ADMIN only (hosts are assigned, they don't create sessions — but hosts CAN create sessions too, see permissions)

**`GET /api/admin/sessions/[sessionId]`**
- Returns session with attendees (include user name/email/role) and host info
- Auth: ORG_ADMIN or host of this session

**`PATCH /api/admin/sessions/[sessionId]`**
- Updates session fields
- Body: partial `{ title?, description?, scheduledAt?, duration?, meetingUrl?, recordingUrl?, platform?, status?, hostId? }`
- Auth: ORG_ADMIN or host

**`DELETE /api/admin/sessions/[sessionId]`**
- Deletes session and cascading attendees
- Auth: ORG_ADMIN only

### Attendee Management

**`PUT /api/admin/sessions/[sessionId]/attendees`**
- Replaces all attendees
- Body: `{ allRoles?: boolean, roles?: string[], userIds?: string[] }`
- Resolves and recreates SessionAttendee rows
- Auth: ORG_ADMIN or host

**`PATCH /api/admin/sessions/[sessionId]/attendance`**
- Bulk update attendance
- Body: `{ attendees: [{ userId, attended, joinedAt? }] }`
- Auth: ORG_ADMIN or host

### Meeting Config

**`GET /api/admin/settings/meetings`**
- Returns OrgMeetingConfig for the user's org (or null)
- Auth: ORG_ADMIN

**`PUT /api/admin/settings/meetings`**
- Creates or updates OrgMeetingConfig
- Body: `{ platform, apiKey, apiSecret }`
- Auth: ORG_ADMIN

**`POST /api/admin/settings/meetings/test`**
- Tests the connection with provided credentials
- Returns `{ success: true }` or `{ success: false, error: "..." }`
- Auth: ORG_ADMIN

### Auto-Generate Meeting

**`POST /api/admin/sessions/[sessionId]/generate-meeting`**
- Reads OrgMeetingConfig, calls Zoom or Teams API
- Creates the meeting and stores the URL on the session
- Returns `{ meetingUrl }`
- Auth: ORG_ADMIN or host

### User-Facing

**`GET /api/sessions/upcoming`**
- Returns sessions the current user is invited to, where status is SCHEDULED or IN_PROGRESS and scheduledAt >= now
- Ordered by scheduledAt asc
- Includes: title, description, scheduledAt, duration, meetingUrl, platform, host name, status

**`GET /api/sessions/[sessionId]`**
- Returns session detail for an invited user
- Auth: user must be in SessionAttendee for this session, or be the host, or be ORG_ADMIN

## UI Pages

### Dashboard (All Leaf Roles)

**"Upcoming Sessions" card** — shown on the dashboard for users who have upcoming sessions:
- Shows next 3 upcoming sessions they're invited to
- Each row: title, date/time (formatted), host name, platform badge (Zoom blue / Teams purple / Custom grey), duration
- "Join" button (links to meetingUrl, opens in new tab) — only shown when meetingUrl is set and status is SCHEDULED or IN_PROGRESS
- "No upcoming sessions" message if none
- If user is a host, their hosted sessions appear with a "Manage" link

### Org Admin: Session List (`/admin/sessions`)

- Page header: "Virtual Classroom Sessions"
- "Create Session" button
- Filter tabs: All / Upcoming / Completed / Cancelled
- Session cards showing: title, date/time, host name, platform badge, attendee count, status badge
- Click → goes to session detail page

### Org Admin: Create Session (`/admin/sessions/new`)

Form fields:
- **Title** — text input, required
- **Description** — textarea, optional
- **Date & Time** — datetime picker, required
- **Duration** — number input (minutes), default 60
- **Platform** — dropdown: Zoom / Microsoft Teams / Custom Link
- **Meeting Link** — text input (manual) + "Auto-generate" button (if OrgMeetingConfig exists for selected platform)
- **Host** — searchable dropdown of all org users, defaults to current user
- **Invite Attendees** section:
  - "All members" toggle
  - Role checkboxes (only roles the org has configured: CAREGIVER, CAREER_DEV_OFFICER, STUDENT, INTERN, EMPLOYEE)
  - "Add individual" search input with user results dropdown
  - Selected users shown as chips below

### Org Admin: Session Detail (`/admin/sessions/[sessionId]`)

- Breadcrumb: Sessions > Session Title
- Editable fields: title, description, date/time, duration, meeting link, recording link, host, platform
- Status controls: "Start" (→ IN_PROGRESS), "Complete" (→ COMPLETED), "Cancel" (→ CANCELLED)
- **Attendee list** table:
  - Name, email, role badge, attended checkbox, joined at timestamp
  - "Mark all present" / "Mark all absent" buttons
- **Recording** section: URL input + save
- Back link to session list

### Org Admin: Meeting Settings (`/admin/settings/meetings`)

- Accessible from org admin sidebar (new nav item: "Meeting Settings" with Video icon)
- Platform selector (Zoom / Microsoft Teams)
- Conditional fields based on platform:
  - Zoom: Account ID, Client ID, Client Secret
  - Teams: Client ID, Client Secret, Tenant ID
- "Test Connection" button
- Save button
- Current status: "Connected" (green) or "Not configured" (grey)

### Host View

Hosts see the same session detail page as org admins (via `/admin/sessions/[sessionId]`). The middleware already allows hosts to access these routes based on the permission checks in the API.

Actually — hosts may not be ORG_ADMIN role. They need a way to access their sessions. Add a **`/sessions`** page under the dashboard route group:

**`/sessions`** — lists sessions the user is hosting or invited to
**`/sessions/[sessionId]`** — session detail (read-only for attendees, full edit for hosts)

The org admin pages (`/admin/sessions/*`) are for org admin management. The `/sessions/*` pages are for hosts and attendees.

### Sidebar Updates

**Org Admin Sidebar:** Add "Sessions" nav item (with Calendar icon) between Users and Announcements. Add "Meeting Settings" (with Video icon) at the bottom before Sign Out.

**Main Sidebar (leaf roles):** Add "Sessions" nav item (with Calendar icon) after the training links, only shown if the user has any upcoming sessions (or always shown — simpler).

## Out of Scope

- Recurring sessions (one-off only for v1)
- In-app video (Zoom/Teams handles this)
- Chat during sessions
- Automated reminders / email notifications
- Calendar file (.ics) download
- Waitlists or capacity limits
- Session templates
- Super admin session management (org-scoped only)
