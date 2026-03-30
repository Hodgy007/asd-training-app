# Charity-Level Sessions & Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `manage_sessions` permission, charity-level cross-org session management, charity meeting config, and charity SAML SSO.

**Architecture:** Extends the existing session infrastructure (ClassSession, SessionAttendee, lib/sessions.ts, lib/meetings.ts) to support charity-level sessions with nullable organisationId. Adds CharityMeetingConfig and CharitySsoConfig as single-row tables. Extends the login flow to detect charity SSO via the existing sso-check/SAML pipeline.

**Tech Stack:** Next.js 14 App Router, Prisma, NextAuth v4, TypeScript, Tailwind CSS, clsx, lucide-react

---

### Task 1: Schema changes + RBAC permission

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `lib/rbac.ts`
- Modify: `app/(super-admin)/super-admin/users/page.tsx`

- [ ] **Step 1: Update Prisma schema — make ClassSession.organisationId nullable and add isCharitySession**

In `prisma/schema.prisma`, change the `ClassSession` model:

```prisma
model ClassSession {
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
  organisationId String?
  isCharitySession Boolean       @default(false)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  host         User                @relation("SessionHost", fields: [hostId], references: [id])
  createdBy    User                @relation("SessionCreator", fields: [createdById], references: [id])
  organisation Organisation?       @relation(fields: [organisationId], references: [id])
  attendees    SessionAttendee[]
}
```

Changes: `organisationId String?` (was `String`), `organisation Organisation?` (was `Organisation`), added `isCharitySession Boolean @default(false)`.

- [ ] **Step 2: Add CharityMeetingConfig model**

Add below `OrgMeetingConfig` in `prisma/schema.prisma`:

```prisma
model CharityMeetingConfig {
  id         String          @id @default(cuid())
  platform   MeetingPlatform @default(CUSTOM)
  apiKey     String?
  apiSecret  String?
  tenantId   String?
  configured Boolean         @default(false)
  createdAt  DateTime        @default(now())
  updatedAt  DateTime        @updatedAt
}
```

- [ ] **Step 3: Add CharitySsoConfig model**

Add below `OrgSsoConfig` in `prisma/schema.prisma`:

```prisma
model CharitySsoConfig {
  id                     String   @id @default(cuid())
  displayName            String   @default("Charity")
  provider               String   @default("saml")
  entityId               String?
  ssoUrl                 String?
  certificate            String?  @db.Text
  enforceForCharityUsers Boolean  @default(false)
  configured             Boolean  @default(false)
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
}
```

- [ ] **Step 4: Push schema to database**

Run: `npx prisma db push`
Expected: Schema synced with no errors. Existing ClassSession rows keep their organisationId values; isCharitySession defaults to false.

Run: `npx prisma generate`
Expected: Prisma client regenerated.

- [ ] **Step 5: Add MANAGE_SESSIONS to RBAC**

In `lib/rbac.ts`, add to `CHARITY_PERMISSIONS`:

```typescript
export const CHARITY_PERMISSIONS = {
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
export const PERMISSION_LABELS: Record<string, string> = {
  manage_organisations: 'Manage Organisations',
  manage_training: 'Manage Training',
  manage_surveys: 'Manage Surveys',
  manage_announcements: 'Manage Announcements',
  view_reports: 'View Reports',
  manage_sessions: 'Manage Sessions',
}
```

Update `canCreateSessions`:

```typescript
export function canCreateSessions(session: Session | null): boolean {
  if (!session?.user?.role) return false
  if (hasPermission(session, CHARITY_PERMISSIONS.MANAGE_SESSIONS)) return true
  return hasRole(session, 'ORG_ADMIN', 'CAREGIVER', 'CAREER_DEV_OFFICER')
}
```

