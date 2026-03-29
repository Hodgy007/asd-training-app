# Multi-Tenant Organisations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-tenant organisation support so the charity (SUPER_ADMIN) can onboard partner organisations, each managed by an ORG_ADMIN, with org-scoped data, announcements, and module assignments.

**Architecture:** New route groups `(super-admin)` and `(org-admin)` with dedicated layouts and sidebars. Existing `(dashboard)` group restricted to leaf roles only. Next.js middleware handles mustChangePassword redirect, role-based post-login redirect, and route protection. All org-scoped data isolated by `organisationId` on every query. Module access determined by `getEffectiveModules(user, org)` rather than role alone.

**Tech Stack:** Next.js 14, Prisma + Neon PostgreSQL, NextAuth v4 (JWT), TypeScript, Tailwind CSS, Zod, Lucide React

---

## File Map

### Create
| File | Purpose |
|------|---------|
| `prisma/migrate-to-multi-tenant.ts` | Pre-migration script: ADMIN→SUPER_ADMIN, Legacy org, user assignment |
| `lib/modules.ts` | Module ID constants + `getEffectiveModules` helper |
| `middleware.ts` | Auth, mustChangePassword, role redirects, route protection |
| `app/(super-admin)/layout.tsx` | Super admin shell (sidebar + topbar) |
| `components/layout/super-admin-sidebar.tsx` | Super admin navigation |
| `app/(super-admin)/super-admin/page.tsx` | SA overview (stats) |
| `app/(super-admin)/super-admin/organisations/page.tsx` | Org list + create |
| `app/(super-admin)/super-admin/organisations/[orgId]/page.tsx` | Org detail + users + create admin |
| `app/(super-admin)/super-admin/announcements/page.tsx` | Global announcements CRUD |
| `app/(super-admin)/super-admin/reports/page.tsx` | Cross-org reports |
| `app/api/super-admin/organisations/route.ts` | GET list / POST create orgs |
| `app/api/super-admin/organisations/[orgId]/route.ts` | GET / PATCH / DELETE single org |
| `app/api/super-admin/organisations/[orgId]/admins/route.ts` | POST create org admin |
| `app/api/super-admin/announcements/route.ts` | GET list / POST create global announcements |
| `app/api/super-admin/announcements/[id]/route.ts` | GET / PATCH / DELETE single announcement |
| `app/api/super-admin/reports/route.ts` | GET cross-org training stats |
| `app/(org-admin)/layout.tsx` | Org admin shell (sidebar + topbar) |
| `components/layout/org-admin-sidebar.tsx` | Org admin navigation |
| `app/(org-admin)/admin/page.tsx` | OA user list + create (replaces old admin page) |
| `app/(org-admin)/admin/announcements/page.tsx` | Org announcements CRUD |
| `app/(org-admin)/admin/reports/page.tsx` | Org-scoped reports |
| `app/api/admin/announcements/route.ts` | GET list / POST create org announcements |
| `app/api/admin/announcements/[id]/route.ts` | GET / PATCH / DELETE single org announcement |
| `app/api/admin/reports/route.ts` | GET org training stats |
| `app/api/auth/change-password/route.ts` | POST update password + clear mustChangePassword |
| `app/api/announcements/active/route.ts` | GET active announcements for dashboard |
| `app/(change-password)/layout.tsx` | Minimal layout (no sidebar) |
| `app/(change-password)/change-password/page.tsx` | First-time password change page |
| `components/dashboard/announcements.tsx` | Announcement banner cards for dashboard |

### Modify
| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add Organisation, Announcement models; extend User; update Role enum |
| `types/index.ts` | Update Role type; add Organisation, Announcement types; extend NextAuth |
| `lib/rbac.ts` | New helpers (isSuperAdmin, isOrgAdmin, isLeafRole); update existing |
| `lib/auth.ts` | signIn callback (block new SSO), JWT (mustChangePassword), session callback |
| `components/layout/sidebar.tsx` | Leaf-role-only nav; remove ADMIN nav; add module-based gating |
| `app/(dashboard)/layout.tsx` | Redirect SUPER_ADMIN/ORG_ADMIN to their portals |
| `app/(dashboard)/dashboard/page.tsx` | Add announcements; module-based training display |
| `app/(dashboard)/training/page.tsx` | Module access gating via getEffectiveModules |
| `app/(dashboard)/careers/page.tsx` | Module access gating via getEffectiveModules |
| `app/api/admin/users/route.ts` | Org-scoped queries; add POST for user creation |
| `app/api/admin/users/[userId]/route.ts` | Org-scoped validation; update allowed roles |
| `app/api/auth/register/route.ts` | Assign new users to Legacy org |

### Delete
| File | Reason |
|------|--------|
| `app/(dashboard)/admin/page.tsx` | Replaced by `app/(org-admin)/admin/page.tsx` |

---

## Phase 1 — Foundation

### Task 1: Pre-migration SQL + Legacy org seed

**Files:**
- Create: `prisma/migrate-to-multi-tenant.ts`

This script runs the migration in the correct order specified by the spec. It uses raw SQL for the ADMIN→SUPER_ADMIN rename (must happen before schema push), creates the Legacy org via Prisma, then assigns existing non-admin users.

- [ ] **Step 1: Create the migration script**

