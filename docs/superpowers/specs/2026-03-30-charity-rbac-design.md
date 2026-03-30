# Charity-Level RBAC Redesign — Design Spec

**Date:** 2026-03-30
**Status:** Approved

## Overview

Redesign the platform's admin hierarchy to support a charity organisation model with granular, delegated permissions. The current single `SUPER_ADMIN` role is split into two charity-level roles:

- **Charity Admin** (`SUPER_ADMIN` enum, display label "Charity Admin") — full platform access, including user management and SSO configuration. Multiple Charity Admins can exist.
- **Charity Employee** (`CHARITY_EMPLOYEE` enum, display label "Charity Employee") — platform-level role with selectively delegated permissions. Does not belong to any organisation.

## Goals

1. Allow multiple Charity Admins with full platform control
2. Allow Charity Employees with granular, coarse-grained permissions
3. Keep internal enum values and routes unchanged (UI rename only, no schema migration for existing values)
4. Fix display label inconsistencies (e.g., "Caregiver" → "Practitioner" in top-right header)

## Non-Goals

- Fine-grained per-action permissions (e.g., separate "create" vs "edit" toggles)
- Separate route group or layout for Charity Employees (they share `/super-admin/*`)
- Renaming the `SUPER_ADMIN` database enum value or `/super-admin/*` routes
- Per-organisation SSO configuration by Charity Admins (future work)

---

## Data Model

### Schema Changes

**1. New role enum value:**

Add `CHARITY_EMPLOYEE` to the existing `Role` enum in `prisma/schema.prisma`:

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

**2. New field on User model:**

```prisma
model User {
  // ... existing fields ...
  charityPermissions  String[]  @default([])
}
```

An array of permission strings. Only meaningful for `CHARITY_EMPLOYEE` users. `SUPER_ADMIN` users implicitly have ALL permissions — the field is ignored for them.

**Permission values:**

| Permission Key | Grants Access To |
|---|---|
| `manage_organisations` | Create, edit, deactivate organisations; view org users |
| `manage_training` | Create/edit programs, modules, lessons, quizzes; AI generation; import from files |
| `manage_surveys` | Create/edit/publish/close surveys; view results; generate AI insights |
| `manage_announcements` | Create/edit global and org-scoped announcements |
| `view_reports` | Access platform-wide reports (read-only) |

---

## Authorization Layer

### New helpers in `lib/rbac.ts`

```typescript
// Role checks
function isCharityAdmin(session): boolean
  // Returns true if role === 'SUPER_ADMIN'
  // Alias: isSuperAdmin remains for backwards compat

function isCharityEmployee(session): boolean
  // Returns true if role === 'CHARITY_EMPLOYEE'

function isCharityLevel(session): boolean
  // Returns true if SUPER_ADMIN or CHARITY_EMPLOYEE

// Permission check
function hasPermission(session, permission: string): boolean
  // SUPER_ADMIN → always true
  // CHARITY_EMPLOYEE → checks charityPermissions array
  // All other roles → false
```

### Permission constants

```typescript
const CHARITY_PERMISSIONS = {
  MANAGE_ORGANISATIONS: 'manage_organisations',
  MANAGE_TRAINING: 'manage_training',
  MANAGE_SURVEYS: 'manage_surveys',
  MANAGE_ANNOUNCEMENTS: 'manage_announcements',
  VIEW_REPORTS: 'view_reports',
} as const

const PERMISSION_LABELS: Record<string, string> = {
  manage_organisations: 'Manage Organisations',
  manage_training: 'Manage Training',
  manage_surveys: 'Manage Surveys',
  manage_announcements: 'Manage Announcements',
  view_reports: 'View Reports',
}
```

### Where permission checks happen

| Layer | Check | Purpose |
|---|---|---|
| **Middleware** | `isCharityLevel(session)` | Allow both `SUPER_ADMIN` and `CHARITY_EMPLOYEE` to access `/super-admin/*` routes |
| **API routes** | `hasPermission(session, 'manage_training')` | Replace `isSuperAdmin(session)` with permission-specific checks |
| **Sidebar** | `hasPermission` per nav item | Filter visible nav items |
| **Pages** | `hasPermission` or redirect | Redirect to `/super-admin` if insufficient permissions |

