# Training Programs — Design Spec

**Date:** 2026-03-29
**Status:** Approved
**Branch:** `feat/training-programs`

---

## Goal

Replace the hardcoded ModuleType enum (ASD/CAREERS) with a dynamic TrainingProgram model. Super admins can create, name, and manage training programs with revision tracking. Orgs are assigned whole programs instead of individual modules.

## Current State

- `Module` model has a `type` field using `ModuleType` enum (ASD | CAREERS)
- Training page groups modules by this enum with hardcoded section headers
- Orgs have `allowedModuleIds` (array of individual module IDs)
- Users have `allowedModuleIds` (per-user override)
- Sidebar hardcodes "ASD Training" and "Careers Training" links
- `lib/modules.ts` has hardcoded `ASD_MODULE_IDS` and `CAREERS_MODULE_IDS` arrays

## Database Schema

### New Model

```prisma
enum ProgramStatus {
  DRAFT
  UNDER_REVIEW
  APPROVED
  ARCHIVED
}

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

### Modified Models

**Module** — replace `type ModuleType` with `programId String` → TrainingProgram:
```prisma
model Module {
  id          String          @id
  title       String
  description String
  programId   String
  order       Int
  active      Boolean         @default(true)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  program   TrainingProgram @relation(fields: [programId], references: [id])
  lessons   Lesson[]
}
```

**Organisation** — replace `allowedModuleIds String[]` with `allowedProgramIds String[]`:
```prisma
allowedProgramIds String[]
```

**User** — remove `allowedModuleIds`. Users inherit program access from their org. Simplifies the permission model.

### Removed

- `ModuleType` enum (ASD | CAREERS) — deleted
- `LessonType` enum — keep (TEXT | VIDEO is still valid)
- `User.allowedModuleIds` — removed
- `Organisation.allowedModuleIds` — replaced with `allowedProgramIds`

## Data Migration

### Seed/migration script: `prisma/migrate-to-programs.ts`

1. Create TrainingProgram "ASD Awareness Training" (id: `program-asd`, status: APPROVED, version: "1.0")
2. Create TrainingProgram "Careers CPD Training" (id: `program-careers`, status: APPROVED, version: "1.0")
3. Update all modules with `type: 'ASD'` → set `programId: 'program-asd'`
4. Update all modules with `type: 'CAREERS'` → set `programId: 'program-careers'`
5. For each org: convert `allowedModuleIds` to `allowedProgramIds`:
   - If org has any ASD module IDs → add `program-asd` to `allowedProgramIds`
   - If org has any Careers module IDs → add `program-careers` to `allowedProgramIds`
6. Remove the `type` column from Module (handled by schema push after migration)

### Migration order
1. Add new fields (`programId` on Module, `allowedProgramIds` on Organisation, TrainingProgram model) — make `programId` optional initially
2. Run migration script to populate data
3. Make `programId` required, remove `type` from Module, remove `allowedModuleIds` from Organisation and User
4. Push final schema

## API Routes

### Training Program CRUD (Super Admin)

**`GET /api/super-admin/training/programs`**
- Returns all programs ordered by `order`, with module count
- Auth: SUPER_ADMIN

**`POST /api/super-admin/training/programs`**
- Creates a new program
- Body: `{ name, description?, version?, status? }`
- Auto-generates order value

**`GET /api/super-admin/training/programs/[programId]`**
- Returns program with all modules (ordered), each with lesson count

**`PATCH /api/super-admin/training/programs/[programId]`**
- Updates program fields: name, description, order, active, version, status, reviewedAt, reviewedBy, reviewNotes

**`DELETE /api/super-admin/training/programs/[programId]`**
- Returns 400 if program has modules (must delete modules first or move them)

### Module Changes

**`POST /api/super-admin/training/modules`** — update to accept `programId` instead of `type`

**Existing module routes** — no change needed (modules still have id, title, etc.)

## Super Admin UI

### `/super-admin/training` — Program List

Complete redesign of the training content page:

- **Page header**: "Training Content" with "New Training Program" button
- **Each program** as a collapsible card:
  - Header row: program name (bold), version badge (e.g. "v1.0"), status badge (Draft=grey, Under Review=amber, Approved=green, Archived=red), active toggle
  - Subtitle: description (truncated)
  - "Edit Program" button, "View" button (preview), up/down reorder
  - Expanded: module list (same as current — cards with lesson count, edit/view buttons)
  - "Add Module" button within each program
- **"New Training Program" button** → opens a form:
  - Name (required)
  - Description (textarea)
  - Version (default "1.0")
  - Status dropdown (Draft / Under Review / Approved / Archived)

### Edit Program Dialog/Section

When clicking "Edit Program":
- Name input
- Description textarea
- **Revision section**:
  - Version input (e.g. "1.1", "2.0")
  - Status dropdown
  - Reviewed by (text input — name of reviewer)
  - Reviewed at (date picker)
  - Review notes (textarea)
- Save button

### Org Assignment

**Super admin org detail** (`/super-admin/organisations/[orgId]`):
- Replace the "ASD Awareness Training" / "Careers CPD Training" toggles with dynamic program toggles
- Each active program shown as a toggle button with name and module count
- Saves `allowedProgramIds` array

**Org admin user creation** — remove module access selection entirely. Users inherit all programs from their org.

## User-Facing Changes

### Sidebar

Replace hardcoded "ASD Training" / "Careers Training" links:
- Fetch programs from session `effectiveModules` or a new `effectivePrograms` field
- Show one link per assigned program: `/training/[programId]`
- Icon: BookOpen for all programs

### Session Token

Replace `effectiveModules` with `effectivePrograms` in the JWT:
```typescript
token.effectivePrograms = await getUserEffectivePrograms(userId)
// Returns: [{ id: 'program-asd', name: 'ASD Awareness Training' }, ...]
```

### Dashboard

Training progress section groups by program name instead of hardcoded labels.

### Training Pages

**`/training`** — redirect to dashboard or show program list
**`/training/[programId]`** — shows modules for that program (replaces current `/training` which only showed ASD)
**`/training/[programId]/[moduleId]/[lessonId]`** — lesson viewer (mostly unchanged)

**`/careers`** route — redirect to the appropriate program URL for backwards compatibility

### Reports

Org admin reports and super admin reports show program names instead of "M1-M5, C1-C4" labels.

## lib/modules.ts Rewrite

Replace hardcoded module ID arrays with DB queries:

```typescript
// Old
export const ASD_MODULE_IDS = ['module-1', ...]
export const CAREERS_MODULE_IDS = ['careers-module-1', ...]

// New
export async function getUserPrograms(userId: string): Promise<{ id: string; name: string }[]>
export async function getOrgPrograms(orgId: string): Promise<{ id: string; name: string }[]>
export function hasAccess(userPrograms: string[], programId: string): boolean
```

## Out of Scope

- Per-user program overrides (users inherit from org)
- Program duplication/cloning
- Program sharing between super admin instances
- Revision history log (only current revision tracked)
- Document upload / AI generation (Phase 2)