```ts
// prisma/migrate-to-multi-tenant.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Step 1: Migrate ADMIN → SUPER_ADMIN...')
  const adminUpdate = await prisma.$executeRawUnsafe(
    `UPDATE "User" SET role = 'SUPER_ADMIN' WHERE role = 'ADMIN'`
  )
  console.log(`  Updated ${adminUpdate} user(s) from ADMIN to SUPER_ADMIN`)

  console.log('Step 2: Create Legacy organisation...')
  const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "Organisation" WHERE slug = 'legacy' LIMIT 1`
  )
  // Note: Organisation table may not exist yet if schema hasn't been pushed.
  // This script should be run AFTER `prisma db push` for steps 2-3.
  // Step 1 (raw SQL) is safe to run before or after schema push since it only
  // touches the User table's role column which exists in both old and new schemas.

  let legacyOrgId: string
  if (existing.length > 0) {
    legacyOrgId = existing[0].id
    console.log(`  Legacy org already exists: ${legacyOrgId}`)
  } else {
    const org = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO "Organisation" (id, name, slug, active, "allowedModuleIds", "allowedRoles", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, 'Legacy', 'legacy', true,
               ARRAY['module-1','module-2','module-3','module-4','module-5','careers-module-1','careers-module-2','careers-module-3','careers-module-4'],
               ARRAY['CAREGIVER','CAREER_DEV_OFFICER'],
               NOW(), NOW())
       RETURNING id`
    )
    legacyOrgId = org[0].id
    console.log(`  Created Legacy org: ${legacyOrgId}`)
  }

  console.log('Step 3: Assign existing leaf-role users to Legacy org...')
  const userUpdate = await prisma.$executeRawUnsafe(
    `UPDATE "User" SET "organisationId" = $1
     WHERE role IN ('CAREGIVER', 'CAREER_DEV_OFFICER')
     AND "organisationId" IS NULL`,
    legacyOrgId
  )
  console.log(`  Assigned ${userUpdate} user(s) to Legacy org`)

  console.log('Migration complete.')
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Commit**

```bash
git add prisma/migrate-to-multi-tenant.ts
git commit -m "feat: add multi-tenant migration script (ADMIN→SUPER_ADMIN, Legacy org)"
```

> **Important:** Do NOT run this script yet. It must be run in a specific order — see Task 2 for the sequence.

---

### Task 2: Update Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Update the Role enum**

Replace the existing `enum Role` block:

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

- [ ] **Step 2: Add the Organisation model**

Add after the `VerificationToken` model:

```prisma
model Organisation {
  id               String         @id @default(cuid())
  name             String
  slug             String         @unique
  active           Boolean        @default(true)
  allowedModuleIds String[]
  allowedRoles     String[]
  logoUrl          String?
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  users         User[]
  announcements Announcement[]
}
```

- [ ] **Step 3: Add the Announcement model**

Add after the `Organisation` model:

```prisma
model Announcement {
  id             String        @id @default(cuid())
  title          String
  body           String
  active         Boolean       @default(true)
  organisationId String?
  createdById    String
  expiresAt      DateTime?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  organisation Organisation? @relation(fields: [organisationId], references: [id], onDelete: SetNull)
  createdBy    User          @relation("AnnouncementsCreated", fields: [createdById], references: [id])
}
```

- [ ] **Step 4: Extend the User model**

Add new fields and relations to the existing `User` model. The full model should become:

```prisma
model User {
  id                 String             @id @default(cuid())
  email              String             @unique
  name               String?
  password           String
  role               Role               @default(CAREGIVER)
  active             Boolean            @default(true)
  organisationId     String?
  allowedModuleIds   String[]
  mustChangePassword Boolean            @default(false)
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  organisation     Organisation?      @relation(fields: [organisationId], references: [id])
  accounts         Account[]
  children         Child[]
  sessions         Session[]
  trainingProgress TrainingProgress[]
  announcements    Announcement[]     @relation("AnnouncementsCreated")
}
```

- [ ] **Step 5: Run the migration sequence**

**The order is critical:**

```bash
# 1. Run the ADMIN→SUPER_ADMIN raw SQL FIRST (before enum change)
#    This must be done manually in Neon SQL Editor:
#    UPDATE "User" SET role = 'SUPER_ADMIN' WHERE role = 'ADMIN';

# 2. Push the new schema (safe now that no ADMIN rows exist)
npx prisma db push

# 3. Run the rest of the migration (Legacy org + user assignment)
npx tsx prisma/migrate-to-multi-tenant.ts

# 4. Regenerate Prisma client
npx prisma generate
```

Expected: Schema push succeeds. Migration script logs user counts.

- [ ] **Step 6: Verify**

```bash
npx prisma studio
```

Check: Organisation table has Legacy row. Users with CAREGIVER/CAREER_DEV_OFFICER have `organisationId` set. Former ADMIN users have role `SUPER_ADMIN`.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add Organisation, Announcement models; extend User; update Role enum"
```

---

### Task 3: Update TypeScript types + NextAuth augmentation

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Update the types file**

Replace the full contents of `types/index.ts`:

```ts
export type Role =
  | 'SUPER_ADMIN'
  | 'ORG_ADMIN'
  | 'CAREGIVER'
  | 'CAREER_DEV_OFFICER'
  | 'STUDENT'
  | 'INTERN'
  | 'EMPLOYEE'

export const LEAF_ROLES: Role[] = [
  'CAREGIVER',
  'CAREER_DEV_OFFICER',
  'STUDENT',
  'INTERN',
  'EMPLOYEE',
]

export type Domain = 'SOCIAL_COMMUNICATION' | 'BEHAVIOUR_AND_PLAY' | 'SENSORY_RESPONSES'
export type Frequency = 'RARE' | 'SOMETIMES' | 'OFTEN'
export type Context = 'HOME' | 'NURSERY' | 'OUTDOORS' | 'OTHER'

export interface Organisation {
  id: string
  name: string
  slug: string
  active: boolean
  allowedModuleIds: string[]
  allowedRoles: string[]
  logoUrl?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Announcement {
  id: string
  title: string
  body: string
  active: boolean
  organisationId?: string | null
  createdById: string
  expiresAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface User {
  id: string
  email: string
  name?: string | null
  role: Role
  active: boolean
  organisationId?: string | null
  allowedModuleIds: string[]
  mustChangePassword: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Child {
  id: string
  name: string
  dateOfBirth: Date
  notes?: string | null
  createdAt: Date
  updatedAt: Date
  userId: string
  observations?: Observation[]
  aiInsights?: AiInsight[]
  _count?: {
    observations: number
  }
}

export interface Observation {
  id: string
  childId: string
  date: Date
  behaviourType: string
  domain: Domain
  frequency: Frequency
  context: Context
  notes?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface TrainingProgress {
  id: string
  userId: string
  moduleId: string
  lessonId?: string | null
  completed: boolean
  score?: number | null
  completedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface AiInsight {
  id: string
  childId: string
  generatedAt: string
  summary: string
  patterns: string
  recommendations: string
  disclaimer: string
}

// Training data types
export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: string
  explanation: string
}

export interface Lesson {
  id: string
  moduleId: string
  title: string
  type: 'VIDEO' | 'TEXT'
  content: string
  order: number
  quizQuestions: QuizQuestion[]
}

export interface TrainingModule {
  id: string
  title: string
  description: string
  order: number
  lessons: Lesson[]
}

// Chart data types
export interface WeeklyChartData {
  week: string
  social: number
  behaviour: number
  sensory: number
}

export interface DomainSummary {
  domain: Domain
  label: string
  count: number
  weight: number
  hasThreshold: boolean
}

// API response types
export interface ApiResponse<T> {
  data?: T
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

// Form types
export interface CreateChildForm {
  name: string
  dateOfBirth: string
  notes?: string
}

export interface CreateObservationForm {
  date: string
  domain: Domain
  behaviourType: string
  frequency: Frequency
  context: Context
  notes?: string
}

export interface RegisterForm {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export interface LoginForm {
  email: string
  password: string
}

// Session extension
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      role: string
      organisationId?: string | null
      mustChangePassword: boolean
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    organisationId?: string | null
    mustChangePassword: boolean
  }
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd C:/Users/Simon/OneDrive/Documents/asd-training-app && npx tsc --noEmit
```

Expected: Type errors in `lib/rbac.ts`, `lib/auth.ts`, `components/layout/sidebar.tsx` and other files that reference the old `ADMIN` role. This is expected — we'll fix them in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat: update TypeScript types for multi-tenant (Role, Organisation, Announcement, Session)"
```

---

### Task 4: Module constants + getEffectiveModules

**Files:**
- Create: `lib/modules.ts`

- [ ] **Step 1: Create the module constants file**

```ts
// lib/modules.ts

/** ASD awareness training module IDs (from lib/training-data.ts) */
export const ASD_MODULE_IDS = [
  'module-1',
  'module-2',
  'module-3',
  'module-4',
  'module-5',
] as const

/** Careers CPD module IDs (from lib/careers-training-data.ts) */
export const CAREERS_MODULE_IDS = [
  'careers-module-1',
  'careers-module-2',
  'careers-module-3',
  'careers-module-4',
] as const

/** All training module IDs */
export const ALL_MODULE_IDS = [...ASD_MODULE_IDS, ...CAREERS_MODULE_IDS] as const

/**
 * Returns the effective module IDs for a user.
 * Priority: user overrides > org defaults > ASD-only fallback.
 */
export function getEffectiveModules(
  userModuleIds: string[],
  orgModuleIds: string[]
): string[] {
  if (userModuleIds.length > 0) return userModuleIds
  if (orgModuleIds.length > 0) return orgModuleIds
  // Conservative fallback: ASD modules only
  return [...ASD_MODULE_IDS]
}

/** Check if a module list includes any ASD modules */
export function hasAsdAccess(moduleIds: string[]): boolean {
  return moduleIds.some((id) => (ASD_MODULE_IDS as readonly string[]).includes(id))
}

/** Check if a module list includes any careers modules */
export function hasCareersAccess(moduleIds: string[]): boolean {
  return moduleIds.some((id) => (CAREERS_MODULE_IDS as readonly string[]).includes(id))
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: Same errors as before (no new ones from this file).

- [ ] **Step 3: Commit**

```bash
git add lib/modules.ts
git commit -m "feat: add module ID constants and getEffectiveModules helper"
```

---

### Task 5: Rewrite RBAC helpers

**Files:**
- Modify: `lib/rbac.ts`

- [ ] **Step 1: Replace the full contents of lib/rbac.ts**

```ts
import { Session } from 'next-auth'
import type { Role } from '@/types'

/**
 * Returns true if the session has one of the required roles.
 */
export function hasRole(session: Session | null, ...roles: Role[]): boolean {
  if (!session?.user?.role) return false
  return roles.includes(session.user.role as Role)
}

/** SUPER_ADMIN — top-level charity authority */
export function isSuperAdmin(session: Session | null): boolean {
  return hasRole(session, 'SUPER_ADMIN')
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
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: Fewer type errors now. Remaining errors should be in `sidebar.tsx`, `auth.ts`, and pages referencing old role values.

- [ ] **Step 3: Commit**

```bash
git add lib/rbac.ts
git commit -m "feat: rewrite RBAC helpers for multi-tenant roles"
```

---

### Task 6: Update auth callbacks

**Files:**
- Modify: `lib/auth.ts`

- [ ] **Step 1: Replace the full contents of lib/auth.ts**

```ts
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import AzureADProvider from 'next-auth/providers/azure-ad'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      allowDangerousEmailAccountLinking: true,
    }),
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID ?? '',
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET ?? '',
      tenantId: process.env.AZURE_AD_TENANT_ID ?? 'common',
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { organisation: { select: { active: true } } },
        })

        if (!user) {
          throw new Error('No account found with that email address')
        }

        if (!user.active) {
          throw new Error('Your account has been deactivated. Please contact an administrator.')
        }

        // Check org is active (null org = SUPER_ADMIN, always allowed)
        if (user.organisation && !user.organisation.active) {
          throw new Error('Your organisation has been deactivated. Please contact an administrator.')
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

        if (!isPasswordValid) {
          throw new Error('Incorrect password')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organisationId: user.organisationId,
          mustChangePassword: user.mustChangePassword,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user, account }) {
      // For SSO sign-ins: require pre-registration (no auto-create)
      if (account?.provider !== 'credentials') {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email ?? '' },
          include: { organisation: { select: { active: true } } },
        })

        // User does not exist — block SSO self-registration
        if (!dbUser) {
          return '/login?error=Account not found. Contact your organisation administrator.'
        }

        // User exists but deactivated
        if (!dbUser.active) {
          return false
        }

        // Org deactivated
        if (dbUser.organisation && !dbUser.organisation.active) {
          return false
        }

        return true
      }
      return true
    },
    async jwt({ token, user, trigger }) {
      // Initial sign-in: populate token from user object
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role ?? 'CAREGIVER'
        token.organisationId = (user as { organisationId?: string | null }).organisationId ?? null
        token.mustChangePassword = (user as { mustChangePassword?: boolean }).mustChangePassword ?? false
      }

      // Token refresh via unstable_update (after password change)
      if (trigger === 'update') {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, organisationId: true, mustChangePassword: true },
        })
        if (dbUser) {
          token.role = dbUser.role
          token.organisationId = dbUser.organisationId
          token.mustChangePassword = dbUser.mustChangePassword
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.organisationId = (token.organisationId as string | null) ?? null
        session.user.mustChangePassword = token.mustChangePassword as boolean
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/auth.ts
git commit -m "feat: update auth callbacks for multi-tenant (SSO pre-registration, org checks, mustChangePassword)"
```

---

### Task 7: Create middleware

**Files:**
- Create: `middleware.ts` (project root)

- [ ] **Step 1: Create the middleware file**

```ts
// middleware.ts
import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/privacy', '/api/auth']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Allow static files and Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next()
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  // Not authenticated — redirect to login
  if (!token) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = token.role as string
  const mustChangePassword = token.mustChangePassword as boolean

  // Force password change (except on the change-password page itself and the API)
  if (mustChangePassword && pathname !== '/change-password' && !pathname.startsWith('/api/auth/change-password')) {
    return NextResponse.redirect(new URL('/change-password', req.url))
  }

  // If on /change-password but doesn't need to change, redirect to home
  if (!mustChangePassword && pathname === '/change-password') {
    return NextResponse.redirect(new URL(homeForRole(role), req.url))
  }

  // Route protection: /super-admin/* — SUPER_ADMIN only
  if (pathname.startsWith('/super-admin') && role !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL(homeForRole(role), req.url))
  }

  // Route protection: /admin/* — ORG_ADMIN only
  if (pathname.startsWith('/admin') && role !== 'ORG_ADMIN') {
    return NextResponse.redirect(new URL(homeForRole(role), req.url))
  }

  // SUPER_ADMIN and ORG_ADMIN cannot access leaf-role routes
  if (role === 'SUPER_ADMIN' || role === 'ORG_ADMIN') {
    const leafOnlyPaths = ['/dashboard', '/training', '/careers', '/children', '/reports', '/settings']
    if (leafOnlyPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
      return NextResponse.redirect(new URL(homeForRole(role), req.url))
    }
  }

  // /children/* and /reports/* — CAREGIVER only
  if ((pathname.startsWith('/children') || pathname.startsWith('/reports')) && role !== 'CAREGIVER') {
    return NextResponse.redirect(new URL(homeForRole(role), req.url))
  }

  // Post-login redirect: if landing on root /, redirect to role home
  if (pathname === '/') {
    return NextResponse.redirect(new URL(homeForRole(role), req.url))
  }

  return NextResponse.next()
}

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

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: add middleware for auth, mustChangePassword, role redirects, route protection"
```

---

### Task 8: Update sidebar navigation

**Files:**
- Modify: `components/layout/sidebar.tsx`

- [ ] **Step 1: Replace the full contents of sidebar.tsx**

The sidebar now only shows leaf-role navigation. SUPER_ADMIN and ORG_ADMIN have their own sidebars (created in Phase 2/3).

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  FileText,
  LogOut,
  X,
  Briefcase,
  Settings,
} from 'lucide-react'
import { clsx } from 'clsx'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

function getNavItems(role?: string): NavItem[] {
  const items: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ]

  // CAREGIVER always gets ASD training + children + reports
  if (role === 'CAREGIVER') {
    items.push(
      { href: '/training', label: 'ASD Training', icon: BookOpen },
      { href: '/children', label: 'Child Observations', icon: Users },
      { href: '/reports', label: 'Reports', icon: FileText },
    )
  }

  // CAREER_DEV_OFFICER always gets careers training
  if (role === 'CAREER_DEV_OFFICER') {
    items.push({ href: '/careers', label: 'Careers Training', icon: Briefcase })
  }

  // New leaf roles (STUDENT, INTERN, EMPLOYEE) see training/careers
  // based on module assignment — handled at the page level, but we
  // show both nav items and let the page redirect if no access
  if (role === 'STUDENT' || role === 'INTERN' || role === 'EMPLOYEE') {
    items.push(
      { href: '/training', label: 'ASD Training', icon: BookOpen },
      { href: '/careers', label: 'Careers Training', icon: Briefcase },
    )
  }

  items.push({ href: '/settings', label: 'Settings', icon: Settings })

  return items
}

const ROLE_LABELS: Record<string, string> = {
  CAREGIVER: 'Caregiver',
  CAREER_DEV_OFFICER: 'Careers Professional',
  STUDENT: 'Student',
  INTERN: 'Intern',
  EMPLOYEE: 'Employee',
}

const ROLE_BADGE_STYLES: Record<string, string> = {
  CAREGIVER: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  CAREER_DEV_OFFICER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  STUDENT: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  INTERN: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  EMPLOYEE: 'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300',
}

interface SidebarProps {
  onClose?: () => void
  mobile?: boolean
}

export function Sidebar({ onClose, mobile }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = session?.user?.role
  const navItems = getNavItems(role)

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 border-r border-calm-200 dark:border-slate-700">
      {/* Logo */}
      <div className="flex items-center justify-between p-5 border-b border-calm-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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
      {role && ROLE_LABELS[role] && (
        <div className="px-5 py-2 border-b border-calm-100 dark:border-slate-700">
          <span className={clsx(
            'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
            ROLE_BADGE_STYLES[role] ?? 'bg-slate-100 text-slate-700',
          )}>
            {ROLE_LABELS[role]}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all',
                isActive
                  ? 'bg-primary-50 text-primary-600 shadow-sm dark:bg-primary-900/30 dark:text-primary-400'
                  : 'text-slate-600 hover:bg-calm-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100'
              )}
            >
              <Icon
                className={clsx('h-5 w-5 flex-shrink-0', isActive ? 'text-primary-500 dark:text-primary-400' : 'text-slate-400 dark:text-slate-500')}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-calm-200 dark:border-slate-700 space-y-2">
        {role === 'CAREGIVER' && (
          <div className="bg-orange-50 dark:bg-slate-700 border-l-4 border-primary-500 rounded-r-xl p-3 mb-3">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <strong className="text-primary-600 dark:text-primary-400">Reminder:</strong> This tool does not diagnose. Share observations with your GP or health visitor.
            </p>
          </div>
        )}
        <button
          onClick={() => {
            const { signOut } = require('next-auth/react')
            signOut({ callbackUrl: '/login' })
          }}
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

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/layout/sidebar.tsx
git commit -m "feat: update sidebar for leaf-role-only nav with new roles"
```

