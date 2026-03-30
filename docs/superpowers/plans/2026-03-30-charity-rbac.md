# Charity-Level RBAC Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `CHARITY_EMPLOYEE` role with granular delegated permissions, rename display labels (Super Admin -> Charity Admin, Caregiver -> Practitioner), and build a charity-level user management page.

**Architecture:** The existing `SUPER_ADMIN` enum stays unchanged; a new `CHARITY_EMPLOYEE` value is added to the Role enum. A `charityPermissions String[]` field on User stores coarse-grained permission keys. A centralised `ROLE_LABELS` map in `lib/rbac.ts` drives all display names. The sidebar filters nav items by permission; API routes use `hasPermission()` instead of `isSuperAdmin()`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma ORM, Neon PostgreSQL, NextAuth v4 (JWT), bcryptjs, clsx

---

## File Map

### New Files
| File | Responsibility |
|---|---|
| `app/(super-admin)/super-admin/users/page.tsx` | Charity-level user management page (list, create, edit charity admins and employees) |
| `app/api/super-admin/users/route.ts` | GET (list charity users) + POST (create charity user) |
| `app/api/super-admin/users/[userId]/route.ts` | PATCH (update charity user) |

### Modified Files
| File | What Changes |
|---|---|
| `prisma/schema.prisma` | Add `CHARITY_EMPLOYEE` to Role enum, add `charityPermissions String[] @default([])` to User |
| `types/index.ts` | Add `CHARITY_EMPLOYEE` to Role type, add `charityPermissions` to User interface and next-auth session types |
| `lib/rbac.ts` | Add permission constants, `ROLE_LABELS`, `isCharityAdmin`, `isCharityEmployee`, `isCharityLevel`, `hasPermission` |
| `lib/auth.ts` | Add `charityPermissions` to JWT and session callbacks |
| `middleware.ts` | Allow `CHARITY_EMPLOYEE` on `/super-admin/*`, add to MFA enforcement, add to `homeForRole` |
| `components/layout/topbar.tsx` | Use `ROLE_LABELS` instead of `.toLowerCase()` |
| `components/layout/super-admin-sidebar.tsx` | Add permission gating per nav item, add Users nav item, update badge labels |
| `app/(super-admin)/layout.tsx` | Allow `CHARITY_EMPLOYEE` role access |
| `app/(super-admin)/super-admin/page.tsx` | Replace `isSuperAdmin` with `isCharityLevel`, filter cards by permission |
| All 28 super-admin API routes | Replace `isSuperAdmin(session)` with `hasPermission(session, '<permission>')` |
| `app/(super-admin)/super-admin/guide/page.tsx` | Update terminology from "Super Admin" to "Charity Admin", add Charity Employee section |

---

### Task 1: Prisma Schema — Add CHARITY_EMPLOYEE Role and charityPermissions Field

**Files:**
- Modify: `prisma/schema.prisma` (lines 394-403 Role enum, lines 11-20 User model)

- [ ] **Step 1: Add CHARITY_EMPLOYEE to Role enum**

In `prisma/schema.prisma`, change the Role enum from:

```prisma
enum Role {
  SUPER_ADMIN
  ORG_ADMIN
  CAREGIVER
  CAREER_DEV_OFFICER
  STUDENT
  INTERN
  EMPLOYEE
}
```

to:

```prisma
enum Role {
  SUPER_ADMIN
  CHARITY_EMPLOYEE
  ORG_ADMIN
  CAREGIVER
  CAREER_DEV_OFFICER
  STUDENT
  INTERN
  EMPLOYEE
}
```

- [ ] **Step 2: Add charityPermissions field to User model**

In `prisma/schema.prisma`, add the `charityPermissions` field to the User model after the `totpEnabled` field (line 22):

```prisma
model User {
  id                 String             @id @default(cuid())
  email              String             @unique
  name               String?
  password           String
  role               Role               @default(CAREGIVER)
  active             Boolean            @default(true)
  organisationId     String?
  mustChangePassword Boolean            @default(false)
  totpSecret         String?
  totpEnabled        Boolean            @default(false)
  charityPermissions String[]           @default([])
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  organisation     Organisation?      @relation(fields: [organisationId], references: [id])
  accounts         Account[]
  children         Child[]
  sessions         Session[]
  trainingProgress TrainingProgress[]
  announcements    Announcement[]     @relation("AnnouncementsCreated")
  hostedSessions   ClassSession[]     @relation("SessionHost")
  createdSessions  ClassSession[]     @relation("SessionCreator")
  sessionAttendees SessionAttendee[]
  surveysCreated   Survey[]         @relation("SurveysCreated")
  surveyResponses  SurveyResponse[] @relation("SurveyResponses")
}
```

- [ ] **Step 3: Generate Prisma client**

Run: `npx prisma generate`
Expected: `✔ Generated Prisma Client`

- [ ] **Step 4: Push schema to database**

Run: `npx prisma db push`
Expected: `Your database is now in sync with your Prisma schema.`

Note: If running locally without production DB access, this can be deferred. Use `npx vercel env pull .env.production.local --environment production --yes` then `export $(grep -v '^#' .env.production.local | xargs) && npx prisma db push` for production.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add CHARITY_EMPLOYEE role and charityPermissions field to schema"
```

---

### Task 2: TypeScript Types — Extend Role, User, and Session Types

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Add CHARITY_EMPLOYEE to Role type**

In `types/index.ts`, change the Role type from:

```typescript
export type Role =
  | 'SUPER_ADMIN'
  | 'ORG_ADMIN'
  | 'CAREGIVER'
  | 'CAREER_DEV_OFFICER'
  | 'STUDENT'
  | 'INTERN'
  | 'EMPLOYEE'
```

to:

```typescript
export type Role =
  | 'SUPER_ADMIN'
  | 'CHARITY_EMPLOYEE'
  | 'ORG_ADMIN'
  | 'CAREGIVER'
  | 'CAREER_DEV_OFFICER'
  | 'STUDENT'
  | 'INTERN'
  | 'EMPLOYEE'
