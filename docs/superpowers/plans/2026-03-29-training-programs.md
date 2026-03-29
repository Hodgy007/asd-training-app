# Training Programs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded ModuleType enum with a dynamic TrainingProgram model, enabling super admins to create/name/manage training programs with revision tracking, and assigning whole programs to orgs.

**Architecture:** New TrainingProgram Prisma model sits above Module. Migration script converts existing ASD/CAREERS data. Org assignment changes from `allowedModuleIds` to `allowedProgramIds`. Sidebar and training pages become dynamic based on assigned programs. JWT token carries `effectivePrograms` instead of `effectiveModules`.

**Tech Stack:** Next.js 14, Prisma, Neon PostgreSQL, Tailwind CSS, Lucide icons

---

## File Structure

### New Files
- `prisma/migrate-to-programs.ts` — data migration script
- `app/api/super-admin/training/programs/route.ts` — GET/POST programs
- `app/api/super-admin/training/programs/[programId]/route.ts` — GET/PATCH/DELETE program
- `app/(dashboard)/training/[programId]/page.tsx` — program module list (user-facing)
- `app/(dashboard)/training/[programId]/[moduleId]/[lessonId]/page.tsx` — lesson viewer under program

### Modified Files (significant changes)
- `prisma/schema.prisma` — add TrainingProgram model, add programId to Module, change Organisation/User fields
- `lib/modules.ts` — rewrite to use programs instead of hardcoded arrays
- `lib/auth.ts` — change effectiveModules → effectivePrograms in JWT
- `lib/training-db.ts` — update queries to use programId
- `components/layout/sidebar.tsx` — dynamic program links
- `app/(super-admin)/super-admin/training/page.tsx` — program-based layout with revision info
- `app/(super-admin)/super-admin/organisations/[orgId]/page.tsx` — program toggles
- `app/(org-admin)/admin/page.tsx` — remove module access from user creation
- `app/(dashboard)/dashboard/page.tsx` — program-based progress
- `app/(dashboard)/training/page.tsx` — redirect or program list
- `app/api/super-admin/training/modules/route.ts` — accept programId instead of type
- `types/index.ts` — update session types
- `middleware.ts` — allow new training routes

---

### Task 1: Add TrainingProgram Model (Phase 1 Schema)

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add ProgramStatus enum and TrainingProgram model**

Add before the existing Role enum:
```prisma
enum ProgramStatus {
  DRAFT
  UNDER_REVIEW
  APPROVED
  ARCHIVED
}
```

Add after the QuizQuestion model:
```prisma
model TrainingProgram {
  id           String        @id @default(cuid())
  name         String
  description  String?       @db.Text
  order        Int
  active       Boolean       @default(true)
  version      String        @default("1.0")
  status       ProgramStatus @default(DRAFT)
  reviewedAt   DateTime?
  reviewedBy   String?
  reviewNotes  String?       @db.Text
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  modules Module[]
}
```

Add to Module model: `programId String?` (optional for now) and relation:
```prisma
program TrainingProgram? @relation(fields: [programId], references: [id])
```

Add to Organisation model: `allowedProgramIds String[]`

Keep the existing `type`, `allowedModuleIds` for now — we'll remove them after migration.

- [ ] **Step 2: Push schema**