---

### Task 9: Update dashboard layout + login redirect

**Files:**
- Modify: `app/(dashboard)/layout.tsx`

- [ ] **Step 1: Update the dashboard layout**

The middleware now handles auth and role redirects, so the layout can be simplified. But we keep a client-side fallback for the session check:

```tsx
'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { data: session, status } = useSession()

  if (status === 'unauthenticated') {
    redirect('/login')
  }

  // Redirect admin roles to their portals (fallback — middleware handles this too)
  if (status === 'authenticated') {
    if (session?.user?.role === 'SUPER_ADMIN') redirect('/super-admin')
    if (session?.user?.role === 'ORG_ADMIN') redirect('/admin')
  }

  return (
    <div className="flex h-screen bg-calm-50 dark:bg-slate-900 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 flex-shrink-0 flex-col">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72">
            <Sidebar onClose={() => setSidebarOpen(false)} mobile />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update the login page signIn callback URL**

In `app/(auth)/login/page.tsx`, find any `callbackUrl: '/dashboard'` references in SSO sign-in buttons and change them to `callbackUrl: '/'`. The middleware will redirect `/` to the correct home based on role.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/layout.tsx app/(auth)/login/page.tsx
git commit -m "feat: update dashboard layout to redirect admin roles; update login callback to /"
```