```

- [ ] **Step 2: Add charityPermissions to User interface**

In `types/index.ts`, add to the User interface after `mfaPending`:

```typescript
export interface User {
  id: string
  email: string
  name?: string | null
  role: Role
  active: boolean
  organisationId?: string | null
  mustChangePassword: boolean
  totpEnabled?: boolean
  mfaPending?: boolean
  charityPermissions?: string[]
  createdAt: Date
  updatedAt: Date
}
```

- [ ] **Step 3: Add charityPermissions to NextAuth session and JWT types**

In `types/index.ts`, update the `next-auth` and `next-auth/jwt` module declarations:

```typescript
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      role: string
      organisationId?: string | null
      mustChangePassword: boolean
      totpEnabled: boolean
      mfaPending: boolean
      effectivePrograms: { id: string; name: string }[]
      charityPermissions: string[]
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    organisationId?: string | null
    mustChangePassword: boolean
    totpEnabled: boolean
    mfaPending: boolean
    effectivePrograms: { id: string; name: string }[]
    charityPermissions: string[]
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add types/index.ts
git commit -m "feat: add CHARITY_EMPLOYEE to Role type and charityPermissions to session types"
```

---

### Task 3: RBAC Helpers — Permission Constants, Role Labels, and Authorization Functions

**Files:**
- Modify: `lib/rbac.ts`

- [ ] **Step 1: Rewrite lib/rbac.ts with all new helpers**

Replace the entire contents of `lib/rbac.ts` with:

```typescript
import { Session } from 'next-auth'
import type { Role } from '@/types'

// ─── Permission constants ──────────────────────────────────────────────────────

export const CHARITY_PERMISSIONS = {
  MANAGE_ORGANISATIONS: 'manage_organisations',
  MANAGE_TRAINING: 'manage_training',
  MANAGE_SURVEYS: 'manage_surveys',
  MANAGE_ANNOUNCEMENTS: 'manage_announcements',
  VIEW_REPORTS: 'view_reports',
} as const

export type CharityPermission = (typeof CHARITY_PERMISSIONS)[keyof typeof CHARITY_PERMISSIONS]

export const ALL_CHARITY_PERMISSIONS: CharityPermission[] = Object.values(CHARITY_PERMISSIONS)

export const PERMISSION_LABELS: Record<string, string> = {
  manage_organisations: 'Manage Organisations',
  manage_training: 'Manage Training',
  manage_surveys: 'Manage Surveys',
  manage_announcements: 'Manage Announcements',
  view_reports: 'View Reports',
}

// ─── Display labels ────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Charity Admin',
  CHARITY_EMPLOYEE: 'Charity Employee',
  ORG_ADMIN: 'Org Admin',
  CAREGIVER: 'Practitioner',
  CAREER_DEV_OFFICER: 'Careers Professional',
  STUDENT: 'Student',
  INTERN: 'Intern',
  EMPLOYEE: 'Employee',
}

/** Get the display label for a role. Falls back to the raw role string. */
export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role
}

// ─── Role checks ───────────────────────────────────────────────────────────────

/**
 * Returns true if the session has one of the required roles.
 */
export function hasRole(session: Session | null, ...roles: Role[]): boolean {
  if (!session?.user?.role) return false
  return roles.includes(session.user.role as Role)
}

/** SUPER_ADMIN — top-level charity authority (Charity Admin) */
export function isSuperAdmin(session: Session | null): boolean {
  return hasRole(session, 'SUPER_ADMIN')
}

/** Alias for isSuperAdmin — used in display contexts */
export const isCharityAdmin = isSuperAdmin

/** CHARITY_EMPLOYEE — delegated charity-level access */
export function isCharityEmployee(session: Session | null): boolean {
  return hasRole(session, 'CHARITY_EMPLOYEE')
}

/** Returns true if the user is either SUPER_ADMIN or CHARITY_EMPLOYEE */
export function isCharityLevel(session: Session | null): boolean {
  return hasRole(session, 'SUPER_ADMIN', 'CHARITY_EMPLOYEE')
}

/** ORG_ADMIN — manages one organisation */
export function isOrgAdmin(session: Session | null): boolean {
  return hasRole(session, 'ORG_ADMIN')
}

/** Any of the five leaf roles (end users who do training) */
export function isLeafRole(session: Session | null): boolean {
  return hasRole(session, 'CAREGIVER', 'CAREER_DEV_OFFICER', 'STUDENT', 'INTERN', 'EMPLOYEE')
}

/**
 * Backwards-compat alias. Now checks SUPER_ADMIN instead of ADMIN.
 */
export function isAdmin(session: Session | null): boolean {
  return isSuperAdmin(session)
}

/**
 * Returns true if the user's role is CAREER_DEV_OFFICER.
 * SUPER_ADMIN and ORG_ADMIN do NOT access training routes.
 */
export function canAccessCareers(session: Session | null): boolean {
  return hasRole(session, 'CAREER_DEV_OFFICER')
}

/**
 * Returns true if the user's role is CAREGIVER.
 * SUPER_ADMIN and ORG_ADMIN do NOT access training routes.
 */
export function canAccessCaregiving(session: Session | null): boolean {
  return hasRole(session, 'CAREGIVER')
}

/** Roles that can create and manage virtual classroom sessions */
export function canCreateSessions(session: Session | null): boolean {
  return hasRole(session, 'ORG_ADMIN', 'CAREGIVER', 'CAREER_DEV_OFFICER')
}

// ─── Permission checks ─────────────────────────────────────────────────────────

/**
 * Check if a user has a specific charity-level permission.
 * - SUPER_ADMIN always returns true (full access).
 * - CHARITY_EMPLOYEE checks the charityPermissions array.
 * - All other roles return false.
 */
