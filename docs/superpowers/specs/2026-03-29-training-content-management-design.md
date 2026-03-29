# Training Content Management — Design Spec

**Date:** 2026-03-29
**Status:** Approved
**Branch:** `feat/training-content-management`

---

## Goal

Move all training content (modules, lessons, quiz questions) from hardcoded TypeScript files into the database. Build a super admin UI for creating, editing, and managing training content. Add AI-powered quiz generation via Google Gemini.

## Current State

- 5 ASD modules (11 lessons) hardcoded in `lib/training-data.ts`
- 4 Careers modules (12 lessons) hardcoded in `lib/careers-training-data.ts`
- Quiz questions embedded in lesson objects in the TS files
- `TrainingProgress` model tracks completion per user via `moduleId`/`lessonId` strings
- Existing content uses a mix of markdown and HTML formatting
- Gemini AI already integrated for child observation insights (`lib/gemini.ts`, key: `GEMINI_API_KEY`)

## Database Schema

### New Models

```prisma
model Module {
  id          String   @id
  title       String
  description String
  type        ModuleType
  order       Int
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  lessons     Lesson[]
}

model Lesson {
  id            String         @id
  moduleId      String
  title         String
  type          LessonType
  content       String         @db.Text
  videoUrl      String?
  order         Int
  active        Boolean        @default(true)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  module        Module         @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  quizQuestions QuizQuestion[]
}

model QuizQuestion {
  id            String   @id @default(cuid())
  lessonId      String
  question      String
  options       String   // JSON string array: ["Option A", "Option B", ...]
  correctAnswer String
  explanation   String
  order         Int
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  lesson        Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
}

enum ModuleType {
  ASD
  CAREERS
}

enum LessonType {
  TEXT
  VIDEO
}
```

### Key Decisions

- Module and Lesson IDs are **manually set strings** (e.g. `module-1`, `lesson-1-1`, `careers-module-1`, `careers-1-1`) to preserve compatibility with existing `TrainingProgress` records.
- `QuizQuestion.options` is a JSON string array. Prisma does not support native JSON on all Neon configurations, so we serialise/deserialise in the API layer.
- `active` flag allows hiding modules/lessons without deleting them (preserves progress records).
- Cascade delete: deleting a module deletes its lessons; deleting a lesson deletes its quiz questions.

## Super Admin UI

### Pages

#### `/super-admin/training` — Module List

- Two sections: "ASD Training Modules" and "Careers Training Modules"
- Each module shown as a card with: title, description, lesson count, active/inactive badge
- Actions per module: Edit, Toggle active
- "Add Module" button per section (ASD or Careers)
- Modules ordered by `order` field; reordering via up/down arrows

#### `/super-admin/training/[moduleId]` — Module Editor

- Edit module title and description
- Lesson list: cards with title, type badge (TEXT/VIDEO), active badge, quiz question count
- Actions per lesson: Edit, Toggle active
- "Add Lesson" button
- Lessons ordered by `order` field; reordering via up/down arrows
- Back link to module list

#### `/super-admin/training/[moduleId]/[lessonId]` — Lesson Editor

- Fields: title, type (TEXT/VIDEO dropdown), video URL (shown when type is VIDEO)
- Rich text editor (WYSIWYG) for lesson content — supports bold, italic, headings, lists, links
- **Quiz Section** below the editor:
  - List of existing quiz questions with: question text, options, correct answer highlighted, explanation
  - Manual add/edit/delete for individual questions
  - **"Generate Quiz with AI" button**:
    - Opens a dialog/inline panel
    - Admin selects number of questions (3-10, default 5)
    - Calls Gemini API with the lesson content
    - Shows generated questions in a preview
    - Admin can edit any question before confirming
    - "Save Quiz" writes all questions to the database
    - If quiz questions already exist, admin is warned and can choose to replace or append
- Back link to module editor

### Rich Text Editor

Use **React Quill** — lightweight, well-supported WYSIWYG editor for React.

- Install: `react-quill` (dynamic import with `ssr: false` since it requires `document`)
- Toolbar: bold, italic, underline, headings (H2, H3), ordered list, unordered list, link, clean
- Stores content as HTML in the `content` column
- No image upload in editor (keeps it simple; images can be linked via URL if needed)

## API Routes

### Module CRUD

**`GET /api/super-admin/training/modules`**
- Returns all modules ordered by `order`, with lesson count
- Auth: SUPER_ADMIN only

**`POST /api/super-admin/training/modules`**
- Creates a new module
- Body: `{ id, title, description, type, order }`
- Auto-generates next order value if not provided

**`GET /api/super-admin/training/modules/[moduleId]`**
- Returns module with all lessons (ordered) and lesson quiz question counts

**`PATCH /api/super-admin/training/modules/[moduleId]`**
- Updates module fields (title, description, order, active)

**`DELETE /api/super-admin/training/modules/[moduleId]`**
- Deletes module and cascading lessons/quiz questions
- Returns 400 if any users have progress records for this module (safety check)

### Lesson CRUD