---

### Task 10: Update registration to assign Legacy org

**Files:**
- Modify: `app/api/auth/register/route.ts`

- [ ] **Step 1: Update the registration API**

```ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.enum(['CAREGIVER', 'CAREER_DEV_OFFICER']).default('CAREGIVER'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input. Please check your details.' },
        { status: 400 }
      )
    }

    const { name, email, password, role } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'An account with that email already exists.' },
        { status: 409 }
      )
    }

    // Assign to Legacy org — self-registered users go here by default
    const legacyOrg = await prisma.organisation.findUnique({ where: { slug: 'legacy' } })

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        active: true,
        organisationId: legacyOrg?.id ?? null,
      },
    })

    return NextResponse.json({ id: user.id, email: user.email, name: user.name }, { status: 201 })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify + Commit**

```bash
npx tsc --noEmit
git add app/api/auth/register/route.ts
git commit -m "feat: assign self-registered users to Legacy org"
```

---

## Phase 2 — Super Admin Portal

### Task 11: Super admin layout + sidebar

**Files:**
- Create: `components/layout/super-admin-sidebar.tsx`
- Create: `app/(super-admin)/layout.tsx`

- [ ] **Step 1: Create the super admin sidebar**

```tsx
// components/layout/super-admin-sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Building2,
  Megaphone,
  BarChart3,
  LogOut,
  X,
  Crown,
} from 'lucide-react'
import { clsx } from 'clsx'

const NAV_ITEMS = [
  { href: '/super-admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/super-admin/organisations', label: 'Organisations', icon: Building2 },
  { href: '/super-admin/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/super-admin/reports', label: 'Reports', icon: BarChart3 },
]

interface Props {
  onClose?: () => void
  mobile?: boolean
}

export function SuperAdminSidebar({ onClose, mobile }: Props) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 border-r border-calm-200 dark:border-slate-700">
      <div className="flex items-center justify-between p-5 border-b border-calm-200 dark:border-slate-700">
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
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-calm-100 dark:hover:bg-slate-700">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="px-5 py-2 border-b border-calm-100 dark:border-slate-700">
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
          <Crown className="h-3 w-3" />
          Super Admin
        </span>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
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
                  : 'text-slate-600 hover:bg-calm-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700'
              )}
            >
              <Icon className={clsx('h-5 w-5 flex-shrink-0', isActive ? 'text-purple-500' : 'text-slate-400')} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-calm-200 dark:border-slate-700">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-red-50 hover:text-red-600 transition-all w-full"
        >
          <LogOut className="h-5 w-5 text-slate-400" />
          Sign out
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the super admin layout**

```tsx
// app/(super-admin)/layout.tsx
'use client'

import { useState } from 'react'
import { SuperAdminSidebar } from '@/components/layout/super-admin-sidebar'
import { Topbar } from '@/components/layout/topbar'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { data: session, status } = useSession()

  if (status === 'unauthenticated') redirect('/login')
  if (status === 'authenticated' && session?.user?.role !== 'SUPER_ADMIN') redirect('/dashboard')

  return (
    <div className="flex h-screen bg-calm-50 dark:bg-slate-900 overflow-hidden">
      <div className="hidden md:flex w-64 flex-shrink-0 flex-col">
        <SuperAdminSidebar />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72">
            <SuperAdminSidebar onClose={() => setSidebarOpen(false)} mobile />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify + Commit**

```bash
npx tsc --noEmit
git add components/layout/super-admin-sidebar.tsx app/(super-admin)/layout.tsx
git commit -m "feat: add super admin layout and sidebar"
```

---

### Task 12: Organisation CRUD APIs

**Files:**
- Create: `app/api/super-admin/organisations/route.ts`
- Create: `app/api/super-admin/organisations/[orgId]/route.ts`

- [ ] **Step 1: Create the list/create route**

```ts
// app/api/super-admin/organisations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { LEAF_ROLES } from '@/types'

const createSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  allowedRoles: z.array(z.string()).refine(
    (roles) => roles.every((r) => LEAF_ROLES.includes(r as any)),
    'Only leaf roles are allowed'
  ),
  allowedModuleIds: z.array(z.string()),
  active: z.boolean().default(true),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgs = await prisma.organisation.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { users: true } } },
  })

  return NextResponse.json(orgs)
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

  const existing = await prisma.organisation.findUnique({ where: { slug: parsed.data.slug } })
  if (existing) {
    return NextResponse.json({ error: 'An organisation with that slug already exists.' }, { status: 409 })
  }

  const org = await prisma.organisation.create({ data: parsed.data })

  return NextResponse.json(org, { status: 201 })
}
```

- [ ] **Step 2: Create the single-org route**

```ts
// app/api/super-admin/organisations/[orgId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { LEAF_ROLES } from '@/types'

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  allowedRoles: z.array(z.string()).refine(
    (roles) => roles.every((r) => LEAF_ROLES.includes(r as any)),
    'Only leaf roles are allowed'
  ).optional(),
  allowedModuleIds: z.array(z.string()).optional(),
  active: z.boolean().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const org = await prisma.organisation.findUnique({
    where: { id: params.orgId },
    include: {
      users: {
        select: {
          id: true, name: true, email: true, role: true, active: true,
          allowedModuleIds: true, mustChangePassword: true, createdAt: true,
          _count: { select: { trainingProgress: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { users: true } },
    },
  })

  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(org)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const org = await prisma.organisation.findUnique({ where: { id: params.orgId } })
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Check slug uniqueness if changing
  if (parsed.data.slug && parsed.data.slug !== org.slug) {
    const slugExists = await prisma.organisation.findUnique({ where: { slug: parsed.data.slug } })
    if (slugExists) {
      return NextResponse.json({ error: 'Slug already in use.' }, { status: 409 })
    }
  }

  const updated = await prisma.organisation.update({
    where: { id: params.orgId },
    data: parsed.data,
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const org = await prisma.organisation.findUnique({
    where: { id: params.orgId },
    include: { _count: { select: { users: true } } },
  })

  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (org._count.users > 0) {
    return NextResponse.json(
      { error: 'Cannot delete an organisation that has users. Reassign or delete all users first.' },
      { status: 409 }
    )
  }

  await prisma.organisation.delete({ where: { id: params.orgId } })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Verify + Commit**

```bash
npx tsc --noEmit
git add app/api/super-admin/organisations/
git commit -m "feat: add organisation CRUD API routes (super admin)"
```

---

### Task 13: Create org admin API

**Files:**
- Create: `app/api/super-admin/organisations/[orgId]/admins/route.ts`

- [ ] **Step 1: Create the route**

```ts
// app/api/super-admin/organisations/[orgId]/admins/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const createAdminSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const org = await prisma.organisation.findUnique({ where: { id: params.orgId } })
  if (!org) return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })

  const body = await req.json()
  const parsed = createAdminSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

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
      role: 'ORG_ADMIN',
      organisationId: params.orgId,
      mustChangePassword: true,
      active: true,
    },
    select: { id: true, name: true, email: true, role: true },
  })

  return NextResponse.json(user, { status: 201 })
}
```

- [ ] **Step 2: Verify + Commit**

```bash
npx tsc --noEmit
git add app/api/super-admin/organisations/[orgId]/admins/
git commit -m "feat: add create org admin API (super admin)"
```

---

### Task 14: Super admin overview page

**Files:**
- Create: `app/(super-admin)/super-admin/page.tsx`

- [ ] **Step 1: Create the overview page**

```tsx
// app/(super-admin)/super-admin/page.tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Building2, Users, BookOpen } from 'lucide-react'
import Link from 'next/link'

export default async function SuperAdminOverview() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'SUPER_ADMIN') redirect('/login')

  const [orgCount, userCount, completedLessons, orgs] = await Promise.all([
    prisma.organisation.count(),
    prisma.user.count(),
    prisma.trainingProgress.count({ where: { completed: true } }),
    prisma.organisation.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true } },
        users: {
          select: {
            _count: { select: { trainingProgress: { where: { completed: true } } } },
          },
        },
      },
    }),
  ])

  const totalUsers = await prisma.user.count({ where: { role: { notIn: ['SUPER_ADMIN'] } } })

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Super Admin</h1>
        <p className="text-slate-500 mt-1">Manage organisations, users, and training across the platform.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <Building2 className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{orgCount}</p>
            <p className="text-sm text-slate-500">Organisations</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{totalUsers}</p>
            <p className="text-sm text-slate-500">Total users</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-sage-100 rounded-xl flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-sage-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{completedLessons}</p>
            <p className="text-sm text-slate-500">Lessons completed</p>
          </div>
        </div>
      </div>

      {/* Org summary table */}
      <div className="card overflow-hidden p-0">
        <div className="px-4 py-3 border-b border-calm-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Organisations</h2>
          <Link href="/super-admin/organisations" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
            View all
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-calm-200 bg-calm-50">
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Organisation</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Users</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Lessons completed</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((org) => {
              const orgLessons = org.users.reduce((acc, u) => acc + u._count.trainingProgress, 0)
              return (
                <tr key={org.id} className="border-b border-calm-100 hover:bg-calm-50">
                  <td className="px-4 py-3">
                    <Link href={`/super-admin/organisations/${org.id}`} className="font-medium text-slate-900 hover:text-purple-600">
                      {org.name}
                    </Link>
                    <p className="text-xs text-slate-400">{org.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{org._count.users}</td>
                  <td className="px-4 py-3 text-slate-600">{orgLessons}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify + Commit**

```bash
npx tsc --noEmit
git add app/(super-admin)/super-admin/page.tsx
git commit -m "feat: add super admin overview page"
```

---

### Task 15: Organisation list + create page

**Files:**
- Create: `app/(super-admin)/super-admin/organisations/page.tsx`

- [ ] **Step 1: Create the organisations page**

This is a client component with a list view and an inline create form. It calls the APIs from Task 12.

Build a page that:
- Fetches `GET /api/super-admin/organisations` on mount
- Displays a table with columns: Name, Slug, Users, Active, Created, Actions
- Has a "Create Organisation" button that shows an inline form
- Form fields: name, slug (auto-generated from name, editable), allowed roles (multi-select checkboxes from LEAF_ROLES), allowed modules (multi-select checkboxes from ALL_MODULE_IDS), active toggle
- On submit: `POST /api/super-admin/organisations`
- Active toggle in table: `PATCH /api/super-admin/organisations/[orgId]`
- Click org name → navigate to `/super-admin/organisations/[orgId]`
- Follow the existing admin page patterns (`useState` for form state, `fetch` for API calls, toast for feedback)

Key imports:
```tsx
import { LEAF_ROLES } from '@/types'
import { ALL_MODULE_IDS, ASD_MODULE_IDS, CAREERS_MODULE_IDS } from '@/lib/modules'
```

The slug auto-generation:
```ts
const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
```

- [ ] **Step 2: Verify + Commit**

```bash
npx tsc --noEmit
git add app/(super-admin)/super-admin/organisations/page.tsx
git commit -m "feat: add organisation list and create page (super admin)"
```

---

### Task 16: Organisation detail page

**Files:**
- Create: `app/(super-admin)/super-admin/organisations/[orgId]/page.tsx`

- [ ] **Step 1: Create the org detail page**

This page shows:
1. Org details (editable form) — name, slug, allowed roles, allowed modules, active
2. Users table — name, email, role, active, lessons completed
3. "Add Org Admin" button with inline form (name, email, temporary password)

API calls:
- `GET /api/super-admin/organisations/[orgId]` — fetches org with users
- `PATCH /api/super-admin/organisations/[orgId]` — update org details
- `POST /api/super-admin/organisations/[orgId]/admins` — create org admin
- `DELETE /api/super-admin/organisations/[orgId]` — delete (only if 0 users)

Follow existing admin page patterns. Key detail: the "Add Org Admin" form only creates ORG_ADMIN users — it posts to the `/admins` endpoint which hardcodes `role: 'ORG_ADMIN'`.

- [ ] **Step 2: Verify + Commit**

```bash
npx tsc --noEmit
git add app/(super-admin)/super-admin/organisations/[orgId]/page.tsx
git commit -m "feat: add organisation detail page with user list and create org admin"
```

---

### Task 17: Global announcements API + page

**Files:**
- Create: `app/api/super-admin/announcements/route.ts`
- Create: `app/api/super-admin/announcements/[id]/route.ts`
- Create: `app/(super-admin)/super-admin/announcements/page.tsx`

- [ ] **Step 1: Create the list/create API**

```ts
// app/api/super-admin/announcements/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  active: z.boolean().default(true),
  expiresAt: z.string().datetime().nullable().optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const announcements = await prisma.announcement.findMany({
    where: { organisationId: null },
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { name: true } } },
  })

  return NextResponse.json(announcements)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const announcement = await prisma.announcement.create({
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      active: parsed.data.active,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      organisationId: null, // global
      createdById: session.user.id,
    },
  })

  return NextResponse.json(announcement, { status: 201 })
}
```

- [ ] **Step 2: Create the single announcement API**

```ts
// app/api/super-admin/announcements/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).optional(),
  active: z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const announcement = await prisma.announcement.findUnique({ where: { id: params.id } })
  if (!announcement || announcement.organisationId !== null) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(announcement)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const announcement = await prisma.announcement.findUnique({ where: { id: params.id } })
  if (!announcement || announcement.organisationId !== null) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const data: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.expiresAt !== undefined) {
    data.expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null
  }

  const updated = await prisma.announcement.update({
    where: { id: params.id },
    data,
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const announcement = await prisma.announcement.findUnique({ where: { id: params.id } })
  if (!announcement || announcement.organisationId !== null) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.announcement.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Create the announcements page**

Build a client page at `app/(super-admin)/super-admin/announcements/page.tsx` that:
- Fetches `GET /api/super-admin/announcements` on mount
- Displays a list of announcements with title, active badge, expiry, created date, creator name
- "Create Announcement" button shows inline form: title (text input), body (textarea, markdown), expiry (optional datetime input), active (toggle)
- Active toggle per announcement: `PATCH /api/super-admin/announcements/[id]`
- Delete button: `DELETE /api/super-admin/announcements/[id]`
- Follow existing admin page toast + loading patterns

- [ ] **Step 4: Verify + Commit**

```bash
npx tsc --noEmit
git add app/api/super-admin/announcements/ app/(super-admin)/super-admin/announcements/
git commit -m "feat: add global announcements CRUD (super admin)"
```

---

### Task 18: Super admin reports API + page

**Files:**
- Create: `app/api/super-admin/reports/route.ts`
- Create: `app/(super-admin)/super-admin/reports/page.tsx`

- [ ] **Step 1: Create the reports API**

```ts
// app/api/super-admin/reports/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { ALL_MODULE_IDS } from '@/lib/modules'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgs = await prisma.organisation.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      users: {
        where: { role: { notIn: ['SUPER_ADMIN', 'ORG_ADMIN'] } },
        select: {
          id: true,
          trainingProgress: {
            where: { completed: true },
            select: { moduleId: true },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  const report = orgs.map((org) => {
    const totalUsers = org.users.length
    const moduleStats = ALL_MODULE_IDS.map((moduleId) => {
      const completions = org.users.filter((u) =>
        u.trainingProgress.some((p) => p.moduleId === moduleId)
      ).length
      return {
        moduleId,
        completions,
        totalUsers,
        pct: totalUsers > 0 ? Math.round((completions / totalUsers) * 100) : 0,
      }
    })

    return {
      orgId: org.id,
      orgName: org.name,
      orgSlug: org.slug,
      totalUsers,
      modules: moduleStats,
    }
  })

  return NextResponse.json(report)
}
```

- [ ] **Step 2: Create the reports page**

Build a server component page at `app/(super-admin)/super-admin/reports/page.tsx` that:
- Fetches the report data from the API (or directly via Prisma since it's a server component)
- Displays a cross-org table: Organisation × Module — completions / total users / %
- Uses the same styling patterns as existing report pages
- Import module names from `TRAINING_MODULES` and `CAREERS_MODULES` for display labels

- [ ] **Step 3: Verify + Commit**

```bash
npx tsc --noEmit
git add app/api/super-admin/reports/ app/(super-admin)/super-admin/reports/
git commit -m "feat: add cross-org training reports (super admin)"
```

---

## Phase 3 — Org Admin Portal

### Task 19: Org admin layout + sidebar

**Files:**
- Create: `components/layout/org-admin-sidebar.tsx`
- Create: `app/(org-admin)/layout.tsx`

- [ ] **Step 1: Create the org admin sidebar**

```tsx
// components/layout/org-admin-sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  Users,
  Megaphone,
  BarChart3,
  LogOut,
  X,
  ShieldCheck,
} from 'lucide-react'
import { clsx } from 'clsx'

const NAV_ITEMS = [
  { href: '/admin', label: 'Users', icon: Users, exact: true },
  { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
]

interface Props {
  onClose?: () => void
  mobile?: boolean
}

export function OrgAdminSidebar({ onClose, mobile }: Props) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 border-r border-calm-200 dark:border-slate-700">
      <div className="flex items-center justify-between p-5 border-b border-calm-200 dark:border-slate-700">
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
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-calm-100 dark:hover:bg-slate-700">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="px-5 py-2 border-b border-calm-100 dark:border-slate-700">
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          <ShieldCheck className="h-3 w-3" />
          Org Admin
        </span>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
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
                  ? 'bg-emerald-50 text-emerald-600 shadow-sm dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'text-slate-600 hover:bg-calm-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700'
              )}
            >
              <Icon className={clsx('h-5 w-5 flex-shrink-0', isActive ? 'text-emerald-500' : 'text-slate-400')} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-calm-200 dark:border-slate-700">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all w-full"
        >
          <LogOut className="h-5 w-5 text-slate-400" />
          Sign out
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the org admin layout**

```tsx
// app/(org-admin)/layout.tsx
'use client'

import { useState } from 'react'
import { OrgAdminSidebar } from '@/components/layout/org-admin-sidebar'
import { Topbar } from '@/components/layout/topbar'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'

export default function OrgAdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { data: session, status } = useSession()

  if (status === 'unauthenticated') redirect('/login')
  if (status === 'authenticated' && session?.user?.role !== 'ORG_ADMIN') redirect('/dashboard')

  return (
    <div className="flex h-screen bg-calm-50 dark:bg-slate-900 overflow-hidden">
      <div className="hidden md:flex w-64 flex-shrink-0 flex-col">
        <OrgAdminSidebar />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72">
            <OrgAdminSidebar onClose={() => setSidebarOpen(false)} mobile />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Delete the old admin page**

Delete `app/(dashboard)/admin/page.tsx` — it's being replaced by `app/(org-admin)/admin/page.tsx`.

- [ ] **Step 4: Verify + Commit**

```bash
npx tsc --noEmit
git add components/layout/org-admin-sidebar.tsx app/(org-admin)/layout.tsx
git rm app/(dashboard)/admin/page.tsx
git commit -m "feat: add org admin layout and sidebar; remove old admin page"
```

---

### Task 20: Rewrite admin user APIs (org-scoped)

**Files:**
- Modify: `app/api/admin/users/route.ts`
- Modify: `app/api/admin/users/[userId]/route.ts`

- [ ] **Step 1: Rewrite the user list + create route**

```ts
// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isOrgAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const createSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.string(),
  password: z.string().min(8).max(128).optional(), // optional for SSO-only users
  ssoOnly: z.boolean().default(false),
  allowedModuleIds: z.array(z.string()).default([]),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = session.user.organisationId
  if (!orgId) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const role = searchParams.get('role') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize = 20

  const where: Record<string, unknown> = { organisationId: orgId }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (role) {
    where.role = role
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, name: true, email: true, role: true, active: true,
        allowedModuleIds: true, mustChangePassword: true, createdAt: true,
        _count: { select: { children: true, trainingProgress: true } },
      },
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({ users, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = session.user.organisationId
  if (!orgId) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  // Validate the role is in the org's allowed list
  const org = await prisma.organisation.findUnique({
    where: { id: orgId },
    select: { allowedRoles: true, allowedModuleIds: true },
  })
  if (!org) return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  if (!org.allowedRoles.includes(parsed.data.role)) {
    return NextResponse.json({ error: 'Role not permitted for this organisation' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (existing) {
    return NextResponse.json({ error: 'A user with that email already exists.' }, { status: 409 })
  }

  let hashedPassword = ''
  let mustChangePassword = false

  if (parsed.data.ssoOnly) {
    hashedPassword = '' // SSO-only users have empty password
    mustChangePassword = false
  } else {
    if (!parsed.data.password) {
      return NextResponse.json({ error: 'Password is required for non-SSO users' }, { status: 400 })
    }
    hashedPassword = await bcrypt.hash(parsed.data.password, 12)
    mustChangePassword = true
  }

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: hashedPassword,
      role: parsed.data.role as any,
      organisationId: orgId,
      allowedModuleIds: parsed.data.allowedModuleIds,
      mustChangePassword,
      active: true,
    },
    select: { id: true, name: true, email: true, role: true },
  })

  return NextResponse.json(user, { status: 201 })
}
```

- [ ] **Step 2: Rewrite the single user route**

```ts
// app/api/admin/users/[userId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isOrgAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  role: z.string().optional(),
  active: z.boolean().optional(),
  name: z.string().min(1).max(100).optional(),
  allowedModuleIds: z.array(z.string()).optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      id: true, name: true, email: true, role: true, active: true,
      allowedModuleIds: true, organisationId: true, createdAt: true, updatedAt: true,
      _count: { select: { children: true, trainingProgress: true } },
    },
  })

  if (!user || user.organisationId !== session.user.organisationId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(user)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (params.userId === session.user.id) {
    return NextResponse.json({ error: 'You cannot modify your own account.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: params.userId } })
  if (!user || user.organisationId !== session.user.organisationId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  // Validate role against org's allowed list
  if (parsed.data.role) {
    const org = await prisma.organisation.findUnique({
      where: { id: session.user.organisationId! },
      select: { allowedRoles: true },
    })
    if (!org || !org.allowedRoles.includes(parsed.data.role)) {
      return NextResponse.json({ error: 'Role not permitted for this organisation' }, { status: 400 })
    }
  }

  const updated = await prisma.user.update({
    where: { id: params.userId },
    data: parsed.data as any,
    select: {
      id: true, name: true, email: true, role: true, active: true,
      allowedModuleIds: true, updatedAt: true,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (params.userId === session.user.id) {
    return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: params.userId } })
  if (!user || user.organisationId !== session.user.organisationId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.user.delete({ where: { id: params.userId } })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Verify + Commit**

```bash
npx tsc --noEmit
git add app/api/admin/users/
git commit -m "feat: rewrite admin user APIs with org-scoped queries and user creation"
```

---

### Task 21: Org admin users page

**Files:**
- Create: `app/(org-admin)/admin/page.tsx`

- [ ] **Step 1: Create the org admin users page**

Build a client component that:
- Fetches `GET /api/admin/users` on mount (same search/filter/pagination pattern as the old admin page)
- Displays user table: Name, Email, Role, Active, Modules, Lessons, Actions
- "Create User" button shows inline form with:
  - Name, email inputs
  - Role select (options from org's `allowedRoles` — fetch org info or pass from session)
  - SSO-only toggle (when enabled, hide password fields, set `ssoOnly: true`)
  - Temporary password input (when SSO-only is off)
  - Module checkboxes (show org's `allowedModuleIds`, allow individual override)
  - "Reset to org defaults" button that clears `allowedModuleIds`
- Role change per user: `PATCH /api/admin/users/[userId]`
- Active toggle: `PATCH /api/admin/users/[userId]`
- Delete: `DELETE /api/admin/users/[userId]`
- Cannot modify/delete self (check `user.id === session.user.id`)

Use the same table/filter/toast patterns as the old admin page. Role select options should be fetched from the org via a separate API call or embedded in the page:

```ts
// Fetch org info for allowed roles/modules
const orgRes = await fetch('/api/admin/org')
const org = await orgRes.json()
```

Create a small helper API for this:

```ts
// app/api/admin/org/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isOrgAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const org = await prisma.organisation.findUnique({
    where: { id: session.user.organisationId! },
    select: { id: true, name: true, allowedRoles: true, allowedModuleIds: true },
  })

  return NextResponse.json(org)
}
```

- [ ] **Step 2: Verify + Commit**

```bash
npx tsc --noEmit
git add app/(org-admin)/admin/page.tsx app/api/admin/org/route.ts
git commit -m "feat: add org admin users page with create user form"
```

---

### Task 22: Org announcements API + page

**Files:**
- Create: `app/api/admin/announcements/route.ts`
- Create: `app/api/admin/announcements/[id]/route.ts`
- Create: `app/(org-admin)/admin/announcements/page.tsx`

- [ ] **Step 1: Create the list/create API**

```ts
// app/api/admin/announcements/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isOrgAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  active: z.boolean().default(true),
  expiresAt: z.string().datetime().nullable().optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const announcements = await prisma.announcement.findMany({
    where: { organisationId: session.user.organisationId },
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { name: true } } },
  })

  return NextResponse.json(announcements)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  // Server always sets organisationId from session — client value ignored
  const announcement = await prisma.announcement.create({
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      active: parsed.data.active,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      organisationId: session.user.organisationId!,
      createdById: session.user.id,
    },
  })

  return NextResponse.json(announcement, { status: 201 })
}
```

- [ ] **Step 2: Create the single announcement API**

```ts
// app/api/admin/announcements/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isOrgAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).optional(),
  active: z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const announcement = await prisma.announcement.findUnique({ where: { id: params.id } })
  if (!announcement || announcement.organisationId !== session.user.organisationId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(announcement)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const announcement = await prisma.announcement.findUnique({ where: { id: params.id } })
  if (!announcement || announcement.organisationId !== session.user.organisationId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const data: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.expiresAt !== undefined) {
    data.expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null
  }

  const updated = await prisma.announcement.update({ where: { id: params.id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const announcement = await prisma.announcement.findUnique({ where: { id: params.id } })
  if (!announcement || announcement.organisationId !== session.user.organisationId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.announcement.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Create the announcements page**

Build a client component at `app/(org-admin)/admin/announcements/page.tsx` following the same pattern as the super admin announcements page (Task 17), but using `/api/admin/announcements` endpoints.

- [ ] **Step 4: Verify + Commit**

```bash
npx tsc --noEmit
git add app/api/admin/announcements/ app/(org-admin)/admin/announcements/
git commit -m "feat: add org-scoped announcements CRUD (org admin)"
```

---

### Task 23: Org admin reports API + page

**Files:**
- Create: `app/api/admin/reports/route.ts`
- Create: `app/(org-admin)/admin/reports/page.tsx`

- [ ] **Step 1: Create the reports API**

```ts
// app/api/admin/reports/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isOrgAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = session.user.organisationId
  if (!orgId) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  const org = await prisma.organisation.findUnique({
    where: { id: orgId },
    select: { allowedModuleIds: true },
  })

  const users = await prisma.user.findMany({
    where: {
      organisationId: orgId,
      role: { notIn: ['SUPER_ADMIN', 'ORG_ADMIN'] },
    },
    select: {
      id: true,
      name: true,
      email: true,
      trainingProgress: {
        where: { completed: true },
        select: { moduleId: true, completedAt: true, score: true },
      },
    },
  })

  const moduleIds = org?.allowedModuleIds ?? []
  const moduleStats = moduleIds.map((moduleId) => {
    const completions = users.filter((u) =>
      u.trainingProgress.some((p) => p.moduleId === moduleId)
    ).length
    return {
      moduleId,
      completions,
      totalUsers: users.length,
      pct: users.length > 0 ? Math.round((completions / users.length) * 100) : 0,
    }
  })

  return NextResponse.json({
    totalUsers: users.length,
    modules: moduleStats,
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      completedModules: u.trainingProgress.map((p) => p.moduleId),
      totalCompleted: u.trainingProgress.length,
    })),
  })
}
```

- [ ] **Step 2: Create the reports page**

Build a page at `app/(org-admin)/admin/reports/page.tsx` that:
- Fetches `GET /api/admin/reports` on mount
- Shows per-module stats: module name, completions, total users, %
- Click module → expand to show per-user detail (name, completed date, score)
- Use Recharts bar chart for visual overview (optional, follows existing reports page pattern)

- [ ] **Step 3: Verify + Commit**

```bash
npx tsc --noEmit
git add app/api/admin/reports/ app/(org-admin)/admin/reports/
git commit -m "feat: add org-scoped training reports (org admin)"
```

---

## Phase 4 — User Experience

### Task 24: Change password API + page

**Files:**
- Create: `app/api/auth/change-password/route.ts`
- Create: `app/(change-password)/layout.tsx`
- Create: `app/(change-password)/change-password/page.tsx`

- [ ] **Step 1: Create the change password API**

```ts
// app/api/auth/change-password/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  newPassword: z.string().min(8).max(128),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 12)

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      password: hashedPassword,
      mustChangePassword: false,
    },
  })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Create the minimal layout**

```tsx
// app/(change-password)/layout.tsx
export default function ChangePasswordLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      {children}
    </div>
  )
}
```

- [ ] **Step 3: Create the change password page**

```tsx
// app/(change-password)/change-password/page.tsx
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertCircle, CheckCircle, Lock } from 'lucide-react'

export default function ChangePasswordPage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to change password.')
        return
      }

      // Refresh the session token so mustChangePassword becomes false
      await update()

      // Redirect to role-appropriate home
      const role = session?.user?.role
      if (role === 'SUPER_ADMIN') router.push('/super-admin')
      else if (role === 'ORG_ADMIN') router.push('/admin')
      else router.push('/dashboard')
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-2xl mb-4">
            <Lock className="h-8 w-8 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Change your password</h1>
          <p className="text-slate-500 mt-1">You must set a new password before continuing.</p>
        </div>

        <div className="card border-t-4 border-t-primary-500">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-5">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="newPassword" className="label">New password</label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="Minimum 8 characters"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">Confirm password</label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input pr-8"
                  placeholder="Re-enter your password"
                  required
                  autoComplete="new-password"
                />
                {confirmPassword && newPassword === confirmPassword && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sage-500" />
                )}
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-base">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Changing password...
                </span>
              ) : (
                'Set new password'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify + Commit**

```bash
npx tsc --noEmit
git add app/api/auth/change-password/ app/(change-password)/
git commit -m "feat: add change password API and page (first-time password flow)"
```

---

### Task 25: Dashboard announcements API + component

**Files:**
- Create: `app/api/announcements/active/route.ts`
- Create: `components/dashboard/announcements.tsx`

- [ ] **Step 1: Create the active announcements API**

```ts
// app/api/announcements/active/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isLeafRole } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !isLeafRole(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()
  const orgId = session.user.organisationId

  const announcements = await prisma.announcement.findMany({
    where: {
      active: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
      AND: [
        {
          OR: [
            { organisationId: null }, // global
            ...(orgId ? [{ organisationId: orgId }] : []),
          ],
        },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: {
      id: true,
      title: true,
      body: true,
      organisationId: true,
      createdAt: true,
    },
  })

  return NextResponse.json(announcements)
}
```

- [ ] **Step 2: Create the announcements component**

```tsx
// components/dashboard/announcements.tsx
'use client'

import { useState, useEffect } from 'react'
import { Megaphone, X } from 'lucide-react'
import { clsx } from 'clsx'

interface AnnouncementData {
  id: string
  title: string
  body: string
  organisationId: string | null
  createdAt: string
}

export function DashboardAnnouncements() {
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Load dismissed IDs from localStorage
    try {
      const stored = localStorage.getItem('dismissed-announcements')
      if (stored) setDismissed(new Set(JSON.parse(stored)))
    } catch {}

    fetch('/api/announcements/active')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAnnouncements(data)
      })
      .catch(() => {})
  }, [])

  function dismiss(id: string) {
    const next = new Set(dismissed)
    next.add(id)
    setDismissed(next)
    try {
      localStorage.setItem('dismissed-announcements', JSON.stringify([...next]))
    } catch {}
  }

  const visible = announcements.filter((a) => !dismissed.has(a.id))

  if (visible.length === 0) return null

  return (
    <div className="space-y-3">
      {visible.map((a) => {
        const isGlobal = a.organisationId === null
        return (
          <div
            key={a.id}
            className={clsx(
              'rounded-xl p-4 border-l-4 relative',
              isGlobal
                ? 'bg-blue-50 border-l-blue-500 dark:bg-blue-900/20 dark:border-l-blue-400'
                : 'bg-amber-50 border-l-amber-500 dark:bg-amber-900/20 dark:border-l-amber-400'
            )}
          >
            <button
              onClick={() => dismiss(a.id)}
              className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/50"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-start gap-3 pr-8">
              <Megaphone className={clsx(
                'h-5 w-5 mt-0.5 flex-shrink-0',
                isGlobal ? 'text-blue-500' : 'text-amber-500'
              )} />
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">{a.title}</h3>
                <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">{a.body}</p>
                <p className="text-xs text-slate-400 mt-2">
                  {new Date(a.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Verify + Commit**

```bash
npx tsc --noEmit
git add app/api/announcements/active/ components/dashboard/announcements.tsx
git commit -m "feat: add active announcements API and dashboard component"
```

---

### Task 26: Wire announcements into dashboard + module access gating

**Files:**
- Modify: `app/(dashboard)/dashboard/page.tsx`
- Modify: `app/(dashboard)/training/page.tsx`
- Modify: `app/(dashboard)/careers/page.tsx`

- [ ] **Step 1: Add announcements to dashboard**

At the top of the dashboard page's JSX, after the welcome section and before the stats row, add:

```tsx
import { DashboardAnnouncements } from '@/components/dashboard/announcements'

// Inside the return, after the welcome div:
<DashboardAnnouncements />
```

Also update the dashboard to use module-based training display. Replace the existing `activeModules` logic:

```tsx
import { getEffectiveModules, hasAsdAccess, hasCareersAccess } from '@/lib/modules'

// After fetching session, fetch user's org for module info
const user = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: { allowedModuleIds: true, organisation: { select: { allowedModuleIds: true } } },
})

