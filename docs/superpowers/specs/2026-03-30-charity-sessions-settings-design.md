# Charity-Level Sessions & Settings — Design Spec

**Date:** 2026-03-30
**Status:** Approved

## Overview

Extend the platform so charity-level users (Charity Admin / Charity Employee) can create and manage virtual classroom sessions that span across all organisations. Add a Charity Admin Settings page for meeting platform configuration and SAML SSO for charity staff.

## Goals

1. Allow charity-level users with `manage_sessions` permission to create cross-org sessions
2. Attendee picker uses the same toggle-button pattern as the survey target picker (orgs + roles + individual users)
3. Charity Admin Settings page with meeting config (Zoom/Teams) and SAML SSO for charity staff
4. Charity SAML SSO follows the same login flow as org-level SSO (email check hides password, shows SSO button)

## Non-Goals

- Per-session billing or payment tracking
- Recurring/repeating session schedules
- Storing Google/Azure OAuth credentials in-database (those remain as env vars)
- Org-level SSO changes (existing org SAML is untouched)

---

## Data Model

### Schema Changes

**1. New permission value:**

Add `manage_sessions` to the `CHARITY_PERMISSIONS` constant in `lib/rbac.ts`:

```typescript
const CHARITY_PERMISSIONS = {
  MANAGE_ORGANISATIONS: 'manage_organisations',
  MANAGE_TRAINING: 'manage_training',
  MANAGE_SURVEYS: 'manage_surveys',
  MANAGE_ANNOUNCEMENTS: 'manage_announcements',
  VIEW_REPORTS: 'view_reports',
  MANAGE_SESSIONS: 'manage_sessions',
} as const
```

Add to `PERMISSION_LABELS`:

```typescript
manage_sessions: 'Manage Sessions',
```

**2. Make ClassSession.organisationId nullable:**

```prisma
model ClassSession {
  // ... existing fields ...
  organisationId    String?            // nullable for charity-level sessions
  organisation      Organisation?      @relation(fields: [organisationId], references: [id])
  isCharitySession  Boolean            @default(false)
}
```

Charity-level sessions have `organisationId: null` and `isCharitySession: true`. Existing org-level sessions are unaffected (`isCharitySession: false`). The `Organisation` relation changes from required to optional — existing data is compatible since all current sessions already have an `organisationId` value.

**3. New model — CharityMeetingConfig:**

```prisma
model CharityMeetingConfig {
  id          String          @id @default(cuid())
  platform    MeetingPlatform @default(CUSTOM)
  apiKey      String?
  apiSecret   String?
  tenantId    String?
  configured  Boolean         @default(false)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
}
```

Single row table. Same structure as `OrgMeetingConfig` but without an `organisationId` foreign key. Used for auto-generating meeting links on charity-level sessions.

**4. New model — CharitySsoConfig:**

```prisma
model CharitySsoConfig {
  id                      String   @id @default(cuid())
  displayName             String   @default("Charity")
  provider                String   @default("saml")
  entityId                String?
  ssoUrl                  String?
  certificate             String?  @db.Text
  enforceForCharityUsers  Boolean  @default(false)
  configured              Boolean  @default(false)
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
}
```

Single row table. `displayName` is shown on the login page button (e.g. "Sign in with Autism Charity SSO"). `enforceForCharityUsers` when true treats all charity staff as SSO-only regardless of their individual `ssoOnly` flag.

---

## RBAC & Permission Checks

### New permission

| Permission Key | Grants Access To |
|---|---|
| `manage_sessions` | Create/edit/delete charity-level sessions; manage attendees and attendance; generate meeting links |

### Where checks happen

| Layer | Check | Purpose |
|---|---|---|
| **Sidebar** | `hasPermission(session, 'manage_sessions')` | Show/hide Sessions nav item |
| **API routes** (`/api/super-admin/sessions/*`) | `hasPermission(session, 'manage_sessions')` | Gate all charity session endpoints |
| **Settings page** | `isCharityAdmin(session)` (role === SUPER_ADMIN) | Only Charity Admins can configure meeting/SSO settings |
| **Settings API** (`/api/super-admin/settings/*`) | `isCharityAdmin(session)` | Gate settings endpoints |

### Updated canCreateSessions

The existing `canCreateSessions()` in `lib/rbac.ts` is extended:

```typescript
export function canCreateSessions(session: Session | null): boolean {
  if (!session?.user?.role) return false
  if (hasPermission(session, 'manage_sessions')) return true
  return ['ORG_ADMIN', 'CAREGIVER', 'CAREER_DEV_OFFICER'].includes(session.user.role)
}
```

---

## Charity Admin Settings Page

### New page: `/super-admin/settings`

**Access:** Charity Admin only (role === `SUPER_ADMIN`)

**Sidebar item:** "Settings" with `charityAdminOnly: true` — hidden from Charity Employees.

**Two sections/tabs:**

### Meeting Configuration

Same UI pattern as `/admin/settings/meetings`:
- Platform dropdown: Zoom / Teams / Custom
- Credential fields (conditional on platform):
  - Zoom: Account ID, Client ID, Client Secret
  - Teams: Client ID, Client Secret, Tenant ID
- "Test Connection" button — validates credentials without creating a meeting
- "Save" button
- If not configured: charity session creation shows manual link input only (no "Generate" button)

### SSO Configuration

Same UI pattern as `/admin/settings/sso`:
- Display name field (e.g. "Autism Charity") — used on login button
- SAML metadata upload or manual entry:
  - Entity ID
  - SSO URL
  - Certificate (textarea)
- "Parse Metadata XML" button (paste XML, auto-fill fields)
- "Enforce SSO for charity users" toggle — when enabled, all charity staff must use SAML, password login is blocked
- "Test Connection" button
- "Save" button

### API routes

**`GET /api/super-admin/settings/meetings`**
- Auth: `isCharityAdmin(session)`
- Returns: `CharityMeetingConfig` (single row, created on first access if missing)

**`PUT /api/super-admin/settings/meetings`**
- Auth: `isCharityAdmin(session)`
- Body: `{ platform, apiKey?, apiSecret?, tenantId? }`
- Upserts the single `CharityMeetingConfig` row

**`POST /api/super-admin/settings/meetings/test`**
- Auth: `isCharityAdmin(session)`
- Body: `{ platform, apiKey, apiSecret, tenantId? }`
- Calls `testMeetingConnection()` from `lib/meetings.ts`

**`GET /api/super-admin/settings/sso`**
- Auth: `isCharityAdmin(session)`
- Returns: `CharitySsoConfig` (single row, created on first access if missing)

**`PUT /api/super-admin/settings/sso`**
- Auth: `isCharityAdmin(session)`
- Body: `{ displayName, entityId?, ssoUrl?, certificate?, enforceForCharityUsers? }`
- Upserts the single `CharitySsoConfig` row

**`POST /api/super-admin/settings/sso/parse-metadata`**
- Auth: `isCharityAdmin(session)`
- Body: `{ metadata: string }` (raw XML)
- Parses SAML metadata XML, returns `{ entityId, ssoUrl, certificate }`

**`POST /api/super-admin/settings/sso/test`**
- Auth: `isCharityAdmin(session)`
- Body: `{ entityId, ssoUrl, certificate }`
- Validates SAML config (checks certificate format, URL reachability)

---

## Charity-Level Sessions

### Sidebar

New nav item in super-admin sidebar:

| Nav Item | Permission Required | Charity Admin | Charity Employee |
|---|---|---|---|
| Sessions | `manage_sessions` | Always visible | If granted |

Positioned after Announcements, before Reports.

### Session list page: `/super-admin/sessions`

- Filter tabs: All, Upcoming, Completed, Cancelled
- Each session card: title, date/time, duration, attendee count (with org breakdown), host name, platform badge, status badge
- "Create Session" button
- Fetches from `GET /api/super-admin/sessions`

### Session creation page: `/super-admin/sessions/new`

**Session details section:**
- Title (required)
- Description (optional)
- Date & time (required)
- Duration in minutes (required)
- Platform: Zoom / Teams / Custom
- Meeting link: manual input, or "Generate Link" button if `CharityMeetingConfig` is configured for the selected platform

**Host picker:**
- Defaults to current user
- Search field to pick a different host from charity-level users who have `manage_sessions` permission
- Searches SUPER_ADMIN users + CHARITY_EMPLOYEE users with `manage_sessions` in their `charityPermissions`