export function hasPermission(session: Session | null, permission: string): boolean {
  if (!session?.user?.role) return false
  if (session.user.role === 'SUPER_ADMIN') return true
  if (session.user.role === 'CHARITY_EMPLOYEE') {
    const perms = session.user.charityPermissions ?? []
    return perms.includes(permission)
  }
  return false
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors related to `lib/rbac.ts` (there may be unrelated existing errors)

- [ ] **Step 3: Commit**

```bash
git add lib/rbac.ts
git commit -m "feat: add permission constants, ROLE_LABELS, and hasPermission to RBAC helpers"
```

---

### Task 4: Auth — Add charityPermissions to JWT and Session

**Files:**
- Modify: `lib/auth.ts` (lines 172-230)

- [ ] **Step 1: Update the JWT callback to include charityPermissions**

In `lib/auth.ts`, in the `jwt` callback, update the credentials login block (around line 174) to also fetch `charityPermissions`:

Change:

```typescript
      // Credentials login — user object already has DB fields
      if (user && account?.provider === 'credentials') {
        token.id = user.id
        token.role = (user as { role?: string }).role ?? 'CAREGIVER'
        token.organisationId = (user as { organisationId?: string | null }).organisationId ?? null
        token.mustChangePassword = (user as { mustChangePassword?: boolean }).mustChangePassword ?? false
        token.totpEnabled = (user as { totpEnabled?: boolean }).totpEnabled ?? false
        token.mfaPending = (user as { mfaPending?: boolean }).mfaPending ?? false
        token.effectivePrograms = await getUserEffectivePrograms(user.id)
      }
```

to:

```typescript
      // Credentials login — user object already has DB fields
      if (user && account?.provider === 'credentials') {
        token.id = user.id
        token.role = (user as { role?: string }).role ?? 'CAREGIVER'
        token.organisationId = (user as { organisationId?: string | null }).organisationId ?? null
        token.mustChangePassword = (user as { mustChangePassword?: boolean }).mustChangePassword ?? false
        token.totpEnabled = (user as { totpEnabled?: boolean }).totpEnabled ?? false
        token.mfaPending = (user as { mfaPending?: boolean }).mfaPending ?? false
        token.effectivePrograms = await getUserEffectivePrograms(user.id)
        // Fetch charityPermissions for charity-level users
        const dbUserForPerms = await prisma.user.findUnique({
          where: { id: user.id },
          select: { charityPermissions: true },
        })
        token.charityPermissions = dbUserForPerms?.charityPermissions ?? []
      }
```

- [ ] **Step 2: Update the SSO login block to include charityPermissions**

In the SSO login block (around line 186), update the select to include `charityPermissions`:

Change:

```typescript
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email ?? '' },
          select: { id: true, role: true, organisationId: true, mustChangePassword: true, totpEnabled: true },
        })
        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
          token.organisationId = dbUser.organisationId
          token.mustChangePassword = dbUser.mustChangePassword
          token.totpEnabled = dbUser.totpEnabled
          token.mfaPending = dbUser.totpEnabled === true
          token.effectivePrograms = await getUserEffectivePrograms(dbUser.id)
        }
```

to:

```typescript
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email ?? '' },
          select: { id: true, role: true, organisationId: true, mustChangePassword: true, totpEnabled: true, charityPermissions: true },
        })
        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
          token.organisationId = dbUser.organisationId
          token.mustChangePassword = dbUser.mustChangePassword
          token.totpEnabled = dbUser.totpEnabled
          token.mfaPending = dbUser.totpEnabled === true
          token.effectivePrograms = await getUserEffectivePrograms(dbUser.id)
          token.charityPermissions = dbUser.charityPermissions ?? []
        }
```

- [ ] **Step 3: Update the session-update trigger to include charityPermissions**

In the `trigger === 'update'` block (around line 201), update the select and token:

Change:

```typescript
      if (trigger === 'update') {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, organisationId: true, mustChangePassword: true, totpEnabled: true },
        })
        if (dbUser) {
          token.role = dbUser.role
          token.organisationId = dbUser.organisationId
          token.mustChangePassword = dbUser.mustChangePassword
          token.totpEnabled = dbUser.totpEnabled
        }
```

to:

```typescript
      if (trigger === 'update') {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, organisationId: true, mustChangePassword: true, totpEnabled: true, charityPermissions: true },
        })
        if (dbUser) {
          token.role = dbUser.role
          token.organisationId = dbUser.organisationId
          token.mustChangePassword = dbUser.mustChangePassword
          token.totpEnabled = dbUser.totpEnabled
          token.charityPermissions = dbUser.charityPermissions ?? []
        }
```

- [ ] **Step 4: Update the session callback to surface charityPermissions**

In the `session` callback (around line 218), add the charityPermissions line:

Change:

```typescript
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.organisationId = (token.organisationId as string | null) ?? null
        session.user.mustChangePassword = token.mustChangePassword as boolean
        session.user.totpEnabled = token.totpEnabled as boolean
        session.user.mfaPending = token.mfaPending as boolean
        session.user.effectivePrograms = (token.effectivePrograms as ProgramInfo[]) ?? []
      }
      return session
    },
```

to:

```typescript
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.organisationId = (token.organisationId as string | null) ?? null
        session.user.mustChangePassword = token.mustChangePassword as boolean
        session.user.totpEnabled = token.totpEnabled as boolean
        session.user.mfaPending = token.mfaPending as boolean
        session.user.effectivePrograms = (token.effectivePrograms as ProgramInfo[]) ?? []
        session.user.charityPermissions = (token.charityPermissions as string[]) ?? []
      }
      return session
    },
```

- [ ] **Step 5: Commit**

```bash
git add lib/auth.ts
git commit -m "feat: include charityPermissions in JWT token and session object"
```

---

### Task 5: Middleware — Allow CHARITY_EMPLOYEE on /super-admin/* Routes

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Update /super-admin route guard**

In `middleware.ts`, change line 88 from:

```typescript
  // Route protection: /super-admin/* — SUPER_ADMIN only
  if (pathname.startsWith('/super-admin') && role !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL(homeForRole(role), req.url))
  }
```

to:

```typescript
  // Route protection: /super-admin/* — SUPER_ADMIN and CHARITY_EMPLOYEE
  if (pathname.startsWith('/super-admin') && role !== 'SUPER_ADMIN' && role !== 'CHARITY_EMPLOYEE') {
    return NextResponse.redirect(new URL(homeForRole(role), req.url))
  }
```

- [ ] **Step 2: Update MFA enforcement to include CHARITY_EMPLOYEE**

In `middleware.ts`, change the admin MFA check (line 70-71) from:

```typescript
  // Force MFA setup for admin roles
  const isAdmin = role === 'SUPER_ADMIN' || role === 'ORG_ADMIN'
```

to:

```typescript
  // Force MFA setup for admin roles
  const isAdmin = role === 'SUPER_ADMIN' || role === 'CHARITY_EMPLOYEE' || role === 'ORG_ADMIN'
```

- [ ] **Step 3: Update leaf-only path block to include CHARITY_EMPLOYEE**

In `middleware.ts`, change the block around line 98 from:

```typescript
  // SUPER_ADMIN and ORG_ADMIN cannot access leaf-role routes (except training/careers preview for super admins)
  if (role === 'SUPER_ADMIN' || role === 'ORG_ADMIN') {
    const previewPaths = ['/training', '/careers']
    const isPreview = role === 'SUPER_ADMIN' && previewPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))
```

to:

```typescript
  // Charity-level, ORG_ADMIN cannot access leaf-role routes (except training/careers preview for charity-level users)
  if (role === 'SUPER_ADMIN' || role === 'CHARITY_EMPLOYEE' || role === 'ORG_ADMIN') {
    const previewPaths = ['/training', '/careers']
    const isPreview = (role === 'SUPER_ADMIN' || role === 'CHARITY_EMPLOYEE') && previewPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))
```

- [ ] **Step 4: Update homeForRole to handle CHARITY_EMPLOYEE**

In `middleware.ts`, change the `homeForRole` function from:

```typescript
function homeForRole(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/super-admin'
    case 'ORG_ADMIN':
      return '/admin'
    default:
      return '/dashboard'
  }
}
```

to:

```typescript
function homeForRole(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN':
    case 'CHARITY_EMPLOYEE':
      return '/super-admin'
    case 'ORG_ADMIN':
      return '/admin'
    default:
      return '/dashboard'
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add middleware.ts
git commit -m "feat: allow CHARITY_EMPLOYEE role on /super-admin routes with MFA enforcement"
```

---

### Task 6: Topbar — Fix Role Display Labels

**Files:**
- Modify: `components/layout/topbar.tsx`

- [ ] **Step 1: Import getRoleLabel and use it in topbar**

In `components/layout/topbar.tsx`, add the import and replace the raw `.toLowerCase()` display:

Change the import section:

```typescript
'use client'

import { useSession } from 'next-auth/react'
import { Menu, Bell } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
```

to:

```typescript
'use client'

import { useSession } from 'next-auth/react'
import { Menu, Bell } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { getRoleLabel } from '@/lib/rbac'
```

Then change the role display (line 55-56) from:

```typescript
            <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">
              {session?.user?.role?.toLowerCase() || 'practitioner'}
            </p>
```

to:

```typescript
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {session?.user?.role ? getRoleLabel(session.user.role) : 'Practitioner'}
            </p>
```

- [ ] **Step 2: Commit**

```bash
git add components/layout/topbar.tsx
git commit -m "fix: use ROLE_LABELS in topbar instead of raw lowercase role string"
```

---

### Task 7: Super Admin Sidebar — Permission-Gated Navigation

**Files:**
- Modify: `components/layout/super-admin-sidebar.tsx`

- [ ] **Step 1: Rewrite the super-admin sidebar with permission gating**

Replace the entire contents of `components/layout/super-admin-sidebar.tsx` with:

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
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
} from 'lucide-react'
import { clsx } from 'clsx'
import { CHARITY_PERMISSIONS } from '@/lib/rbac'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  exact?: boolean
  /** If set, only shown when user has this permission (SUPER_ADMIN always passes) */
  permission?: string
  /** If true, only visible to SUPER_ADMIN (not CHARITY_EMPLOYEE) */
  charityAdminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/super-admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/super-admin/users', label: 'Users', icon: Users, charityAdminOnly: true },
  { href: '/super-admin/organisations', label: 'Organisations', icon: Building2, permission: CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS },
  { href: '/super-admin/training', label: 'Training Content', icon: BookOpen, permission: CHARITY_PERMISSIONS.MANAGE_TRAINING },
  { href: '/super-admin/surveys', label: 'Surveys', icon: ClipboardList, permission: CHARITY_PERMISSIONS.MANAGE_SURVEYS },
  { href: '/super-admin/announcements', label: 'Announcements', icon: Megaphone, permission: CHARITY_PERMISSIONS.MANAGE_ANNOUNCEMENTS },
  { href: '/super-admin/reports', label: 'Reports', icon: BarChart3, permission: CHARITY_PERMISSIONS.VIEW_REPORTS },
  { href: '/super-admin/guide', label: 'How to Guide', icon: HelpCircle },
]