const effectiveModules = getEffectiveModules(
  user?.allowedModuleIds ?? [],
  user?.organisation?.allowedModuleIds ?? []
)

const showCaregiving = canAccessCaregiving(session) || hasAsdAccess(effectiveModules)
const showCareers = canAccessCareers(session) || hasCareersAccess(effectiveModules)

const activeModules = [
  ...(showCaregiving ? TRAINING_MODULES.filter((m) => effectiveModules.includes(m.id)) : []),
  ...(showCareers ? CAREERS_MODULES.filter((m) => effectiveModules.includes(m.id)) : []),
]
```

- [ ] **Step 2: Update training page access**

In `app/(dashboard)/training/page.tsx`, replace the access check:

```tsx
import { getEffectiveModules, hasAsdAccess } from '@/lib/modules'

// After session check:
const user = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: { allowedModuleIds: true, role: true, organisation: { select: { allowedModuleIds: true } } },
})

const effectiveModules = getEffectiveModules(
  user?.allowedModuleIds ?? [],
  user?.organisation?.allowedModuleIds ?? []
)

// CAREGIVER always has access; other leaf roles check modules
if (user?.role !== 'CAREGIVER' && !hasAsdAccess(effectiveModules)) {
  redirect('/dashboard')
}

// Filter modules to only show assigned ones
const visibleModules = TRAINING_MODULES.filter((m) => effectiveModules.includes(m.id))
```

Use `visibleModules` instead of `TRAINING_MODULES` in the JSX.

- [ ] **Step 3: Update careers page access**

In `app/(dashboard)/careers/page.tsx`, apply the same pattern:

```tsx
import { getEffectiveModules, hasCareersAccess } from '@/lib/modules'