### Charity Admin-only features (NOT delegatable)

- Charity-level user management (`/super-admin/users`, `/api/super-admin/users/*`)
- SSO configuration (future)

---

## Middleware Changes

In `middleware.ts`, change the `/super-admin/*` route guard from:

```typescript
if (pathname.startsWith('/super-admin') && role !== 'SUPER_ADMIN') {
```

to:

```typescript
if (pathname.startsWith('/super-admin') && role !== 'SUPER_ADMIN' && role !== 'CHARITY_EMPLOYEE') {
```

Individual page/API-level permission checks handle the finer gating.

---

## Session / JWT Changes

The JWT token and session object must include `charityPermissions` for Charity Employees.

In `lib/auth.ts`:
- **JWT callback:** Add `charityPermissions` to the token (fetched from the User record)
- **Session callback:** Surface `charityPermissions` onto `session.user`

In `types/index.ts`:
- Extend the session type: `charityPermissions?: string[]`

---

## Sidebar Changes

### Super Admin Sidebar (`components/layout/super-admin-sidebar.tsx`)

**Nav items with permission gating:**

| Nav Item | Permission Required | Charity Admin | Charity Employee |
|---|---|---|---|
| Overview | (always visible) | ✅ | ✅ |
| Users (NEW) | `charityAdminOnly` | ✅ | ❌ |
| Organisations | `manage_organisations` | ✅ | If granted |
| Training Content | `manage_training` | ✅ | If granted |
| Surveys | `manage_surveys` | ✅ | If granted |
| Announcements | `manage_announcements` | ✅ | If granted |
| Reports | `view_reports` | ✅ | If granted |
| How to Guide | (always visible) | ✅ | ✅ |

Implementation: Each NAV_ITEM gets an optional `permission?: string` field. The sidebar reads `session.user.charityPermissions` and filters items where the user lacks the required permission. Items with no permission are always shown. Items with `charityAdminOnly: true` require `SUPER_ADMIN` role.

**Badge changes:**
- `SUPER_ADMIN` → Shows "Charity Admin" badge (purple)
- `CHARITY_EMPLOYEE` → Shows "Charity Employee" badge (blue)

---

## Display Label Fixes

### Master role label map

```typescript
const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Charity Admin',
  CHARITY_EMPLOYEE: 'Charity Employee',
  ORG_ADMIN: 'Org Admin',
  CAREGIVER: 'Practitioner',
  CAREER_DEV_OFFICER: 'Careers Professional',
  STUDENT: 'Student',
  INTERN: 'Intern',
  EMPLOYEE: 'Employee',
}
```

### Files to update

| File | What Changes |
|---|---|
| `components/layout/super-admin-sidebar.tsx` | Badge text: "Charity Admin" / "Charity Employee" |
| `components/layout/topbar.tsx` or equivalent | Fix "Caregiver" → "Practitioner" in top-right display |
| `components/layout/sidebar.tsx` | Already correct for most, verify ROLE_LABELS map |
| `components/layout/org-admin-sidebar.tsx` | Verify role labels in any badges |
| `app/(super-admin)/super-admin/guide/page.tsx` | Replace "Super Admin" text with "Charity Admin" |
| `app/(org-admin)/admin/guide/page.tsx` | Update any references to "Super Admin" |
| `app/(dashboard)/guide/page.tsx` | Update any references |
| Any org admin pages showing role badges | Use consistent ROLE_LABELS map |

---

## Charity-Level User Management

### New page: `/super-admin/users`

**Access:** Charity Admin only (role === `SUPER_ADMIN`)

**Features:**
- List all charity-level users (role = `SUPER_ADMIN` or `CHARITY_EMPLOYEE`)
- Each card shows: name, email, role badge, permissions list (for employees), active status, created date
- "Add User" button opens inline form:
  - Name (required), email (required), password (required)
  - Role toggle: Charity Admin / Charity Employee
  - When Charity Employee selected → permissions checkboxes appear:
    - ☐ Manage Organisations
    - ☐ Manage Training
    - ☐ Manage Surveys
    - ☐ Manage Announcements
    - ☐ View Reports
  - When Charity Admin selected → permissions hidden (implicit full access)