- [ ] **Step 6: The users page already uses ALL_CHARITY_PERMISSIONS which is derived from Object.values(CHARITY_PERMISSIONS), so the new permission checkbox will appear automatically. Verify by checking the page.**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma lib/rbac.ts
git commit -m "feat: add manage_sessions permission and schema for charity sessions/settings"
```

---

### Task 2: Sidebar navigation updates

**Files:**
- Modify: `components/layout/super-admin-sidebar.tsx`

- [ ] **Step 1: Add Calendar and Settings icons to imports**

Change the lucide-react import to include `Calendar` and `Settings`:

```typescript
import {
  LayoutDashboard,
  Building2,
  BookOpen,
  ClipboardList,
  Megaphone,
  BarChart3,
  LogOut,
  X,
  Crown,
  Users,
  HelpCircle,
  Calendar,
  Settings,
} from 'lucide-react'
```

- [ ] **Step 2: Add Sessions and Settings nav items**

In the `NAV_ITEMS` array, add Sessions after Announcements and Settings before the Guide:

```typescript
const NAV_ITEMS: NavItem[] = [
  { href: '/super-admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/super-admin/users', label: 'Users', icon: Users, charityAdminOnly: true },
  { href: '/super-admin/organisations', label: 'Organisations', icon: Building2, permission: CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS },
  { href: '/super-admin/training', label: 'Training Content', icon: BookOpen, permission: CHARITY_PERMISSIONS.MANAGE_TRAINING },
  { href: '/super-admin/surveys', label: 'Surveys', icon: ClipboardList, permission: CHARITY_PERMISSIONS.MANAGE_SURVEYS },
  { href: '/super-admin/announcements', label: 'Announcements', icon: Megaphone, permission: CHARITY_PERMISSIONS.MANAGE_ANNOUNCEMENTS },
  { href: '/super-admin/sessions', label: 'Sessions', icon: Calendar, permission: CHARITY_PERMISSIONS.MANAGE_SESSIONS },
  { href: '/super-admin/reports', label: 'Reports', icon: BarChart3, permission: CHARITY_PERMISSIONS.VIEW_REPORTS },
  { href: '/super-admin/settings', label: 'Settings', icon: Settings, charityAdminOnly: true },
  { href: '/super-admin/guide', label: 'How to Guide', icon: HelpCircle },
]
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/layout/super-admin-sidebar.tsx
git commit -m "feat: add Sessions and Settings nav items to super-admin sidebar"
```

---

### Task 3: Charity meeting config API routes

**Files:**
- Create: `app/api/super-admin/settings/meetings/route.ts`
- Create: `app/api/super-admin/settings/meetings/test/route.ts`

- [ ] **Step 1: Create GET + PUT for charity meeting config**

Create `app/api/super-admin/settings/meetings/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get or create the single-row config
  let config = await prisma.charityMeetingConfig.findFirst()
  if (!config) {
    config = await prisma.charityMeetingConfig.create({ data: {} })
  }

  return NextResponse.json(config)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { platform, apiKey, apiSecret, tenantId } = body

  if (!platform) {
    return NextResponse.json({ error: 'platform is required' }, { status: 400 })
  }

  const configured = Boolean(apiKey && apiSecret)

  // Upsert the single row
  let existing = await prisma.charityMeetingConfig.findFirst()
  let config
  if (existing) {
    config = await prisma.charityMeetingConfig.update({
      where: { id: existing.id },
      data: {
        platform,
        apiKey: apiKey ?? null,
        apiSecret: apiSecret ?? null,
        tenantId: tenantId ?? null,
        configured,
      },
    })
  } else {
    config = await prisma.charityMeetingConfig.create({
      data: {
        platform,
        apiKey: apiKey ?? null,
        apiSecret: apiSecret ?? null,
        tenantId: tenantId ?? null,
        configured,
      },
    })
  }

  return NextResponse.json(config)
}
```

- [ ] **Step 2: Create test connection endpoint**

Create `app/api/super-admin/settings/meetings/test/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { testMeetingConnection } from '@/lib/meetings'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { platform, apiKey, apiSecret, tenantId } = body

  if (!platform || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'platform, apiKey, and apiSecret are required' }, { status: 400 })
  }

  const result = await testMeetingConnection(platform, apiKey, apiSecret, tenantId)
  return NextResponse.json(result)
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/api/super-admin/settings/meetings/
git commit -m "feat: add charity meeting config API routes (GET, PUT, test)"
```

---

### Task 4: Charity SSO config API routes

**Files:**
- Create: `app/api/super-admin/settings/sso/route.ts`
- Create: `app/api/super-admin/settings/sso/parse-metadata/route.ts`
- Create: `app/api/super-admin/settings/sso/test/route.ts`

- [ ] **Step 1: Create GET + PUT for charity SSO config**

Create `app/api/super-admin/settings/sso/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let config = await prisma.charitySsoConfig.findFirst()
  if (!config) {
    config = await prisma.charitySsoConfig.create({ data: {} })
  }

  return NextResponse.json(config)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { displayName, entityId, ssoUrl, certificate, enforceForCharityUsers } = body

  const configured = Boolean(ssoUrl && entityId && certificate)

  let existing = await prisma.charitySsoConfig.findFirst()
  let config
  if (existing) {
    config = await prisma.charitySsoConfig.update({
      where: { id: existing.id },
      data: {
        displayName: displayName ?? existing.displayName,
        entityId: entityId ?? null,
        ssoUrl: ssoUrl ?? null,
        certificate: certificate ?? null,
        enforceForCharityUsers: enforceForCharityUsers ?? false,
        configured,
      },
    })
  } else {
    config = await prisma.charitySsoConfig.create({
      data: {
        displayName: displayName ?? 'Charity',
        entityId: entityId ?? null,
        ssoUrl: ssoUrl ?? null,
        certificate: certificate ?? null,
        enforceForCharityUsers: enforceForCharityUsers ?? false,
        configured,
      },
    })
  }

  return NextResponse.json(config)
}
```

- [ ] **Step 2: Create parse-metadata endpoint**

Create `app/api/super-admin/settings/sso/parse-metadata/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { parseMetadataUrl } from '@/lib/saml'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { metadataUrl } = body

  if (!metadataUrl || typeof metadataUrl !== 'string') {
    return NextResponse.json({ error: 'metadataUrl is required' }, { status: 400 })
  }

  const result = await parseMetadataUrl(metadataUrl)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({
    entityId: result.entityId,
    ssoUrl: result.ssoUrl,
    certificate: result.certificate,
  })
}
```

- [ ] **Step 3: Create test SSO endpoint**

Create `app/api/super-admin/settings/sso/test/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { entityId, ssoUrl, certificate } = body

  if (!entityId || !ssoUrl || !certificate) {
    return NextResponse.json({ error: 'entityId, ssoUrl, and certificate are required' }, { status: 400 })
  }

  // Validate certificate format
  try {
    const certClean = certificate.trim()
    const base64Regex = /^[A-Za-z0-9+/\r\n=\s-]+$/
    const rawCert = certClean
      .replace('-----BEGIN CERTIFICATE-----', '')
      .replace('-----END CERTIFICATE-----', '')
      .trim()
    if (!base64Regex.test(rawCert)) {
      return NextResponse.json({ success: false, error: 'Certificate is not valid base64' })
    }
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid certificate format' })
  }

  // Validate SSO URL is reachable
  try {
    const urlObj = new URL(ssoUrl)
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return NextResponse.json({ success: false, error: 'SSO URL must use http or https' })
    }
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid SSO URL format' })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add app/api/super-admin/settings/sso/
git commit -m "feat: add charity SSO config API routes (GET, PUT, parse-metadata, test)"
```

---

### Task 5: Charity Admin Settings page (meeting config + SSO config)

**Files:**
- Create: `app/(super-admin)/super-admin/settings/page.tsx`

- [ ] **Step 1: Create the settings page**

Create `app/(super-admin)/super-admin/settings/page.tsx` — a client component with two stacked sections: Meeting Configuration and SSO Configuration. Follow the existing pattern from `app/(org-admin)/admin/settings/meetings/page.tsx` and `app/(org-admin)/admin/settings/sso/page.tsx` but combined into one page.

The page should:
- Check `session?.user?.role === 'SUPER_ADMIN'`, show access denied otherwise
- **Meeting Config section:** Platform dropdown (ZOOM/TEAMS/CUSTOM), conditional credential fields (Zoom: Account ID + Client ID|Client Secret in apiSecret format; Teams: Client ID + Client Secret + Tenant ID), Test Connection button, Save button
- **SSO Config section:** Display Name input, Metadata URL + "Parse" button, Entity ID input, SSO URL input, Certificate textarea, "Enforce SSO for charity users" toggle, Test button, Save button
- Toast notifications for success/error
- Loading states on mount (fetches both configs via GET)

This is a large page (~400-500 lines). The implementer should read `app/(org-admin)/admin/settings/meetings/page.tsx` and `app/(org-admin)/admin/settings/sso/page.tsx` for exact UI patterns (field layout, button styling, toast pattern, loading states) and combine them into a single page with two card sections.

Key API calls:
- `GET /api/super-admin/settings/meetings` → load meeting config
- `PUT /api/super-admin/settings/meetings` → save meeting config
- `POST /api/super-admin/settings/meetings/test` → test meeting connection
- `GET /api/super-admin/settings/sso` → load SSO config
- `PUT /api/super-admin/settings/sso` → save SSO config
- `POST /api/super-admin/settings/sso/parse-metadata` → parse SAML metadata
- `POST /api/super-admin/settings/sso/test` → test SSO config

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add "app/(super-admin)/super-admin/settings/page.tsx"
git commit -m "feat: add charity admin settings page with meeting config and SSO config"
```