// After session check:
const user = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: { allowedModuleIds: true, role: true, organisation: { select: { allowedModuleIds: true } } },
})

const effectiveModules = getEffectiveModules(
  user?.allowedModuleIds ?? [],
  user?.organisation?.allowedModuleIds ?? []
)

if (user?.role !== 'CAREER_DEV_OFFICER' && !hasCareersAccess(effectiveModules)) {
  redirect('/dashboard')
}

const visibleModules = CAREERS_MODULES.filter((m) => effectiveModules.includes(m.id))
```

Use `visibleModules` instead of `CAREERS_MODULES` in the JSX.

- [ ] **Step 4: Verify + Commit**

```bash
npx tsc --noEmit
git add app/(dashboard)/dashboard/page.tsx app/(dashboard)/training/page.tsx app/(dashboard)/careers/page.tsx
git commit -m "feat: wire announcements into dashboard; add module-based access gating for training/careers"
```

---

### Task 27: Final integration + verification

**Files:**
- Modify: `app/(auth)/login/page.tsx` — ensure SSO callback goes to `/` (not `/dashboard`)
- Modify: `app/(auth)/register/page.tsx` — update SSO callback URLs to `/`

- [ ] **Step 1: Audit all callbackUrl references**

Search for `callbackUrl: '/dashboard'` in all auth pages and change to `callbackUrl: '/'`. The middleware handles role-based redirect from `/`.

```bash
# Find all instances
grep -r "callbackUrl.*dashboard" app/(auth)/
```

Update each occurrence.

- [ ] **Step 2: Run full type check**

```bash
npx tsc --noEmit
```

Fix any remaining type errors. Common issues to look for:
- References to the old `'ADMIN'` role string
- Missing `organisationId` in session usage
- `isAdmin` calls that should now be `isSuperAdmin`

- [ ] **Step 3: Test the dev server**

```bash
npm run dev
```

Verify:
1. Login as a SUPER_ADMIN → lands on `/super-admin`
2. Login as an ORG_ADMIN → lands on `/admin`
3. Login as a CAREGIVER → lands on `/dashboard`
4. SUPER_ADMIN cannot access `/dashboard`
5. ORG_ADMIN cannot access `/super-admin`
6. Leaf roles cannot access `/admin` or `/super-admin`
7. User with `mustChangePassword: true` → redirected to `/change-password`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: final integration — audit callbackUrls, fix type errors"
```