interface SuperAdminSidebarProps {
  onClose?: () => void
  mobile?: boolean
}

export function SuperAdminSidebar({ onClose, mobile }: SuperAdminSidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()

  const role = session?.user?.role
  const isCharityAdmin = role === 'SUPER_ADMIN'
  const charityPermissions: string[] = session?.user?.charityPermissions ?? []

  /** Check if the user can see a given nav item */
  function canSee(item: NavItem): boolean {
    // SUPER_ADMIN sees everything
    if (isCharityAdmin) return true
    // Charity Admin-only items are hidden from CHARITY_EMPLOYEE
    if (item.charityAdminOnly) return false
    // Items with a permission requirement: check the permissions array
    if (item.permission) return charityPermissions.includes(item.permission)
    // Items with no gating are always visible
    return true
  }

  const visibleItems = NAV_ITEMS.filter(canSee)

  const badgeLabel = isCharityAdmin ? 'Charity Admin' : 'Charity Employee'
  const badgeStyle = isCharityAdmin
    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'

  return (
    <div className="flex flex-col h-full bg-orange-50 dark:bg-slate-800 border-r border-calm-200 dark:border-slate-700">
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-calm-200 dark:border-slate-700 bg-orange-50 dark:bg-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="18,2 34,32 2,32" fill="#f5821f" />
              <polygon points="18,10 28,28 8,28" fill="#fcaf17" opacity="0.7" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight">Ambitious about</p>
            <p className="font-bold text-primary-500 text-sm leading-tight">Autism</p>
          </div>
        </div>
        {mobile && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-calm-100 dark:hover:bg-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Role badge */}
      <div className="px-5 py-2 border-b border-calm-100 dark:border-slate-700">
        <span className={clsx(
          'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
          badgeStyle,
        )}>
          <Crown className="h-3 w-3" />
          {badgeLabel}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1" aria-label="Super admin navigation">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all',
                isActive
                  ? 'bg-purple-50 text-purple-600 shadow-sm dark:bg-purple-900/30 dark:text-purple-400'
                  : 'text-slate-600 hover:bg-calm-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100'
              )}
            >
              <Icon
                className={clsx(
                  'h-5 w-5 flex-shrink-0',
                  isActive ? 'text-purple-500 dark:text-purple-400' : 'text-slate-400 dark:text-slate-500'
                )}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-calm-200 dark:border-slate-700 space-y-2">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all w-full"
        >
          <LogOut className="h-5 w-5 text-slate-400 dark:text-slate-500" />
          Sign out
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/layout/super-admin-sidebar.tsx
git commit -m "feat: add permission-gated navigation and Charity Admin/Employee badges to sidebar"
```

---

### Task 8: Super Admin Layout — Allow CHARITY_EMPLOYEE Access

**Files:**
- Modify: `app/(super-admin)/layout.tsx`

- [ ] **Step 1: Update the role check in the layout**

In `app/(super-admin)/layout.tsx`, change line 14 from:

```typescript
  if (status === 'authenticated' && session?.user?.role !== 'SUPER_ADMIN') redirect('/dashboard')