---

### Task 6: Extend lib/sessions.ts for charity sessions

**Files:**
- Modify: `lib/sessions.ts`

- [ ] **Step 1: Add resolveCharitySessionAttendees function**

Add to `lib/sessions.ts` after the existing `resolveAttendees` function:

```typescript
// ─── Charity session attendee resolution ─────────────────────────────────────

interface CharityAttendeeSelection {
  /** Include all active organisations */
  allOrgs?: boolean
  /** Include these specific organisation IDs */
  organisationIds?: string[]
  /** Include all non-admin roles across selected orgs */
  allRoles?: boolean
  /** Include these specific roles across selected orgs */
  roles?: Role[]
  /** Include specific user IDs */
  userIds?: string[]
  /** Also include charity-level users (SUPER_ADMIN + CHARITY_EMPLOYEE) */
  includeCharityStaff?: boolean
}

/**
 * Resolves attendees for a charity-level session across multiple organisations.
 * Supports org × role cartesian product plus explicit user IDs.
 */
export async function resolveCharitySessionAttendees(
  selection: CharityAttendeeSelection
): Promise<string[]> {
  const ADMIN_ROLES: Role[] = ['SUPER_ADMIN', 'CHARITY_EMPLOYEE', 'ORG_ADMIN']
  const idSet = new Set<string>()

  // Determine target org IDs
  let orgFilter: { organisationId: { in: string[] } } | { organisationId: { not: null } } | undefined

  if (selection.allOrgs) {
    orgFilter = { organisationId: { not: null } }
  } else if (selection.organisationIds && selection.organisationIds.length > 0) {
    orgFilter = { organisationId: { in: selection.organisationIds } }
  }

  // Fetch by all non-admin roles across target orgs
  if (orgFilter && selection.allRoles) {
    const users = await prisma.user.findMany({
      where: {
        ...orgFilter,
        active: true,
        role: { notIn: ADMIN_ROLES },
      },
      select: { id: true },
    })
    users.forEach((u) => idSet.add(u.id))
  }

  // Fetch by specific roles across target orgs
  if (orgFilter && selection.roles && selection.roles.length > 0) {
    const users = await prisma.user.findMany({
      where: {
        ...orgFilter,
        active: true,
        role: { in: selection.roles },
      },
      select: { id: true },
    })
    users.forEach((u) => idSet.add(u.id))
  }

  // Include charity-level staff
  if (selection.includeCharityStaff) {
    const charityUsers = await prisma.user.findMany({
      where: {
        active: true,
        role: { in: ['SUPER_ADMIN', 'CHARITY_EMPLOYEE'] },
      },
      select: { id: true },
    })
    charityUsers.forEach((u) => idSet.add(u.id))
  }

  // Add explicit user IDs
  if (selection.userIds && selection.userIds.length > 0) {
    selection.userIds.forEach((id) => idSet.add(id))
  }

  return Array.from(idSet)
}
```

- [ ] **Step 2: Add getCharitySessions query**

Add to `lib/sessions.ts`:

```typescript
/** All charity-level sessions, optionally filtered by status, ordered by scheduledAt desc. */
export async function getCharitySessions(
  status?: SessionStatus
): Promise<SessionWithDetails[]> {
  return prisma.classSession.findMany({
    where: {
      isCharitySession: true,
      ...(status ? { status } : {}),
    },
    orderBy: { scheduledAt: 'desc' },
    include: {
      host: true,
      createdBy: true,
      attendees: { include: { user: true } },
      _count: { select: { attendees: true } },
    },
  })
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add lib/sessions.ts
git commit -m "feat: add resolveCharitySessionAttendees and getCharitySessions"
```

---