---

## Post-Implementation Notes

### Migration Checklist (Production)

Run in this exact order against the production database:

1. **Neon SQL Editor:** `UPDATE "User" SET role = 'SUPER_ADMIN' WHERE role = 'ADMIN';`
2. **Deploy** the new code (schema + all features)
3. **Vercel console or CLI:** `npx prisma db push` (applies schema to prod)
4. **Vercel console or CLI:** `npx tsx prisma/migrate-to-multi-tenant.ts` (creates Legacy org, assigns users)

### Design Decisions

- **Self-registration preserved** — new users go to Legacy org. Consider removing the `/register` page once all organisations are properly onboarded.
- **New leaf roles (STUDENT, INTERN, EMPLOYEE)** show both Training and Careers nav items. Pages redirect if the user's effective modules don't include relevant module IDs.
- **Announcement dismiss** is per-session via `localStorage` — reappears after clearing storage or on a new device.
- **`unstable_update`** from NextAuth v4.24.7 is used to refresh the JWT after password change. If this causes issues, the fallback is to `signOut()` + redirect to `/login?passwordChanged=1`.

### Files That Reference `'ADMIN'` (audit list)

All of these must be updated during implementation. Search for them:

```bash
grep -r "'ADMIN'" --include="*.ts" --include="*.tsx" app/ lib/ components/ types/
```
