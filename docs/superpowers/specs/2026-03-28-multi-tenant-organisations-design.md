# Multi-Tenant Organisations — Design Spec

**Date:** 2026-03-28
**Project:** asd-training-app
**Status:** Approved

---

## Overview

Add multi-tenant organisation support to the ASD training app. The charity operates as the top-level authority (SUPER_ADMIN). It onboards partner organisations, each managed by an Org Admin. Users belong to organisations and see only their own org's data, announcements, and assigned training modules.

---

## 1. Data Model

### New model: `Organisation`

```prisma
model Organisation {
  id               String   @id @default(cuid())
  name             String
  slug             String   @unique
  active           Boolean  @default(true)
  allowedModuleIds String[] // Prisma JSON array — org-level module defaults
  allowedRoles     String[] // Roles org admin may assign (subset of leaf roles)
  logoUrl          String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  users         User[]
  announcements Announcement[]
}
```

### New model: `Announcement`

```prisma
model Announcement {
  id             String    @id @default(cuid())
  title          String
  body           String    // Markdown
  active         Boolean   @default(true)
  organisationId String?   // null = global (SUPER_ADMIN only)
  createdById    String
  expiresAt      DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  organisation Organisation? @relation(fields: [organisationId], references: [id])
  createdBy    User          @relation(fields: [createdById], references: [id])
}
```

### Changes to `User`

```prisma
// New fields added to existing User model
organisationId   String?   // null for SUPER_ADMIN only
allowedModuleIds String[]  // empty = inherit org defaults
mustChangePassword Boolean @default(false)

organisation Organisation? @relation(fields: [organisationId], references: [id])
```

### Role enum

Remove `ADMIN`. Add `SUPER_ADMIN`, `ORG_ADMIN`, `STUDENT`, `INTERN`, `EMPLOYEE`.

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

### Migration path

- Existing `ADMIN` users → `SUPER_ADMIN`, `organisationId` set to null
- Existing `CAREGIVER` / `CAREER_DEV_OFFICER` users → assigned to a new "Legacy" organisation (auto-created on migration), `allowedModuleIds` inherits org defaults (all ASD modules)
- Run `prisma db push` after schema changes

---

## 2. Role Hierarchy & RBAC

```
SUPER_ADMIN
    └── ORG_ADMIN (scoped to one org)
            └── CAREGIVER | CAREER_DEV_OFFICER | STUDENT | INTERN | EMPLOYEE
```

### Capability matrix