### Task 7: Extend lib/meetings.ts for charity meeting link generation

**Files:**
- Modify: `lib/meetings.ts`

- [ ] **Step 1: Add generateCharityMeetingLink function**

Add to `lib/meetings.ts` after the existing `generateMeetingLink` function:

```typescript
/**
 * Reads the CharityMeetingConfig and calls the appropriate
 * platform API to create a meeting link. Returns the URL on success.
 */
export async function generateCharityMeetingLink(
  title: string,
  scheduledAt: Date,
  duration: number
): Promise<MeetingResult> {
  const config = await prisma.charityMeetingConfig.findFirst()

  if (!config || !config.configured) {
    return { success: false, error: 'No meeting platform configured for charity.' }
  }

  switch (config.platform) {
    case 'ZOOM': {
      if (!config.apiKey || !config.apiSecret) {
        return { success: false, error: 'Zoom credentials (Account ID / Client ID / Secret) are not set.' }
      }
      const [zoomClientId, zoomClientSecret] = (config.apiSecret ?? '').split('|')
      if (!zoomClientId || !zoomClientSecret) {
        return { success: false, error: 'Zoom apiSecret must be formatted as "clientId|clientSecret".' }
      }
      return createZoomMeeting(config.apiKey, zoomClientId, zoomClientSecret, title, scheduledAt, duration)
    }

    case 'TEAMS': {
      if (!config.apiKey || !config.apiSecret || !config.tenantId) {
        return { success: false, error: 'Teams credentials (Client ID / Secret / Tenant ID) are not set.' }
      }
      return createTeamsMeeting(config.apiKey, config.apiSecret, config.tenantId, title, scheduledAt, duration)
    }

    case 'CUSTOM':
      return { success: false, error: 'Custom platform does not support automatic meeting link generation.' }

    default:
      return { success: false, error: 'Unknown meeting platform.' }
  }
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add lib/meetings.ts
git commit -m "feat: add generateCharityMeetingLink for charity-level sessions"
```

---

### Task 8: Charity session API routes (list + create)

**Files:**
- Create: `app/api/super-admin/sessions/route.ts`

- [ ] **Step 1: Create GET + POST for charity sessions**

Create `app/api/super-admin/sessions/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { getCharitySessions, resolveCharitySessionAttendees } from '@/lib/sessions'
import type { SessionStatus } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_SESSIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const statusParam = searchParams.get('status')

  const STATUS_VALUES: SessionStatus[] = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
  const status =
    statusParam && STATUS_VALUES.includes(statusParam as SessionStatus)
      ? (statusParam as SessionStatus)
      : undefined

  const sessions = await getCharitySessions(status)
  return NextResponse.json(sessions)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_SESSIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { title, description, scheduledAt, duration, platform, meetingUrl, hostId, attendees } = body

  if (!title || !scheduledAt || !duration) {
    return NextResponse.json(
      { error: 'Missing required fields: title, scheduledAt, duration' },
      { status: 400 }
    )
  }

  const effectiveHostId = hostId || session.user.id

  // Resolve attendee user IDs across orgs
  const attendeeSelection = attendees ?? {}
  const userIds = await resolveCharitySessionAttendees(attendeeSelection)

  const classSession = await prisma.$transaction(async (tx) => {
    const created = await tx.classSession.create({
      data: {
        title,
        description: description ?? null,
        scheduledAt: new Date(scheduledAt),
        duration: Number(duration),
        platform: platform ?? 'CUSTOM',
        meetingUrl: meetingUrl ?? null,
        hostId: effectiveHostId,
        createdById: session.user.id,
        organisationId: null,
        isCharitySession: true,
      },
    })

    if (userIds.length > 0) {
      await tx.sessionAttendee.createMany({
        data: userIds.map((userId: string) => ({
          sessionId: created.id,
          userId,
        })),
        skipDuplicates: true,
      })
    }

    return tx.classSession.findUnique({
      where: { id: created.id },
      include: {
        host: true,
        createdBy: true,
        attendees: { include: { user: true } },
        _count: { select: { attendees: true } },
      },
    })
  })

  return NextResponse.json(classSession, { status: 201 })
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/api/super-admin/sessions/route.ts
git commit -m "feat: add charity session list and create API routes"
```

---

### Task 9: Charity session detail API routes (GET, PATCH, DELETE)

**Files:**
- Create: `app/api/super-admin/sessions/[sessionId]/route.ts`

- [ ] **Step 1: Create GET + PATCH + DELETE**

Create `app/api/super-admin/sessions/[sessionId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { getSessionById } from '@/lib/sessions'

export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_SESSIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const classSession = await getSessionById(params.sessionId)
  if (!classSession || !classSession.isCharitySession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  return NextResponse.json(classSession)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_SESSIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await getSessionById(params.sessionId)
  if (!existing || !existing.isCharitySession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const body = await req.json()
  const allowedFields = ['title', 'description', 'scheduledAt', 'duration', 'meetingUrl', 'recordingUrl', 'platform', 'status', 'hostId']
  const data: Record<string, unknown> = {}

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      if (field === 'scheduledAt') {
        data[field] = new Date(body[field])
      } else if (field === 'duration') {
        data[field] = Number(body[field])
      } else if (field === 'status') {
        const validStatuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
        if (!validStatuses.includes(body[field])) {
          return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }
        data[field] = body[field]
      } else {
        data[field] = body[field] ?? null
      }
    }
  }

  const updated = await prisma.classSession.update({
    where: { id: params.sessionId },
    data,
    include: {
      host: true,
      createdBy: true,
      attendees: { include: { user: true } },
      _count: { select: { attendees: true } },
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_SESSIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await getSessionById(params.sessionId)
  if (!existing || !existing.isCharitySession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  await prisma.$transaction([
    prisma.sessionAttendee.deleteMany({ where: { sessionId: params.sessionId } }),
    prisma.classSession.delete({ where: { id: params.sessionId } }),
  ])

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add "app/api/super-admin/sessions/[sessionId]/route.ts"
git commit -m "feat: add charity session detail API routes (GET, PATCH, DELETE)"
```