**Attendee picker (target picker pattern):**
- **Organisation toggle buttons:** "All organisations" + individual org buttons (multi-select). Fetches from existing `/api/super-admin/organisations` endpoint.
- **Role toggle buttons:** "All roles" + individual leaf role buttons (Practitioner, Career Dev Officer, Student, Intern, Employee). Multi-select.
- The combination of selected orgs + selected roles defines the bulk audience.
- **Individual user search:** Below the toggles, a search input to add or remove specific users on top of the bulk selection. Results show name, email, role, and organisation.
- **Resolved count:** Summary line showing "X attendees across Y organisations" based on current selection.
- **Include charity staff toggle:** Option to also include other charity-level users (SUPER_ADMIN + CHARITY_EMPLOYEE) as attendees.

**Submission:**
- Creates `ClassSession` with `organisationId: null`, `isCharitySession: true`
- Resolves attendees using a new `resolveCharitySessionAttendees()` function that queries across all selected orgs and roles
- Creates `SessionAttendee` records for all resolved users

### Session detail page: `/super-admin/sessions/[sessionId]`

Same pattern as org-admin session detail (`/admin/sessions/[sessionId]`):
- Edit session fields (disabled if COMPLETED/CANCELLED)
- Status controls: Start, Complete, Cancel
- Meeting link: display, edit, or auto-generate
- Attendee list: table with name, email, role, organisation, attended checkbox
- "Mark all present/absent" bulk buttons
- Recording URL field
- Danger zone: delete with typed confirmation ("Yes I want to delete this")

### API routes

**`GET /api/super-admin/sessions`**
- Auth: `hasPermission(session, 'manage_sessions')`
- Query: `?status=SCHEDULED|IN_PROGRESS|COMPLETED|CANCELLED`
- Returns: all sessions where `isCharitySession: true`, ordered by `scheduledAt DESC`
- Includes: host, createdBy, attendees with user details (name, email, role, organisation name), _count

**`POST /api/super-admin/sessions`**
- Auth: `hasPermission(session, 'manage_sessions')`
- Body: `{ title, description?, scheduledAt, duration, platform?, meetingUrl?, hostId?, attendees }`
- `attendees` object: `{ allOrgs?: boolean, organisationIds?: string[], allRoles?: boolean, roles?: string[], userIds?: string[], includeCharityStaff?: boolean }`
- Resolves attendees across selected orgs/roles, deduplicates, creates session + attendee records in transaction
- Sets `isCharitySession: true`, `organisationId: null`

**`GET /api/super-admin/sessions/[sessionId]`**
- Auth: `hasPermission(session, 'manage_sessions')`
- Returns: full session with attendees (including user org name)

**`PATCH /api/super-admin/sessions/[sessionId]`**
- Auth: `hasPermission(session, 'manage_sessions')`
- Body: `{ title?, description?, scheduledAt?, duration?, meetingUrl?, recordingUrl?, platform?, status?, hostId? }`

**`DELETE /api/super-admin/sessions/[sessionId]`**
- Auth: `hasPermission(session, 'manage_sessions')`
- Deletes session + all attendees in transaction

**`PUT /api/super-admin/sessions/[sessionId]/attendees`**
- Auth: `hasPermission(session, 'manage_sessions')`
- Body: same attendee selection object as POST create
- Replaces entire attendee list

**`PATCH /api/super-admin/sessions/[sessionId]/attendance`**
- Auth: `hasPermission(session, 'manage_sessions')`
- Body: `{ attendees: [{ userId, attended, joinedAt? }, ...] }`

**`POST /api/super-admin/sessions/[sessionId]/generate-meeting`**
- Auth: `hasPermission(session, 'manage_sessions')`
- Uses `CharityMeetingConfig` (not `OrgMeetingConfig`) to generate link
- Returns: `{ meetingUrl, session }`

### Leaf user visibility

Charity sessions appear automatically in the user's `/sessions` page. The existing `getUpcomingSessions(userId)` query finds sessions where the user is a host or attendee — it doesn't filter by `isCharitySession`, so charity sessions show up alongside org sessions with no changes needed.

---

## Login Flow Changes for Charity SSO

### SSO check endpoint

The existing `/api/auth/sso-check` endpoint is extended:

1. Receive email from login page
2. Look up user by email
3. If user role is `SUPER_ADMIN` or `CHARITY_EMPLOYEE`:
   - Check if `CharitySsoConfig` exists and `configured: true`
   - If yes, return `{ ssoEnabled: true, provider: 'saml', displayName: config.displayName, type: 'charity' }`
   - If `enforceForCharityUsers: true`, also return `{ enforced: true }`
4. If user role is an org-level role: existing org SSO check (unchanged)

### Login page behaviour

When the SSO check returns a charity SSO config:
- If user has `ssoOnly: true` OR charity SSO is enforced: hide password form, hide Google/Microsoft buttons, show only "Sign in with [displayName] SSO" button
- If user has `ssoOnly: false` AND enforcement is off: show the SSO button alongside the password form (user can choose)
- Clicking the SSO button initiates SAML flow via `/api/auth/saml/login` with a `charity=true` query parameter

### SAML callback

The existing `/api/auth/saml/callback` route is extended:
- If the relay state or request indicates charity SSO (no `orgId`), look up `CharitySsoConfig` instead of `OrgSsoConfig`
- Validate the SAML response against `CharitySsoConfig.certificate`
- Match user by email — user must already exist as SUPER_ADMIN or CHARITY_EMPLOYEE
- If matched: create/link `Account` record, sign in
- If not matched: reject with "No charity account found for this email"

### SAML login initiation

The existing `/api/auth/saml/login` route is extended:
- If `charity=true` query param: use `CharitySsoConfig` to build the SAML AuthnRequest
- Otherwise: use `OrgSsoConfig` as before (unchanged)

---

## Existing Code Changes

### Modified files

| File | Change |
|---|---|
| `prisma/schema.prisma` | Make `ClassSession.organisationId` nullable, add `isCharitySession`, add `CharityMeetingConfig`, add `CharitySsoConfig` |
| `lib/rbac.ts` | Add `MANAGE_SESSIONS` to `CHARITY_PERMISSIONS`, update `PERMISSION_LABELS`, update `canCreateSessions()` |
| `lib/sessions.ts` | Add `getCharitySessions()`, `resolveCharitySessionAttendees()` |
| `lib/meetings.ts` | Add `generateCharityMeetingLink()` that reads `CharityMeetingConfig` |
| `components/layout/super-admin-sidebar.tsx` | Add Sessions nav item (permission-gated), add Settings nav item (charityAdminOnly) |
| `app/api/auth/sso-check/route.ts` | Extend to check `CharitySsoConfig` for charity-level users |
| `app/api/auth/saml/login/route.ts` | Handle `charity=true` param, use `CharitySsoConfig` |
| `app/api/auth/saml/callback/route.ts` | Handle charity SAML responses, validate against `CharitySsoConfig` |
| Login page component | Handle charity SSO type in SSO check response |
| `app/(super-admin)/super-admin/users/page.tsx` | Add `manage_sessions` to the permissions checkbox list |

### New files

| File | Purpose |
|---|---|
| `app/(super-admin)/super-admin/settings/page.tsx` | Charity Admin Settings (meeting config + SSO config) |
| `app/api/super-admin/settings/meetings/route.ts` | GET + PUT charity meeting config |
| `app/api/super-admin/settings/meetings/test/route.ts` | POST test connection |
| `app/api/super-admin/settings/sso/route.ts` | GET + PUT charity SSO config |
| `app/api/super-admin/settings/sso/parse-metadata/route.ts` | POST parse SAML metadata XML |
| `app/api/super-admin/settings/sso/test/route.ts` | POST test SSO config |
| `app/(super-admin)/super-admin/sessions/page.tsx` | Charity session list |
| `app/(super-admin)/super-admin/sessions/new/page.tsx` | Charity session creation |
| `app/(super-admin)/super-admin/sessions/[sessionId]/page.tsx` | Charity session detail |
| `app/api/super-admin/sessions/route.ts` | GET list + POST create |
| `app/api/super-admin/sessions/[sessionId]/route.ts` | GET + PATCH + DELETE |
| `app/api/super-admin/sessions/[sessionId]/attendees/route.ts` | PUT replace attendees |
| `app/api/super-admin/sessions/[sessionId]/attendance/route.ts` | PATCH mark attendance |
| `app/api/super-admin/sessions/[sessionId]/generate-meeting/route.ts` | POST generate link |
| `components/super-admin/session-attendee-picker.tsx` | Reusable target-picker-style attendee selector |