| Capability | SUPER_ADMIN | ORG_ADMIN | Leaf roles |
|---|---|---|---|
| Create / manage organisations | ✓ | — | — |
| Set org allowed roles & modules | ✓ | — | — |
| Create org admins + set first-time password | ✓ | — | — |
| Create users within own org | — | ✓ | — |
| Assign roles (from org's allowed list) | — | ✓ | — |
| Assign modules per user | — | ✓ | — |
| Post global announcements | ✓ | — | — |
| Post org-scoped announcements | — | ✓ | — |
| View cross-org training stats | ✓ | — | — |
| View own org training stats | — | ✓ | — |
| ASD / Careers training | — | — | ✓ (per assignment) |
| Children / observations / reports | — | — | CAREGIVER only |

### RBAC helpers (`lib/rbac.ts`)

New helpers alongside existing ones:

- `isSuperAdmin(session)` — role === SUPER_ADMIN
- `isOrgAdmin(session)` — role === ORG_ADMIN
- `isLeafRole(session)` — any of the five leaf roles
- `getEffectiveModules(user, org)` — returns `user.allowedModuleIds` if set and non-empty, otherwise `org.allowedModuleIds`; falls back to ASD training modules if both empty

### Route protection

| Route | Allowed |
|---|---|
| `/super-admin/*` | SUPER_ADMIN only |
| `/admin/*` | ORG_ADMIN only |
| `/dashboard/*`, `/training/*`, `/careers/*` | Leaf roles only |
| `/children/*`, `/reports/*` | CAREGIVER only |
| `/change-password` | Any authenticated user with `mustChangePassword: true` |

All API routes scoped to an org enforce `user.organisationId` on every query — no cross-org data leakage.

---

## 3. Super Admin Portal (`/super-admin`)

### Overview page

- Total orgs, total users, total lessons completed across all orgs
- Summary table: org name | user count | overall completion %

### Organisations tab (`/super-admin/organisations`)

- List all orgs with name, slug, active toggle, user count, created date
- **Create org form:** name, slug (auto-generated, editable), allowed roles (multi-select from all leaf roles), allowed modules (multi-select from all 9 modules), active toggle
- **Edit org:** same fields
- **Deactivate org:** sets `active: false` — all users in that org cannot log in
- Click into an org → scoped user list for that org

### Create Org Admin

From within an org detail page:

1. SUPER_ADMIN clicks "Add Org Admin"
2. Form: name, email, temporary password (plaintext input)
3. On save: password is bcrypt-hashed, `mustChangePassword: true`, role set to `ORG_ADMIN`, `organisationId` linked
4. On first login: user is redirected to `/change-password` before accessing any page

### Global Announcements tab (`/super-admin/announcements`)

- List of announcements with active status, expiry, created date
- **Create form:** title, body (markdown), optional expiry date, active toggle
- Edit, toggle active, delete

### Reports tab (`/super-admin/reports`)

- Cross-org completion table: org × module — completions / total users / %
- Filter by org, date range
- Data sourced from `TrainingProgress` joined through users' `organisationId`

---

## 4. Org Admin Portal (`/admin`)

Replaces the existing admin page. All data scoped to `session.user.organisationId`.

### Users tab (`/admin/users`)

- Table: name, email, role, active, modules assigned, lessons completed
- **Create user:** name, email, role (dropdown limited to `org.allowedRoles`), temporary password (`mustChangePassword: true`), module checkboxes (org's `allowedModuleIds` pre-ticked)
- **Edit user:** role, active, module overrides, "Reset to org defaults" button
- Cannot modify or delete self

### Announcements tab (`/admin/announcements`)

- Create/edit/delete org-scoped announcements
- Fields: title, body (markdown), optional expiry, active toggle

### Reports tab (`/admin/reports`)

- Per-module completion: module name | completions | total users | %
- Click a module → per-user completion detail (name, completed date, score if applicable)
- Scoped to own org only

---

## 5. First-Time Password Change (`/change-password`)

- Standalone page — no sidebar, no dashboard chrome
- Shown automatically on any route if `session.user.mustChangePassword === true` (middleware redirect)
- Fields: new password, confirm password (min 8 chars)
- On success: sets `mustChangePassword: false`, redirects to `/dashboard`
- Cannot be skipped

---

## 6. Dashboard Announcements

Rendered at the top of `/dashboard`, above the stats row.

### Display rules

- Global announcements (SUPER_ADMIN, `organisationId: null`) shown to all active users
- Org announcements shown only to users matching `organisationId`
- Both types shown if present — global first, then org-scoped
- Expired (`expiresAt < now`) and inactive announcements hidden
- Maximum 3 shown, most recent first
- If no active announcements: section does not render

### UX

- Global announcements: blue banner cards
- Org announcements: amber banner cards
- Each card: title, rendered markdown body, posted date
- Dismissible per-session via `localStorage` keyed by announcement ID (reappears on next login)
- ORG_ADMIN and SUPER_ADMIN see a "Manage announcements" link in the section

---

## 7. API Routes

| Method | Route | Handler |
|---|---|---|
| GET/POST | `/api/super-admin/organisations` | List / create orgs |
| PATCH/DELETE | `/api/super-admin/organisations/[orgId]` | Update / delete org |
| GET/POST | `/api/super-admin/announcements` | List / create global announcements |
| PATCH/DELETE | `/api/super-admin/announcements/[id]` | Update / delete |
| GET | `/api/super-admin/reports` | Cross-org training stats |
| GET/POST | `/api/admin/users` | List / create users (org-scoped) |
| PATCH/DELETE | `/api/admin/users/[userId]` | Update / delete user |
| GET/POST | `/api/admin/announcements` | List / create org announcements |
| PATCH/DELETE | `/api/admin/announcements/[id]` | Update / delete |
| GET | `/api/admin/reports` | Org training stats |
| POST | `/api/auth/change-password` | Handle first-time password change |
| GET | `/api/announcements/active` | Fetch active announcements for current user's dashboard |

---

## 8. Implementation Phases

### Phase 1 — Foundation
- Schema changes + migration
- Role enum update
- `lib/rbac.ts` new helpers
- Middleware: force `/change-password` if `mustChangePassword`
- Middleware: route protection for `/super-admin` and `/admin`

### Phase 2 — Super Admin Portal
- `/super-admin` layout + overview
- Organisation CRUD
- Create Org Admin with first-time password
- Global announcements CRUD

### Phase 3 — Org Admin Portal
- `/admin` rewrite (user management, module assignment)
- Org announcements CRUD
- Reports tab

### Phase 4 — User Experience
- Dashboard announcements component
- `getEffectiveModules` wired into training/careers pages
- `/change-password` page
- Cross-org reports for SUPER_ADMIN

---

## 9. Out of Scope

- Email notifications when an org admin is created (password sent manually by SUPER_ADMIN)
- SSO/OAuth login for org users (existing Google/Azure SSO remains available)
- Billing or subscription management per org
- File uploads for org logos (logoUrl field reserved for future use)