---

### Task 10: Charity session attendees + attendance + generate-meeting API routes

**Files:**
- Create: `app/api/super-admin/sessions/[sessionId]/attendees/route.ts`
- Create: `app/api/super-admin/sessions/[sessionId]/attendance/route.ts`
- Create: `app/api/super-admin/sessions/[sessionId]/generate-meeting/route.ts`

- [ ] **Step 1: Create PUT attendees route**

Create `app/api/super-admin/sessions/[sessionId]/attendees/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { getSessionById, resolveCharitySessionAttendees } from '@/lib/sessions'

export async function PUT(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_SESSIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await getSessionById(params.sessionId)
  if (!existing || !existing.isCharitySession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const body = await req.json()
  const userIds = await resolveCharitySessionAttendees(body)

  const result = await prisma.$transaction(async (tx) => {
    await tx.sessionAttendee.deleteMany({ where: { sessionId: params.sessionId } })

    if (userIds.length > 0) {
      await tx.sessionAttendee.createMany({
        data: userIds.map((userId) => ({
          sessionId: params.sessionId,
          userId,
        })),
        skipDuplicates: true,
      })
    }

    return tx.sessionAttendee.findMany({
      where: { sessionId: params.sessionId },
      include: { user: true },
    })
  })

  return NextResponse.json(result)
}
```

- [ ] **Step 2: Create PATCH attendance route**

Create `app/api/super-admin/sessions/[sessionId]/attendance/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { getSessionById } from '@/lib/sessions'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_SESSIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await getSessionById(params.sessionId)
  if (!existing || !existing.isCharitySession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const body = await req.json()
  const { attendees } = body

  if (!Array.isArray(attendees)) {
    return NextResponse.json({ error: 'attendees array is required' }, { status: 400 })
  }

  const updates = await prisma.$transaction(
    attendees.map((a: { userId: string; attended: boolean; joinedAt?: string }) =>
      prisma.sessionAttendee.updateMany({
        where: { sessionId: params.sessionId, userId: a.userId },
        data: {
          attended: a.attended,
          ...(a.joinedAt ? { joinedAt: new Date(a.joinedAt) } : {}),
        },
      })
    )
  )

  return NextResponse.json({ updated: updates.length })
}
```

- [ ] **Step 3: Create POST generate-meeting route**

Create `app/api/super-admin/sessions/[sessionId]/generate-meeting/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { getSessionById } from '@/lib/sessions'
import { generateCharityMeetingLink } from '@/lib/meetings'

export async function POST(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_SESSIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const classSession = await getSessionById(params.sessionId)
  if (!classSession || !classSession.isCharitySession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const result = await generateCharityMeetingLink(
    classSession.title,
    classSession.scheduledAt,
    classSession.duration
  )

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const updated = await prisma.classSession.update({
    where: { id: params.sessionId },
    data: { meetingUrl: result.meetingUrl },
    include: {
      host: true,
      createdBy: true,
      attendees: { include: { user: true } },
      _count: { select: { attendees: true } },
    },
  })

  return NextResponse.json({ meetingUrl: result.meetingUrl, session: updated })
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add "app/api/super-admin/sessions/[sessionId]/attendees/" "app/api/super-admin/sessions/[sessionId]/attendance/" "app/api/super-admin/sessions/[sessionId]/generate-meeting/"
git commit -m "feat: add charity session attendees, attendance, and meeting generation API routes"
```

---

### Task 11: Session attendee picker component

**Files:**
- Create: `components/super-admin/session-attendee-picker.tsx`

- [ ] **Step 1: Create the attendee picker component**

Create `components/super-admin/session-attendee-picker.tsx` — a client component that follows the same toggle-button pattern as `components/super-admin/survey-target-picker.tsx`.

The component accepts:

```typescript
interface AttendeePickerConfig {
  allOrgs: boolean
  selectedOrgIds: string[]
  allRoles: boolean
  selectedRoles: string[]
  userIds: string[]
  includeCharityStaff: boolean
}

interface SessionAttendeePickerProps {
  value: AttendeePickerConfig
  onChange: (config: AttendeePickerConfig) => void
}
```