```

to:

```typescript
  if (status === 'authenticated' && session?.user?.role !== 'SUPER_ADMIN' && session?.user?.role !== 'CHARITY_EMPLOYEE') redirect('/dashboard')
```

- [ ] **Step 2: Commit**

```bash
git add "app/(super-admin)/layout.tsx"
git commit -m "feat: allow CHARITY_EMPLOYEE role in super-admin layout"
```

---

### Task 9: Update All Super Admin API Routes — Replace isSuperAdmin with hasPermission

**Files:**
- Modify: All 28 API route files under `app/api/super-admin/`

The pattern is the same for every file. Replace the import and the check.

- [ ] **Step 1: Update organisation API routes (manage_organisations permission)**

For each of these files, replace `import { isSuperAdmin } from '@/lib/rbac'` with `import { hasPermission } from '@/lib/rbac'` and replace `!isSuperAdmin(session)` with `!hasPermission(session, 'manage_organisations')`:

- `app/api/super-admin/organisations/route.ts`
- `app/api/super-admin/organisations/[orgId]/route.ts`
- `app/api/super-admin/organisations/[orgId]/admins/route.ts`

Example for `app/api/super-admin/organisations/route.ts`:

Change:
```typescript
import { isSuperAdmin } from '@/lib/rbac'
```
to:
```typescript
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
```

Change every occurrence of:
```typescript
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
```
to:
```typescript
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
```

- [ ] **Step 2: Update training API routes (manage_training permission)**

Apply the same pattern with `CHARITY_PERMISSIONS.MANAGE_TRAINING` to:

- `app/api/super-admin/training/modules/route.ts`
- `app/api/super-admin/training/modules/[moduleId]/route.ts`
- `app/api/super-admin/training/modules/[moduleId]/lessons/route.ts`
- `app/api/super-admin/training/lessons/[lessonId]/route.ts`
- `app/api/super-admin/training/programs/route.ts`
- `app/api/super-admin/training/programs/[programId]/route.ts`
- `app/api/super-admin/training/quiz/[lessonId]/route.ts`
- `app/api/super-admin/training/quiz/question/[questionId]/route.ts`
- `app/api/super-admin/training/generate-content/route.ts`
- `app/api/super-admin/training/generate-outline/route.ts`
- `app/api/super-admin/training/generate-quiz/route.ts`
- `app/api/super-admin/training/parse-files/route.ts`
- `app/api/super-admin/training/parse-and-regenerate/route.ts`
- `app/api/super-admin/training/save-program/route.ts`

- [ ] **Step 3: Update survey API routes (manage_surveys permission)**

Apply the same pattern with `CHARITY_PERMISSIONS.MANAGE_SURVEYS` to:

- `app/api/super-admin/surveys/route.ts`
- `app/api/super-admin/surveys/[surveyId]/route.ts`
- `app/api/super-admin/surveys/[surveyId]/publish/route.ts`
- `app/api/super-admin/surveys/[surveyId]/close/route.ts`
- `app/api/super-admin/surveys/[surveyId]/results/route.ts`
- `app/api/super-admin/surveys/[surveyId]/insights/route.ts`
- `app/api/super-admin/surveys/generate-ai/route.ts`
- `app/api/super-admin/surveys/generate-ai-from-files/route.ts`

- [ ] **Step 4: Update announcement API routes (manage_announcements permission)**

Apply the same pattern with `CHARITY_PERMISSIONS.MANAGE_ANNOUNCEMENTS` to:

- `app/api/super-admin/announcements/route.ts`
- `app/api/super-admin/announcements/[id]/route.ts`

- [ ] **Step 5: Update reports API route (view_reports permission)**

Apply the same pattern with `CHARITY_PERMISSIONS.VIEW_REPORTS` to:

- `app/api/super-admin/reports/route.ts`

- [ ] **Step 6: Commit**

```bash
git add app/api/super-admin/
git commit -m "feat: replace isSuperAdmin with hasPermission checks across all super-admin API routes"
```

---

### Task 10: Update Super Admin Overview Page — Use isCharityLevel and Filter by Permissions

**Files:**
- Modify: `app/(super-admin)/super-admin/page.tsx`

- [ ] **Step 1: Update the overview page imports and auth check**

In `app/(super-admin)/super-admin/page.tsx`, change:

```typescript
import { isSuperAdmin } from '@/lib/rbac'
```

to:

```typescript
import { isCharityLevel, hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
```

Change line 11 from:

```typescript
  if (!session || !isSuperAdmin(session)) redirect('/login')
```

to:

```typescript
  if (!session || !isCharityLevel(session)) redirect('/login')
```

- [ ] **Step 2: Update the page title**

Change line 57-58 from:

```typescript
        <h1 className="text-2xl font-bold text-slate-900">Super Admin Overview</h1>
        <p className="text-slate-500 mt-1">Platform-wide statistics and organisation summary.</p>
```

to:

```typescript
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Charity Admin Overview</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Platform-wide statistics and organisation summary.</p>
```

- [ ] **Step 3: Wrap stat cards and org table with permission checks**

Wrap the stat cards and the org table in permission checks. For example, wrap the "Organisations" stat card and the org summary table with:

```typescript
{hasPermission(session, CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS) && (
  // ... Organisations stat card and org summary table ...
)}
```

The "Total users" card should also be gated behind `MANAGE_ORGANISATIONS`.
The "Completed lessons" card and org lessons data can remain visible to anyone with `VIEW_REPORTS` or `MANAGE_TRAINING`.

- [ ] **Step 4: Commit**

```bash
git add "app/(super-admin)/super-admin/page.tsx"
git commit -m "feat: update overview page with isCharityLevel check and permission-gated cards"
```

---

### Task 11: Charity User Management API — GET + POST

**Files:**
- Create: `app/api/super-admin/users/route.ts`

- [ ] **Step 1: Create the users API route**

Create `app/api/super-admin/users/route.ts` with:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin, ALL_CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['SUPER_ADMIN', 'CHARITY_EMPLOYEE']),
  charityPermissions: z.array(z.string()).default([]),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    where: { role: { in: ['SUPER_ADMIN', 'CHARITY_EMPLOYEE'] } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      charityPermissions: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  // Validate permissions are real permission keys
  const invalidPerms = parsed.data.charityPermissions.filter(
    (p) => !ALL_CHARITY_PERMISSIONS.includes(p as any)
  )
  if (invalidPerms.length > 0) {
    return NextResponse.json({ error: `Invalid permissions: ${invalidPerms.join(', ')}` }, { status: 400 })
  }

  // Check email uniqueness
  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (existing) {
    return NextResponse.json({ error: 'A user with that email already exists.' }, { status: 409 })
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 12)

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: hashedPassword,
      role: parsed.data.role,
      charityPermissions: parsed.data.role === 'SUPER_ADMIN' ? [] : parsed.data.charityPermissions,
      mustChangePassword: true,
      organisationId: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      charityPermissions: true,
      createdAt: true,
    },
  })

  return NextResponse.json(user, { status: 201 })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/super-admin/users/route.ts
git commit -m "feat: add GET and POST API routes for charity-level user management"
```

---

### Task 12: Charity User Management API — PATCH (Update)

**Files:**
- Create: `app/api/super-admin/users/[userId]/route.ts`

- [ ] **Step 1: Create the user update API route**

Create the directory first:
```bash
mkdir -p "app/api/super-admin/users/[userId]"
```

Create `app/api/super-admin/users/[userId]/route.ts` with:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin, ALL_CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  role: z.enum(['SUPER_ADMIN', 'CHARITY_EMPLOYEE']).optional(),
  charityPermissions: z.array(z.string()).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId } = params

  // Verify the target user exists and is a charity-level user
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  })

  if (!targetUser || !['SUPER_ADMIN', 'CHARITY_EMPLOYEE'].includes(targetUser.role)) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  // Cannot deactivate yourself
  if (parsed.data.active === false && userId === session.user.id) {
    return NextResponse.json({ error: 'You cannot deactivate your own account.' }, { status: 400 })
  }

  // Validate permissions
  if (parsed.data.charityPermissions) {
    const invalidPerms = parsed.data.charityPermissions.filter(
      (p) => !ALL_CHARITY_PERMISSIONS.includes(p as any)
    )
    if (invalidPerms.length > 0) {
      return NextResponse.json({ error: `Invalid permissions: ${invalidPerms.join(', ')}` }, { status: 400 })
    }
  }

  // Build update data
  const updateData: Record<string, unknown> = {}

  if (parsed.data.name !== undefined) updateData.name = parsed.data.name
  if (parsed.data.active !== undefined) updateData.active = parsed.data.active

  if (parsed.data.role !== undefined) {
    updateData.role = parsed.data.role
    // If promoting to SUPER_ADMIN, clear permissions (they have implicit full access)
    if (parsed.data.role === 'SUPER_ADMIN') {
      updateData.charityPermissions = []
    }
  }

  if (parsed.data.charityPermissions !== undefined) {
    // Only set permissions if the resulting role is CHARITY_EMPLOYEE
    const resultingRole = (parsed.data.role ?? targetUser.role) as string
    if (resultingRole === 'CHARITY_EMPLOYEE') {
      updateData.charityPermissions = parsed.data.charityPermissions
    }
  }

  if (parsed.data.password) {
    updateData.password = await bcrypt.hash(parsed.data.password, 12)
    updateData.mustChangePassword = true
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      charityPermissions: true,
      createdAt: true,
    },
  })

  return NextResponse.json(updated)
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/api/super-admin/users/[userId]/route.ts"
git commit -m "feat: add PATCH API route for updating charity-level users"
```

---

### Task 13: Charity User Management Page

**Files:**
- Create: `app/(super-admin)/super-admin/users/page.tsx`

- [ ] **Step 1: Create the charity user management page**

Create `app/(super-admin)/super-admin/users/page.tsx` with a client component that:

1. Fetches charity-level users from `GET /api/super-admin/users`
2. Lists them in a table/card view with: name, email, role badge ("Charity Admin" purple / "Charity Employee" blue), permissions tags, active status, created date
3. "Add User" button opens an inline form with:
   - Name (text input, required)
   - Email (email input, required)
   - Password (password input, required, min 8 chars)
   - Role toggle: Charity Admin / Charity Employee (two buttons like the survey target picker)
   - When "Charity Employee" is selected, show 5 permission checkboxes:
     - Manage Organisations
     - Manage Training
     - Manage Surveys
     - Manage Announcements
     - View Reports
   - When "Charity Admin" is selected, hide permissions (they have full access)
   - Submit button → POST to `/api/super-admin/users`
4. Each user row has an "Edit" button that opens the same inline form pre-filled
   - Edit form additionally has: Active toggle, Reset Password field
   - Submit → PATCH to `/api/super-admin/users/[userId]`
5. Cannot deactivate self (button disabled with tooltip)

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  Users,
  Plus,
  Pencil,
  Crown,
  Shield,
  X,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { clsx } from 'clsx'
import { PERMISSION_LABELS, ALL_CHARITY_PERMISSIONS } from '@/lib/rbac'

interface CharityUser {
  id: string
  name: string | null
  email: string
  role: 'SUPER_ADMIN' | 'CHARITY_EMPLOYEE'
  active: boolean
  charityPermissions: string[]
  createdAt: string
}

type FormMode = 'closed' | 'create' | 'edit'

export default function CharityUsersPage() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<CharityUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formMode, setFormMode] = useState<FormMode>('closed')
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Form fields
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole] = useState<'SUPER_ADMIN' | 'CHARITY_EMPLOYEE'>('CHARITY_EMPLOYEE')
  const [formPermissions, setFormPermissions] = useState<string[]>([])
  const [formActive, setFormActive] = useState(true)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/users')
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      setUsers(data)
    } catch {
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const resetForm = () => {
    setFormName('')
    setFormEmail('')
    setFormPassword('')
    setFormRole('CHARITY_EMPLOYEE')
    setFormPermissions([])
    setFormActive(true)
    setFormError('')
    setEditingUserId(null)
  }

  const openCreate = () => {
    resetForm()
    setFormMode('create')
  }

  const openEdit = (user: CharityUser) => {
    setFormName(user.name ?? '')
    setFormEmail(user.email)
    setFormPassword('')
    setFormRole(user.role)
    setFormPermissions(user.charityPermissions)
    setFormActive(user.active)
    setFormError('')
    setEditingUserId(user.id)
    setFormMode('edit')
  }

  const closeForm = () => {
    setFormMode('closed')
    resetForm()
  }

  const togglePermission = (perm: string) => {
    setFormPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    )
  }

  const handleSubmit = async () => {
    setFormError('')
    setSaving(true)
    try {
      if (formMode === 'create') {
        if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
          setFormError('Name, email, and password are required')
          setSaving(false)
          return
        }
        const res = await fetch('/api/super-admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName.trim(),
            email: formEmail.trim(),
            password: formPassword,
            role: formRole,
            charityPermissions: formRole === 'CHARITY_EMPLOYEE' ? formPermissions : [],
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          setFormError(data.error ?? 'Failed to create user')
          setSaving(false)
          return
        }
      } else if (formMode === 'edit' && editingUserId) {
        const body: Record<string, unknown> = {
          name: formName.trim(),
          role: formRole,
          charityPermissions: formRole === 'CHARITY_EMPLOYEE' ? formPermissions : [],
          active: formActive,
        }
        if (formPassword.trim()) {
          body.password = formPassword
        }
        const res = await fetch(`/api/super-admin/users/${editingUserId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          setFormError(data.error ?? 'Failed to update user')
          setSaving(false)
          return
        }
      }

      closeForm()
      await fetchUsers()
    } catch {
      setFormError('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  const isSelf = (userId: string) => session?.user?.id === userId

  if (session?.user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Access Denied</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Only Charity Admins can manage charity-level users.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Users className="h-7 w-7 text-purple-500" />
            Charity Users
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage Charity Admin and Charity Employee accounts.</p>
        </div>
        {formMode === 'closed' && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add User
          </button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Create / Edit Form */}
      {formMode !== 'closed' && (
        <div className="card p-6 space-y-4 border-2 border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {formMode === 'create' ? 'Add Charity User' : 'Edit Charity User'}
            </h2>
            <button onClick={closeForm} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <X className="h-5 w-5" />
            </button>
          </div>

          {formError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-700 dark:text-red-300">{formError}</p>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
              placeholder="Full name"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
            <input
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              disabled={formMode === 'edit'}
              className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white disabled:opacity-50"
              placeholder="user@example.com"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {formMode === 'create' ? 'Password' : 'New Password (leave empty to keep current)'}
            </label>
            <input
              type="password"
              value={formPassword}
              onChange={(e) => setFormPassword(e.target.value)}
              className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
              placeholder={formMode === 'create' ? 'Min 8 characters' : 'Leave empty to keep current'}
            />
          </div>

          {/* Role toggle */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Role</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormRole('SUPER_ADMIN')}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                  formRole === 'SUPER_ADMIN'
                    ? 'border-purple-400 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-900/30 dark:text-purple-400'
                    : 'border-calm-200 bg-calm-50 text-slate-600 hover:border-calm-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300'
                )}
              >
                <Crown className="h-4 w-4" />
                Charity Admin
              </button>
              <button
                type="button"
                onClick={() => setFormRole('CHARITY_EMPLOYEE')}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                  formRole === 'CHARITY_EMPLOYEE'
                    ? 'border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'border-calm-200 bg-calm-50 text-slate-600 hover:border-calm-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300'
                )}
              >
                <Shield className="h-4 w-4" />
                Charity Employee
              </button>
            </div>
          </div>

          {/* Permissions (only shown for Charity Employee) */}
          {formRole === 'CHARITY_EMPLOYEE' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Permissions</label>
              <div className="space-y-2">
                {ALL_CHARITY_PERMISSIONS.map((perm) => (
                  <label key={perm} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.includes(perm)}
                      onChange={() => togglePermission(perm)}
                      className="h-4 w-4 rounded border-calm-300 text-purple-600 focus:ring-purple-500 dark:border-slate-500 dark:bg-slate-700"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{PERMISSION_LABELS[perm]}</span>
                  </label>
                ))}
              </div>
              {formPermissions.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  No permissions selected — this user won&apos;t be able to access any management areas.
                </p>
              )}
            </div>
          )}

          {formRole === 'SUPER_ADMIN' && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Charity Admins have full access to all areas. No individual permissions needed.
            </p>
          )}

          {/* Active toggle (edit only) */}
          {formMode === 'edit' && (
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Active</label>
              <button
                type="button"
                onClick={() => {
                  if (editingUserId && isSelf(editingUserId)) return
                  setFormActive(!formActive)
                }}
                disabled={editingUserId ? isSelf(editingUserId) : false}
                className={clsx(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  formActive ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600',
                  editingUserId && isSelf(editingUserId) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                )}
              >
                <span
                  className={clsx(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    formActive ? 'translate-x-6' : 'translate-x-1',
                  )}
                />
              </button>
              {editingUserId && isSelf(editingUserId) && (
                <span className="text-xs text-slate-400">You cannot deactivate yourself</span>
              )}
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeForm}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {formMode === 'create' ? 'Create User' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Users List */}
      {loading ? (
        <div className="card p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto" />
          <p className="text-sm text-slate-400 mt-2">Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="card p-8 text-center">
          <Users className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No charity-level users found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className={clsx(
                'card p-4 flex items-center justify-between gap-4',
                !user.active && 'opacity-60',
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-900 dark:text-white truncate">{user.name || 'Unnamed'}</p>
                  <span
                    className={clsx(
                      'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
                      user.role === 'SUPER_ADMIN'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
                    )}
                  >
                    {user.role === 'SUPER_ADMIN' ? (
                      <><Crown className="h-3 w-3" /> Charity Admin</>
                    ) : (
                      <><Shield className="h-3 w-3" /> Charity Employee</>
                    )}
                  </span>
                  {!user.active && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                      Inactive
                    </span>
                  )}
                  {isSelf(user.id) && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      You
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                {user.role === 'CHARITY_EMPLOYEE' && user.charityPermissions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {user.charityPermissions.map((p) => (
                      <span
                        key={p}
                        className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded"
                      >
                        {PERMISSION_LABELS[p] ?? p}
                      </span>
                    ))}
                  </div>
                )}
                {user.role === 'CHARITY_EMPLOYEE' && user.charityPermissions.length === 0 && (
                  <p className="text-xs text-amber-500 mt-1">No permissions assigned</p>
                )}
              </div>
              <button
                onClick={() => openEdit(user)}
                className="flex-shrink-0 p-2 rounded-lg text-slate-400 hover:bg-calm-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(super-admin)/super-admin/users/page.tsx"
git commit -m "feat: add charity-level user management page with create/edit forms"
```

---

### Task 14: Update Super Admin Guide Page — New Terminology

**Files:**
- Modify: `app/(super-admin)/super-admin/guide/page.tsx`

- [ ] **Step 1: Update terminology throughout the guide**

Key changes to make in the guide page:

1. **Page subtitle:** Change "managing the platform as a Super Admin" → "managing the platform as a Charity Admin"
2. **Section 7 title:** Change "User & Access Management" to keep, but update the roles list:
   - "Super Admin" → "Charity Admin"
   - Add "Charity Employee" description
3. **Role list:** Add Charity Employee bullet between Charity Admin and Org Admin:
   ```
   <li><strong>Charity Employee</strong> <Shield /> — delegated platform access with specific permissions granted by a Charity Admin. Can manage organisations, training, surveys, announcements, and/or reports depending on assigned permissions.</li>
   ```
4. **Add new section** at the top (after Overview): "Managing Charity Users" explaining:
   - Navigate to Users from the sidebar
   - Creating Charity Admins vs Charity Employees
   - Assigning permissions to employees
   - Editing and deactivating users

- [ ] **Step 2: Commit**

```bash
git add "app/(super-admin)/super-admin/guide/page.tsx"
git commit -m "docs: update super admin guide with Charity Admin/Employee terminology"
```

---

### Task 15: Update Training Preview Pages — Use isCharityLevel

**Files:**
- Modify: `app/(dashboard)/dashboard/page.tsx` — update any `isSuperAdmin` calls to `isCharityLevel`
- Modify: `app/(dashboard)/training/page.tsx` — same
- Modify: `app/(dashboard)/training/[programId]/page.tsx` — same
- Modify: `app/(dashboard)/training/[programId]/[moduleId]/page.tsx` — same

- [ ] **Step 1: Update dashboard page**

In `app/(dashboard)/dashboard/page.tsx`, if `isSuperAdmin` is imported, add `isCharityLevel` import and replace any `isSuperAdmin(session)` check that controls data scope with `isCharityLevel(session)`.

- [ ] **Step 2: Update training pages**

In each training page file, replace `isSuperAdmin` with `isCharityLevel` where it is used to determine whether the user is previewing content (so that CHARITY_EMPLOYEE users with `manage_training` permission can also preview).

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/"
git commit -m "feat: allow CHARITY_EMPLOYEE to preview training content using isCharityLevel"
```

---

### Task 16: Build Verification and Deploy

- [ ] **Step 1: Run TypeScript type check**

Run: `npx tsc --noEmit`
Expected: No errors (or only pre-existing ones)

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: Build completes successfully

- [ ] **Step 3: Push schema to production database**

Run:
```bash
npx vercel env pull .env.production.local --environment production --yes
```
Then:
```bash
export $(grep -v '^#' .env.production.local | xargs) && npx prisma db push
```
Expected: `Your database is now in sync with your Prisma schema.`

Clean up: `rm .env.production.local`

- [ ] **Step 4: Deploy to Vercel**

Run: `npx vercel deploy --prod --yes`
Expected: Deployment succeeds with production URL

- [ ] **Step 5: Commit any remaining changes**

```bash
git add -A
git commit -m "chore: build verification and deploy"
```