**`POST /api/super-admin/training/modules/[moduleId]/lessons`**
- Creates a new lesson under the module
- Body: `{ id, title, type, content, videoUrl?, order }`

**`GET /api/super-admin/training/lessons/[lessonId]`**
- Returns lesson with all quiz questions ordered

**`PATCH /api/super-admin/training/lessons/[lessonId]`**
- Updates lesson fields

**`DELETE /api/super-admin/training/lessons/[lessonId]`**
- Deletes lesson and cascading quiz questions

### Quiz CRUD

**`GET /api/super-admin/training/quiz/[lessonId]`**
- Returns all quiz questions for a lesson, ordered

**`POST /api/super-admin/training/quiz/[lessonId]`**
- Creates a quiz question
- Body: `{ question, options, correctAnswer, explanation, order }`

**`PATCH /api/super-admin/training/quiz/[questionId]`**
- Updates a quiz question

**`DELETE /api/super-admin/training/quiz/[questionId]`**
- Deletes a quiz question

**`PUT /api/super-admin/training/quiz/[lessonId]/bulk`**
- Replaces all quiz questions for a lesson (used after AI generation)
- Body: `{ questions: [{ question, options, correctAnswer, explanation }] }`

### AI Quiz Generation

**`POST /api/super-admin/training/generate-quiz`**
- Body: `{ lessonContent: string, questionCount: number }`
- Calls Gemini (`gemini-1.5-flash`) with a structured prompt
- Prompt instructs the model to:
  - Read the lesson content
  - Generate N multiple-choice questions testing key concepts
  - Each question has 4 options, one correct answer, and an explanation
  - Return valid JSON array
- Returns: `{ questions: [{ question, options, correctAnswer, explanation }] }`
- Does NOT save to DB — admin reviews and saves separately

**Gemini Prompt Template:**
```
You are a training quiz generator. Based on the following lesson content, generate {questionCount} multiple-choice quiz questions.

Each question must:
- Test understanding of a key concept from the lesson
- Have exactly 4 options labelled A, B, C, D
- Have exactly one correct answer
- Include a brief explanation of why the correct answer is right

Return ONLY a valid JSON array with this structure:
[
  {
    "question": "...",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correctAnswer": "A) ...",
    "explanation": "..."
  }
]

Lesson content:
{lessonContent}
```

## Training Pages — Read from DB

### Changes to Existing Pages

The following pages currently import from `lib/training-data.ts` and `lib/careers-training-data.ts`. They will be updated to fetch from the database instead:

- `app/(dashboard)/training/page.tsx` — Module list (ASD)
- `app/(dashboard)/training/[moduleId]/page.tsx` — Lesson list
- `app/(dashboard)/training/[moduleId]/[lessonId]/page.tsx` — Lesson viewer + quiz
- `app/(dashboard)/careers/page.tsx` — Module list (Careers)
- `app/(dashboard)/careers/[moduleId]/[lessonId]/page.tsx` — Lesson viewer + quiz

### New Data Access Layer

Create `lib/training-db.ts` with functions that replace the old TS file helpers:

```typescript
getModules(type: ModuleType): Promise<Module[]>
getModuleById(moduleId: string): Promise<Module & { lessons: Lesson[] } | null>
getLessonById(lessonId: string): Promise<Lesson & { quizQuestions: QuizQuestion[] } | null>
getTotalLessons(): Promise<number>
getLessonCount(moduleId: string): Promise<number>
```

These mirror the existing helper function signatures so the training pages need minimal changes.

### Lesson Content Rendering

Lesson content is stored as HTML from the WYSIWYG editor. The lesson viewer page renders it with `dangerouslySetInnerHTML`. Since only super admins can create content, this is acceptable. The content is sanitised on save using a whitelist of allowed HTML tags.

## Content Migration

### Seed Script: `prisma/seed-training-content.ts`

1. Reads all modules and lessons from the existing TS files
2. Converts content to clean HTML:
   - `**bold**` → `<strong>bold</strong>`
   - `## heading` → `<h2>heading</h2>`
   - Markdown lists → `<ul><li>` / `<ol><li>`
   - Strips any remaining raw markdown syntax
   - Preserves existing HTML tags (some content already uses `<strong>`, `<p>`, etc.)
3. Inserts Module, Lesson, and QuizQuestion records
4. Uses `upsert` so it can be run multiple times safely (idempotent)
5. Preserves original IDs for TrainingProgress compatibility

Run after schema push: `npx tsx prisma/seed-training-content.ts`

## Sidebar Update

Add "Training Content" nav item to `components/layout/super-admin-sidebar.tsx`:

```typescript
{ href: '/super-admin/training', label: 'Training Content', icon: BookOpen }
```

Positioned between "Organisations" and "Announcements".

## Out of Scope

- Drag-and-drop reordering (use up/down arrow buttons instead)
- Image upload within the rich text editor (images can be linked via URL)
- Lesson versioning / revision history
- Video file upload (admin pastes a URL to YouTube, Vercel Blob, etc.)
- Bulk import/export of training content
- Student-facing content preview from the admin