```bash
cp .env.local .env
npx prisma db push
rm .env
```

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add TrainingProgram model and programId to Module (Phase 1)"
```

---

### Task 2: Data Migration Script

**Files:**
- Create: `prisma/migrate-to-programs.ts`

- [ ] **Step 1: Write migration script**

Creates two TrainingProgram records, assigns modules to them, and converts org allowedModuleIds to allowedProgramIds.

```typescript
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Step 1: Create training programs...')

  const asdProgram = await prisma.trainingProgram.upsert({
    where: { id: 'program-asd' },
    update: { name: 'ASD Awareness Training', order: 1 },
    create: {
      id: 'program-asd',
      name: 'ASD Awareness Training',
      description: 'Early identification training for practitioners and early years professionals.',
      order: 1,
      version: '1.0',
      status: 'APPROVED',
      active: true,
    },
  })
  console.log(`  ✓ ${asdProgram.name} (${asdProgram.id})`)

  const careersProgram = await prisma.trainingProgram.upsert({
    where: { id: 'program-careers' },
    update: { name: 'Careers CPD Training', order: 2 },
    create: {
      id: 'program-careers',
      name: 'Careers CPD Training',
      description: 'Autism-inclusive careers guidance for careers professionals.',
      order: 2,
      version: '1.0',
      status: 'APPROVED',
      active: true,
    },
  })
  console.log(`  ✓ ${careersProgram.name} (${careersProgram.id})`)

  console.log('Step 2: Assign modules to programs...')
  const asdUpdate = await prisma.module.updateMany({
    where: { type: 'ASD' },
    data: { programId: 'program-asd' },
  })
  console.log(`  ✓ ${asdUpdate.count} ASD modules → program-asd`)

  const careersUpdate = await prisma.module.updateMany({
    where: { type: 'CAREERS' },
    data: { programId: 'program-careers' },
  })
  console.log(`  ✓ ${careersUpdate.count} Careers modules → program-careers`)

  console.log('Step 3: Convert org allowedModuleIds to allowedProgramIds...')
  const orgs = await prisma.organisation.findMany()
  for (const org of orgs) {
    const programIds: string[] = []
    if (org.allowedModuleIds.some((id: string) => id.startsWith('module-'))) {
      programIds.push('program-asd')
    }
    if (org.allowedModuleIds.some((id: string) => id.startsWith('careers-'))) {
      programIds.push('program-careers')
    }
    await prisma.organisation.update({
      where: { id: org.id },
      data: { allowedProgramIds: programIds },
    })
    console.log(`  ✓ ${org.name}: ${programIds.join(', ') || '(none)'}`)
  }

  console.log('Migration complete.')
}

main()
  .catch((e) => { console.error('Migration failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Run migration**

```bash
cp .env.local .env
npx tsx prisma/migrate-to-programs.ts
rm .env
```

- [ ] **Step 3: Commit**

```bash
git add prisma/migrate-to-programs.ts
git commit -m "feat: migrate existing modules and orgs to training programs"
```

---

### Task 3: Finalize Schema (Phase 2 — Remove Old Fields)

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Make programId required, remove type and old fields**

In Module model:
- Change `programId String?` → `programId String` (required)
- Change `program TrainingProgram?` → `program TrainingProgram`
- Remove `type ModuleType`

In Organisation model:
- Remove `allowedModuleIds String[]`

In User model:
- Remove `allowedModuleIds String[]`

Remove the `ModuleType` enum entirely.

- [ ] **Step 2: Push schema**

```bash
cp .env.local .env
npx prisma db push --accept-data-loss
rm .env
```

(accept-data-loss needed because removing the ModuleType enum and columns)

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: finalize schema — remove ModuleType enum and old allowedModuleIds"
```

---

### Task 4: Rewrite lib/modules.ts and lib/auth.ts

**Files:**
- Modify: `lib/modules.ts`
- Modify: `lib/auth.ts`
- Modify: `lib/training-db.ts`
- Modify: `types/index.ts`

- [ ] **Step 1: Rewrite lib/modules.ts**

Replace the entire file. Remove hardcoded arrays, use DB queries:

```typescript
import prisma from './prisma'

export interface ProgramInfo {
  id: string
  name: string
}

export async function getOrgPrograms(orgId: string): Promise<ProgramInfo[]> {
  const org = await prisma.organisation.findUnique({
    where: { id: orgId },
    select: { allowedProgramIds: true },
  })
  if (!org || org.allowedProgramIds.length === 0) return []
  const programs = await prisma.trainingProgram.findMany({
    where: { id: { in: org.allowedProgramIds }, active: true },
    select: { id: true, name: true },
    orderBy: { order: 'asc' },
  })
  return programs
}

export async function getUserPrograms(userId: string): Promise<ProgramInfo[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organisationId: true },
  })
  if (!user?.organisationId) return []
  return getOrgPrograms(user.organisationId)
}

export function hasAccess(userProgramIds: string[], programId: string): boolean {
  return userProgramIds.includes(programId)
}
```

- [ ] **Step 2: Update lib/auth.ts**

Replace `getUserEffectiveModules` with `getUserEffectivePrograms`:

```typescript
import { getUserPrograms } from './modules'
import type { ProgramInfo } from './modules'