- Edit user: change name, role, permissions, reset password, toggle active
- Delete user (with confirmation)
- Cannot deactivate yourself

### API routes

**`GET /api/super-admin/users`**
- Auth: `isCharityAdmin(session)` only
- Returns: all users where `role IN ('SUPER_ADMIN', 'CHARITY_EMPLOYEE')`
- Includes: id, name, email, role, active, charityPermissions, createdAt

**`POST /api/super-admin/users`**
- Auth: `isCharityAdmin(session)` only
- Body: `{ name, email, password, role: 'SUPER_ADMIN' | 'CHARITY_EMPLOYEE', charityPermissions?: string[] }`
- Validates: email unique, role is valid charity-level role, permissions are valid keys
- Password is hashed with bcrypt
- Sets `mustChangePassword: true`

**`PATCH /api/super-admin/users/[userId]`**
- Auth: `isCharityAdmin(session)` only
- Body: `{ name?, role?, charityPermissions?, active?, password? }`
- Cannot deactivate yourself
- If changing role to SUPER_ADMIN, clears charityPermissions
- If setting password, hashes with bcrypt and sets `mustChangePassword: true`

---

## Existing API Route Changes

Every super admin API route currently checking `isSuperAdmin(session)` needs to be updated to use `hasPermission(session, '<permission>')`:

| Route Pattern | Current Check | New Check |
|---|---|---|
| `/api/super-admin/organisations/*` | `isSuperAdmin` | `hasPermission(session, 'manage_organisations')` |
| `/api/super-admin/training/*` | `isSuperAdmin` | `hasPermission(session, 'manage_training')` |
| `/api/super-admin/surveys/*` | `isSuperAdmin` | `hasPermission(session, 'manage_surveys')` |
| `/api/super-admin/announcements/*` | `isSuperAdmin` | `hasPermission(session, 'manage_announcements')` |
| `/api/super-admin/reports/*` | `isSuperAdmin` | `hasPermission(session, 'view_reports')` |
| `/api/super-admin/users/*` (NEW) | N/A | `isCharityAdmin(session)` (Charity Admin only) |

---

## Overview Page Changes

The super admin overview page (`app/(super-admin)/super-admin/page.tsx`) should adapt to show only summary cards for areas the user has permission to access. Charity Admins see everything; Charity Employees see only their permitted areas.

---

## How to Guide Updates

- Super admin guide: rename references from "Super Admin" to "Charity Admin", add section about Charity Employee management
- Add note in guide about permission delegation

---

## Summary of Files Changed

### New Files
| File | Purpose |
|---|---|
| `app/(super-admin)/super-admin/users/page.tsx` | Charity-level user management page |
| `app/api/super-admin/users/route.ts` | GET (list) + POST (create) charity users |
| `app/api/super-admin/users/[userId]/route.ts` | PATCH (update) charity users |

### Modified Files
| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `CHARITY_EMPLOYEE` to Role enum, add `charityPermissions` field |
| `lib/rbac.ts` | Add `isCharityEmployee`, `isCharityLevel`, `hasPermission`, permission constants |
| `lib/auth.ts` | Add `charityPermissions` to JWT and session |
| `types/index.ts` | Extend session type with `charityPermissions` |
| `middleware.ts` | Allow `CHARITY_EMPLOYEE` on `/super-admin/*` routes |
| `components/layout/super-admin-sidebar.tsx` | Filter nav items by permissions, update badges/labels |
| `components/layout/topbar.tsx` (or equivalent) | Fix "Caregiver" → "Practitioner" display |
| All files with `ROLE_LABELS` maps | Update to new display names |
| All super admin API routes | Replace `isSuperAdmin` with `hasPermission` checks |
| `app/(super-admin)/super-admin/page.tsx` | Filter overview cards by permissions |
| Guide pages | Update terminology |