Features (follow the survey-target-picker pattern exactly):
- **Organisation toggle buttons:** "All organisations" button + individual org buttons. Fetches from `GET /api/super-admin/organisations` on mount. Uses the same `ToggleButton` component pattern (with Check icon, primary/calm styling).
- **Role toggle buttons:** "All roles" button + individual leaf role buttons (Practitioner, Career Dev Officer, Student, Intern, Employee). Same toggle pattern.
- **Include charity staff toggle:** A checkbox "Include charity staff (admins & employees)".
- **Individual user search:** A search input below the toggles. Searches across selected orgs. Uses a simple debounced fetch. Results show as a dropdown; selected users shown as dismissible chips.
- **Summary line:** "X target combinations selected" or "Targeting all roles across all organisations".
- **Independent internal state** per dimension (same fix as survey-target-picker — don't derive state from cartesian product).

The implementer should read `components/super-admin/survey-target-picker.tsx` for the exact toggle-button component, styling patterns, independent state management, and emit pattern.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/super-admin/session-attendee-picker.tsx
git commit -m "feat: add session attendee picker component with cross-org target selection"
```

---

### Task 12: Charity session list page

**Files:**
- Create: `app/(super-admin)/super-admin/sessions/page.tsx`

- [ ] **Step 1: Create the session list page**

Create `app/(super-admin)/super-admin/sessions/page.tsx` — a client component following the pattern from `app/(org-admin)/admin/sessions/page.tsx`.

Features:
- Permission check: show access denied if user lacks `manage_sessions` permission (check `hasPermission` via session)
- Fetch sessions from `GET /api/super-admin/sessions?status=...`
- Filter tabs: ALL, UPCOMING (SCHEDULED + IN_PROGRESS), COMPLETED, CANCELLED — using client-side state for active tab, fetching with status param
- Session cards showing: title, date/time (formatted with `toLocaleDateString` and `toLocaleTimeString`), duration, platform badge, status badge (color-coded), attendee count, host name
- "Create Session" button → `/super-admin/sessions/new`
- Click card → `/super-admin/sessions/[sessionId]`
- Loading spinner, empty state, refresh button
- Toast for errors

The implementer should read `app/(org-admin)/admin/sessions/page.tsx` for exact card layout, status badge styling, filter tab patterns, and adapt for charity context.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add "app/(super-admin)/super-admin/sessions/page.tsx"
git commit -m "feat: add charity session list page with filter tabs"
```

---

### Task 13: Charity session creation page

**Files:**
- Create: `app/(super-admin)/super-admin/sessions/new/page.tsx`

- [ ] **Step 1: Create the session creation page**

Create `app/(super-admin)/super-admin/sessions/new/page.tsx` — a client component following the pattern from `app/(org-admin)/admin/sessions/new/page.tsx`.

Features:
- Permission check
- **Session details form:** title (required), description (optional textarea), date/time (datetime-local input), duration (number input, minutes), platform dropdown (ZOOM/TEAMS/CUSTOM), meeting link input (or "Generate" button if charity meeting config is set up — check by fetching `GET /api/super-admin/settings/meetings` on mount and checking `configured === true`)
- **Host picker:** defaults to current user. Search input that fetches charity-level users who can manage sessions. Dropdown results, selected host displayed.
- **Attendee picker:** embed the `SessionAttendeePicker` component from Task 11, passing value/onChange
- Submit button: POSTs to `/api/super-admin/sessions` with body including attendee selection as `{ allOrgs, organisationIds, allRoles, roles, userIds, includeCharityStaff }`
- Success → redirect to `/super-admin/sessions`
- Error → show toast
- Back link to `/super-admin/sessions`

The implementer should read `app/(org-admin)/admin/sessions/new/page.tsx` for exact form layout, input styling, validation pattern, and adapt for cross-org context.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add "app/(super-admin)/super-admin/sessions/new/page.tsx"
git commit -m "feat: add charity session creation page with cross-org attendee picker"
```

---

### Task 14: Charity session detail page

**Files:**
- Create: `app/(super-admin)/super-admin/sessions/[sessionId]/page.tsx`

- [ ] **Step 1: Create the session detail page**

Create `app/(super-admin)/super-admin/sessions/[sessionId]/page.tsx` — a client component following the pattern from `app/(org-admin)/admin/sessions/[sessionId]/page.tsx`.

Features:
- Permission check
- Fetch session from `GET /api/super-admin/sessions/[sessionId]`
- **Edit section:** title, description, date/time, duration, platform, host — editable when status is SCHEDULED or IN_PROGRESS, disabled otherwise. Save via `PATCH /api/super-admin/sessions/[sessionId]`
- **Status controls:** conditional buttons based on current status:
  - SCHEDULED → "Start Session" (→ IN_PROGRESS), "Cancel" (→ CANCELLED)
  - IN_PROGRESS → "Complete" (→ COMPLETED), "Cancel" (→ CANCELLED)
  - COMPLETED/CANCELLED → no buttons
- **Meeting link:** display current link, input to change, "Generate Link" button if charity meeting config is set up. Generate via `POST /api/super-admin/sessions/[sessionId]/generate-meeting`
- **Attendee table:** name, email, role, organisation name, attended checkbox. "Mark all present" / "Mark all absent" bulk buttons. Save via `PATCH /api/super-admin/sessions/[sessionId]/attendance`
- **Recording URL:** input field, saved via PATCH
- **Danger zone:** delete with typed confirmation modal ("Yes I want to delete this") via `DELETE /api/super-admin/sessions/[sessionId]`. On success → redirect to `/super-admin/sessions`
- Back link to `/super-admin/sessions`
- Toast notifications

The implementer should read `app/(org-admin)/admin/sessions/[sessionId]/page.tsx` for the exact detail page layout, status button patterns, attendance table, and danger zone styling.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add "app/(super-admin)/super-admin/sessions/[sessionId]/page.tsx"
git commit -m "feat: add charity session detail page with attendance and meeting management"
```

---

### Task 15: Extend SSO check for charity users

**Files:**
- Modify: `app/api/auth/sso-check/route.ts`

- [ ] **Step 1: Extend the SSO check to detect charity SSO**

The current endpoint checks by email domain against `OrgSsoConfig`. Extend it to also check if the user is a charity-level user with charity SSO configured.

Replace the contents of `app/api/auth/sso-check/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const domain = req.nextUrl.searchParams.get('domain')
    if (!domain) {
      return NextResponse.json({ sso: false })
    }

    // Check org-level SSO first (existing behaviour)
    const orgConfig = await prisma.orgSsoConfig.findFirst({
      where: { emailDomain: domain, configured: true },
      include: { organisation: { select: { name: true, slug: true } } },
    })

    if (orgConfig) {
      return NextResponse.json({
        sso: true,
        orgName: orgConfig.organisation.name,
        orgSlug: orgConfig.organisation.slug,
      })
    }

    // Check if any charity-level user exists with this email domain
    // and if charity SSO is configured
    const charityUser = await prisma.user.findFirst({
      where: {
        email: { endsWith: `@${domain}` },
        role: { in: ['SUPER_ADMIN', 'CHARITY_EMPLOYEE'] },
        active: true,
      },
      select: { id: true, ssoOnly: true },
    })

    if (charityUser) {
      const charitySsoConfig = await prisma.charitySsoConfig.findFirst({
        where: { configured: true },
      })

      if (charitySsoConfig) {
        return NextResponse.json({
          sso: true,
          type: 'charity',
          displayName: charitySsoConfig.displayName,
          enforced: charitySsoConfig.enforceForCharityUsers,
          ssoOnly: charityUser.ssoOnly,
        })
      }
    }

    return NextResponse.json({ sso: false })
  } catch (error) {
    console.error('SSO check error:', error)
    return NextResponse.json({ sso: false })
  }
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/api/auth/sso-check/route.ts
git commit -m "feat: extend SSO check endpoint to detect charity-level SAML SSO"
```

---

### Task 16: Extend SAML login and callback for charity SSO

**Files:**
- Modify: `app/api/auth/saml/login/route.ts`
- Modify: `app/api/auth/saml/callback/route.ts`

- [ ] **Step 1: Extend SAML login to handle charity SSO**

Replace `app/api/auth/saml/login/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateSamlLoginUrl } from '@/lib/saml'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, charity } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Charity SSO flow
    if (charity) {
      const config = await prisma.charitySsoConfig.findFirst({
        where: { configured: true },
      })

      if (!config || !config.ssoUrl) {
        return NextResponse.json(
          { error: 'No charity SSO configuration found' },
          { status: 400 }
        )
      }

      const redirectUrl = generateSamlLoginUrl(config.ssoUrl, `charity:${email}`)
      return NextResponse.json({ redirectUrl })
    }

    // Org-level SSO flow (existing)
    const domain = email.split('@')[1]?.toLowerCase()
    if (!domain) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const config = await prisma.orgSsoConfig.findFirst({
      where: { emailDomain: domain, configured: true },
    })

    if (!config) {
      return NextResponse.json(
        { error: 'No SSO configuration found for this email domain' },
        { status: 400 }
      )
    }

    const redirectUrl = generateSamlLoginUrl(config.ssoUrl, email)
    return NextResponse.json({ redirectUrl })
  } catch (error) {
    console.error('SAML login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

Note: The relay state for charity SSO is prefixed with `charity:` to distinguish it in the callback.

- [ ] **Step 2: Extend SAML callback to handle charity SSO**

In `app/api/auth/saml/callback/route.ts`, extend the existing handler. After getting `relayState`, check if it starts with `charity:` to determine the flow.

Replace the file contents:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { encode } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { validateSamlResponse } from '@/lib/saml'
import { getUserPrograms } from '@/lib/modules'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const samlResponse = formData.get('SAMLResponse') as string | null
    const relayState = formData.get('RelayState') as string | null

    if (!samlResponse || !relayState) {
      return NextResponse.redirect(
        new URL('/login?error=Invalid+SAML+response', req.url)
      )
    }

    // Determine if this is a charity SSO callback
    const isCharity = relayState.startsWith('charity:')
    const email = isCharity
      ? relayState.replace('charity:', '').toLowerCase().trim()
      : relayState.toLowerCase().trim()

    const domain = email.split('@')[1]
    if (!domain) {
      return NextResponse.redirect(
        new URL('/login?error=Invalid+email+in+SAML+response', req.url)
      )
    }

    // Look up the appropriate SSO config
    let certificate: string

    if (isCharity) {
      const config = await prisma.charitySsoConfig.findFirst({
        where: { configured: true },
      })
      if (!config || !config.certificate) {
        return NextResponse.redirect(
          new URL('/login?error=No+charity+SSO+configuration+found', req.url)
        )
      }
      certificate = config.certificate
    } else {
      const config = await prisma.orgSsoConfig.findFirst({
        where: { emailDomain: domain, configured: true },
      })
      if (!config) {
        return NextResponse.redirect(
          new URL('/login?error=No+SSO+configuration+found', req.url)
        )
      }
      certificate = config.certificate
    }

    // Validate the SAML response
    const result = await validateSamlResponse(samlResponse, certificate)
    if (!result.valid) {
      console.error('SAML validation failed:', result.error)
      return NextResponse.redirect(
        new URL('/login?error=SSO+authentication+failed', req.url)
      )
    }

    const validatedEmail = (result.email || email).toLowerCase().trim()
    const validatedName = result.name

    // Find user
    let user = await prisma.user.findUnique({
      where: { email: validatedEmail },
      include: { organisation: { select: { active: true } } },
    })

    // For charity SSO, do NOT auto-provision — user must exist as SUPER_ADMIN or CHARITY_EMPLOYEE
    if (isCharity) {
      if (!user) {
        return NextResponse.redirect(
          new URL('/login?error=No+charity+account+found+for+this+email', req.url)
        )
      }
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'CHARITY_EMPLOYEE') {
        return NextResponse.redirect(
          new URL('/login?error=This+account+is+not+a+charity+staff+account', req.url)
        )
      }
    } else {
      // Org SSO — existing auto-provision logic
      if (!user) {
        const orgConfig = await prisma.orgSsoConfig.findFirst({
          where: { emailDomain: domain, configured: true },
        })
        if (orgConfig?.autoProvision) {
          user = await prisma.user.create({
            data: {
              email: validatedEmail,
              name: validatedName || validatedEmail.split('@')[0],
              password: '',
              role: (orgConfig.defaultRole as any) || 'EMPLOYEE',
              organisationId: orgConfig.organisationId,
              active: true,
            },
            include: { organisation: { select: { active: true } } },
          })
        }
      }

      if (!user) {
        return NextResponse.redirect(
          new URL(
            '/login?error=Account+not+found.+Contact+your+organisation+administrator.',
            req.url
          )
        )
      }
    }

    // Build JWT token
    const effectivePrograms = await getUserPrograms(user.id)

    const token = await encode({
      token: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organisationId: user.organisationId,
        mustChangePassword: user.mustChangePassword ?? false,
        totpEnabled: user.totpEnabled ?? false,
        mfaPending: false,
        effectivePrograms,
        charityPermissions: user.charityPermissions ?? [],
      },
      secret: process.env.NEXTAUTH_SECRET!,
    })

    const isProduction = process.env.NODE_ENV === 'production'
    const cookieName = isProduction
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token'

    const response = NextResponse.redirect(new URL('/', req.url))
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    })

    return response
  } catch (error) {
    console.error('SAML callback error:', error)
    return NextResponse.redirect(
      new URL('/login?error=SSO+authentication+failed', req.url)
    )
  }
}
```

Key changes: `charity:` prefix in relayState, charity SSO config lookup, no auto-provisioning for charity users, `charityPermissions` added to JWT token.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/api/auth/saml/login/route.ts app/api/auth/saml/callback/route.ts
git commit -m "feat: extend SAML login and callback to support charity-level SSO"
```

---

### Task 17: Update login page for charity SSO

**Files:**
- Modify: `app/(auth)/login/page.tsx`

- [ ] **Step 1: Extend the login page to handle charity SSO detection**

The login page currently checks `ssoOrg?.sso === true` and shows an enterprise SSO button. Extend this to also handle charity SSO responses.

When `ssoOrg.type === 'charity'`:
- If `ssoOrg.ssoOnly === true` OR `ssoOrg.enforced === true`: hide password form, hide Google/Microsoft buttons, show only "Sign in with [displayName] SSO" button
- If `ssoOrg.ssoOnly === false` AND `ssoOrg.enforced === false`: show the SSO button alongside the normal password/SSO tabs

Update the `handleEnterpriseSso` function to pass `charity: true` when the SSO type is charity:

```typescript
async function handleEnterpriseSso() {
  setLoading(true)
  setError('')
  try {
    const isCharity = ssoOrg?.type === 'charity'
    const res = await fetch('/api/auth/saml/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, charity: isCharity }),
    })
    const data = await res.json()
    if (data.redirectUrl) {
      window.location.href = data.redirectUrl
    } else {
      setError(data.error || 'SSO login failed')
      setLoading(false)
    }
  } catch {
    setError('Network error')
    setLoading(false)
  }
}
```

Update the SSO detection display:
- When `ssoOrg.type === 'charity'` AND (`ssoOrg.ssoOnly` OR `ssoOrg.enforced`): show full-screen charity SSO button (same as org enterprise SSO pattern), with text "Sign in with [displayName]"
- When `ssoOrg.type === 'charity'` AND NOT enforced AND NOT ssoOnly: show the charity SSO button alongside the normal login tabs
- When `ssoOrg.sso === true` AND no `type` property (org SSO): existing behaviour unchanged

Update the `ssoOrg` type to include the new fields:

```typescript
const [ssoOrg, setSsoOrg] = useState<{
  sso: boolean
  orgName?: string
  type?: 'charity'
  displayName?: string
  enforced?: boolean
  ssoOnly?: boolean
} | null>(null)
```

In the render section, the conditional becomes:

```typescript
{ssoOrg?.sso === true && (ssoOrg.type !== 'charity' || ssoOrg.ssoOnly || ssoOrg.enforced) ? (
  /* Full-screen SSO button (org or enforced charity) */
  <div className="space-y-4 text-center">
    <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl mx-auto">
      <Building2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
    </div>
    <div>
      <p className="text-sm text-slate-500 mb-4">
        {ssoOrg.type === 'charity'
          ? 'Your organisation uses Charity SSO'
          : 'Your organisation uses Enterprise SSO'}
      </p>
      <button
        type="button"
        onClick={handleEnterpriseSso}
        disabled={loading}
        className="btn-primary w-full py-2.5 text-base"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Redirecting...
          </span>
        ) : (
          `Sign in with ${ssoOrg.type === 'charity' ? ssoOrg.displayName : ssoOrg.orgName}`
        )}
      </button>
    </div>
  </div>
) : (
  /* Normal login — password / SSO tabs, optionally with charity SSO button */
  <>
    {ssoOrg?.sso === true && ssoOrg.type === 'charity' && !ssoOrg.enforced && !ssoOrg.ssoOnly && (
      <div className="mb-4">
        <button
          type="button"
          onClick={handleEnterpriseSso}
          disabled={loading}
          className="flex items-center justify-center gap-3 w-full py-2.5 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 text-sm font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
        >
          <Building2 className="h-4 w-4" />
          Sign in with {ssoOrg.displayName}
        </button>
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-calm-200 dark:bg-slate-700" />
          <span className="text-xs text-slate-400">or</span>
          <div className="flex-1 h-px bg-calm-200 dark:bg-slate-700" />
        </div>
      </div>
    )}

    {/* Existing login method toggle + forms */}
    {/* ... rest of existing login form unchanged ... */}
  </>
)}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add "app/(auth)/login/page.tsx"
git commit -m "feat: update login page to support charity-level SAML SSO detection"
```

---

### Task 18: Build verification and production deploy

- [ ] **Step 1: Full build verification**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 2: Push schema to production database**

Run: `npx prisma db push`
Expected: Schema synced successfully.

- [ ] **Step 3: Deploy to production**

Run: `npx vercel deploy --prod --yes`
Expected: Deployment succeeds.

- [ ] **Step 4: Push to git remote**

Run: `git push origin main`