async function getUserEffectivePrograms(userId: string): Promise<ProgramInfo[]> {
  return getUserPrograms(userId)
}
```

In the JWT callback, replace all `token.effectiveModules` with `token.effectivePrograms`:
- Credentials login: `token.effectivePrograms = await getUserEffectivePrograms(user.id)`
- SSO login: `token.effectivePrograms = await getUserEffectivePrograms(dbUser.id)`
- Update trigger: `token.effectivePrograms = await getUserEffectivePrograms(token.id as string)`

In session callback: `session.user.effectivePrograms = (token.effectivePrograms as ProgramInfo[]) ?? []`

- [ ] **Step 3: Update types/index.ts**

Replace `effectiveModules: string[]` with `effectivePrograms: { id: string; name: string }[]` in both Session and JWT augmentations.

Remove `allowedModuleIds` from the User interface.

- [ ] **Step 4: Update lib/training-db.ts**

Replace `getModules(type: ModuleType)` with `getModulesByProgram(programId: string)`:

```typescript
export async function getModulesByProgram(programId: string) {
  return prisma.module.findMany({
    where: { programId, active: true },
    orderBy: { order: 'asc' },
    include: { lessons: { where: { active: true }, orderBy: { order: 'asc' } } },
  })
}
```

Remove the `ModuleType` import. Update `getAllModules` to include program relation:
```typescript
export async function getAllModules() {
  return prisma.module.findMany({
    orderBy: [{ programId: 'asc' }, { order: 'asc' }],
    include: { _count: { select: { lessons: true } }, program: { select: { id: true, name: true } } },
  })
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/modules.ts lib/auth.ts lib/training-db.ts types/index.ts
git commit -m "feat: rewrite module helpers for program-based access"
```

---

### Task 5: Program CRUD API Routes

**Files:**
- Create: `app/api/super-admin/training/programs/route.ts`
- Create: `app/api/super-admin/training/programs/[programId]/route.ts`
- Modify: `app/api/super-admin/training/modules/route.ts`

- [ ] **Step 1: Create program list/create route**

GET: all programs with module count, ordered. POST: create with name, description, version, status. Auth: SUPER_ADMIN.

- [ ] **Step 2: Create single program route**

GET: program with modules. PATCH: update name/description/version/status/reviewedAt/reviewedBy/reviewNotes/order/active. DELETE: 400 if program has modules. Auth: SUPER_ADMIN.

- [ ] **Step 3: Update module creation route**

Change POST to accept `programId` instead of `type`. Remove type validation. Add check that programId exists.

- [ ] **Step 4: Commit**

```bash
git add app/api/super-admin/training/programs/ app/api/super-admin/training/modules/route.ts
git commit -m "feat: add program CRUD API and update module creation"
```

---

### Task 6: Redesign Super Admin Training Page

**Files:**
- Modify: `app/(super-admin)/super-admin/training/page.tsx`

- [ ] **Step 1: Rewrite training content page**

Fetch programs from `GET /api/super-admin/training/programs`. Display as collapsible sections:

- "New Training Program" button at top
- Each program as a card:
  - Header: name, version badge, status badge (DRAFT=grey, UNDER_REVIEW=amber, APPROVED=green, ARCHIVED=red), active toggle
  - "Edit Program" button → inline editable fields (name, description, version, status, reviewedBy, reviewedAt, reviewNotes)
  - Expanded: module list with View/Edit buttons, Add Module button
  - Reorder with up/down arrows
- "New Training Program" form: name, description, version, status dropdown
- Module creation now passes `programId` instead of `type`

Remove hardcoded "ASD Training Modules" / "Careers Training Modules" sections.

- [ ] **Step 2: Commit**

```bash
git add "app/(super-admin)/super-admin/training/page.tsx"
git commit -m "feat: redesign training content page with dynamic programs"
```

---

### Task 7: Update Org Assignment

**Files:**
- Modify: `app/(super-admin)/super-admin/organisations/[orgId]/page.tsx`
- Modify: `app/(org-admin)/admin/page.tsx`

- [ ] **Step 1: Update super admin org detail**

Replace the hardcoded ASD/Careers training plan toggles with dynamic program toggles:
- Fetch programs from `GET /api/super-admin/training/programs`
- Show each active program as a toggle button (name + module count)
- Save `allowedProgramIds` array via PATCH (update the API to accept this field)

Remove imports of `ASD_MODULE_IDS`, `CAREERS_MODULE_IDS`.

- [ ] **Step 2: Update org admin user creation**

Remove the training plan toggle section from user creation entirely. Users inherit all programs from their org — no per-user override.

Remove the `ModuleToggleButton` component and related code.

Remove the `allowedModuleIds` field from the create form.

- [ ] **Step 3: Commit**

```bash
git add "app/(super-admin)/super-admin/organisations/[orgId]/page.tsx" "app/(org-admin)/admin/page.tsx"
git commit -m "feat: update org assignment to use programs instead of modules"
```

---

### Task 8: Update Sidebar and Session

**Files:**
- Modify: `components/layout/sidebar.tsx`
- Modify: `app/api/sessions/org-info/route.ts`

- [ ] **Step 1: Update sidebar for dynamic programs**

Replace hardcoded training link logic:
- Get `effectivePrograms` from `session.user.effectivePrograms`
- For each program, add a nav link: `{ href: '/training/${program.id}', label: program.name, icon: BookOpen }`
- Remove the hardcoded `module-` / `careers-` prefix checks
- CAREGIVER: show all assigned programs + child observations + reports
- CAREER_DEV_OFFICER: show all assigned programs
- STUDENT/INTERN/EMPLOYEE: show all assigned programs

- [ ] **Step 2: Update org-info API**

Return `allowedProgramIds` instead of `allowedModuleIds` in the org-info response.

- [ ] **Step 3: Commit**

```bash
git add components/layout/sidebar.tsx app/api/sessions/org-info/route.ts
git commit -m "feat: dynamic program links in sidebar"
```

---

### Task 9: Update Training Pages

**Files:**
- Modify: `app/(dashboard)/training/page.tsx`
- Create: `app/(dashboard)/training/[programId]/page.tsx`
- Modify or move: `app/(dashboard)/training/[moduleId]/[lessonId]/page.tsx` → `app/(dashboard)/training/[programId]/[moduleId]/[lessonId]/page.tsx`
- Modify: `app/(dashboard)/dashboard/page.tsx`
- Remove: `app/(dashboard)/careers/page.tsx`
- Remove: `app/(dashboard)/careers/[moduleId]/[lessonId]/page.tsx`

- [ ] **Step 1: Create program module list page**

`app/(dashboard)/training/[programId]/page.tsx` — server component:
- Fetch program and its active modules from DB
- Check user has access (program ID in effectivePrograms)
- Display modules with progress tracking, sequential unlocking (same UX as current training page)

- [ ] **Step 2: Move lesson viewer**

Create `app/(dashboard)/training/[programId]/[moduleId]/[lessonId]/page.tsx` — copy/adapt from the existing lesson viewer. Update breadcrumbs to include program name.

- [ ] **Step 3: Update training index page**

`app/(dashboard)/training/page.tsx` — show list of assigned programs with progress, or redirect to single program if only one assigned.

- [ ] **Step 4: Update dashboard**

Replace hardcoded `TRAINING_MODULES`/`CAREERS_MODULES` imports with DB queries grouped by program. Use `effectivePrograms` from session.

- [ ] **Step 5: Add redirects for old routes**

`app/(dashboard)/careers/page.tsx` → redirect to `/training/program-careers` for backwards compatibility.

- [ ] **Step 6: Commit**

```bash
git add app/(dashboard)/training/ app/(dashboard)/careers/ app/(dashboard)/dashboard/
git commit -m "feat: update training pages for program-based navigation"
```

---

### Task 10: Update Reports and Remaining References

**Files:**
- Modify: `app/(org-admin)/admin/reports/page.tsx`
- Modify: `app/(super-admin)/super-admin/reports/page.tsx`
- Modify: `app/(super-admin)/super-admin/page.tsx`
- Modify: `middleware.ts`

- [ ] **Step 1: Update org admin reports**

Replace hardcoded MODULE_NAMES with DB-fetched program→module structure. Group by program name.

- [ ] **Step 2: Update super admin reports**

Replace hardcoded module labels with dynamic program→module structure.

- [ ] **Step 3: Update super admin overview**

Any references to module types should use programs.

- [ ] **Step 4: Update middleware**

Allow `/training/[programId]` routes. The current middleware allows `/training` prefix which covers this. Verify SUPER_ADMIN preview access still works.

- [ ] **Step 5: Commit**

```bash
git add app/(org-admin)/admin/reports/ app/(super-admin)/super-admin/ middleware.ts
git commit -m "feat: update reports and remaining references for programs"
```

---

### Task 11: Build, Type-Check, and Deploy

- [ ] **Step 1: Type-check**

```bash
npx tsc --noEmit
```

Fix any errors — there will likely be several since we removed `ModuleType`, `allowedModuleIds`, and `effectiveModules`.

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

- Login as super admin → Training Content shows programs with revision info
- Create a new training program
- Edit program name and revision details
- Org detail shows program toggles
- User dashboard shows program-based progress
- Sidebar shows dynamic program links
- Training pages work under `/training/[programId]`
