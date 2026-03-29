# Training Content Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move training content from hardcoded TS files to the database, build a super admin CRUD UI with WYSIWYG editing, and add AI-powered quiz generation via Gemini.

**Architecture:** New Prisma models (Module, Lesson, QuizQuestion) with a data access layer (`lib/training-db.ts`). Super admin pages under `/super-admin/training/` with React Quill for WYSIWYG editing. Existing training/careers pages updated to read from DB. Seed script migrates hardcoded content. Gemini generates quiz questions on demand.

**Tech Stack:** Next.js 14, Prisma, Neon PostgreSQL, React Quill (WYSIWYG), Google Gemini (`@google/genai`), Tailwind CSS, Lucide icons

---

## File Structure

### New Files
- `prisma/seed-training-content.ts` — migration script: TS files → DB
- `lib/training-db.ts` — DB access layer replacing TS file helpers
- `app/api/super-admin/training/modules/route.ts` — GET/POST modules
- `app/api/super-admin/training/modules/[moduleId]/route.ts` — GET/PATCH/DELETE module
- `app/api/super-admin/training/modules/[moduleId]/lessons/route.ts` — POST lesson
- `app/api/super-admin/training/lessons/[lessonId]/route.ts` — GET/PATCH/DELETE lesson
- `app/api/super-admin/training/quiz/[lessonId]/route.ts` — GET/POST quiz, PUT bulk
- `app/api/super-admin/training/quiz/question/[questionId]/route.ts` — PATCH/DELETE quiz question
- `app/api/super-admin/training/generate-quiz/route.ts` — POST AI quiz generation
- `app/(super-admin)/super-admin/training/page.tsx` — module list
- `app/(super-admin)/super-admin/training/[moduleId]/page.tsx` — module editor + lesson list
- `app/(super-admin)/super-admin/training/[moduleId]/[lessonId]/page.tsx` — lesson editor + quiz

### Modified Files
- `prisma/schema.prisma` — add Module, Lesson, QuizQuestion models + enums
- `components/layout/super-admin-sidebar.tsx` — add Training Content nav item
- `lib/modules.ts` — update to read module IDs from DB
- `app/(dashboard)/training/page.tsx` — read from DB instead of TS
- `app/(dashboard)/training/[moduleId]/[lessonId]/page.tsx` — read from DB, render HTML
- `app/(dashboard)/careers/page.tsx` — read from DB instead of TS
- `app/(dashboard)/careers/[moduleId]/[lessonId]/page.tsx` — read from DB, render HTML
- `package.json` — add `react-quill-new` dependency

---

### Task 1: Add Prisma Models and Push Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add enums and models to schema**

Add before the existing `Role` enum (before line 157) in `prisma/schema.prisma`:

```prisma
enum ModuleType {
  ASD
  CAREERS
}

enum LessonType {
  TEXT
  VIDEO
}

model Module {
  id          String     @id
  title       String
  description String
  type        ModuleType
  order       Int
  active      Boolean    @default(true)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
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
  question      String   @db.Text
  options       String   @db.Text
  correctAnswer String
  explanation   String   @db.Text
  order         Int
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  lesson        Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 2: Push schema to database**

```bash
cd "C:/Users/Simon/OneDrive/Documents/asd-training-app"
cp .env.local .env
# Ensure .env has DATABASE_URL and DIRECT_URL (add from memory if missing)
npx prisma db push
rm .env
```

Expected: "Your database is now in sync with your Prisma schema."

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add Module, Lesson, QuizQuestion models to Prisma schema"
```

---

### Task 2: Create Seed Script and Migrate Content

**Files:**
- Create: `prisma/seed-training-content.ts`

- [ ] **Step 1: Write the seed script**

Create `prisma/seed-training-content.ts`. This reads from the existing TS files, converts markdown to clean HTML, and upserts into the new tables.

```typescript
import { PrismaClient } from '@prisma/client'
import { TRAINING_MODULES } from '../lib/training-data'
import { CAREERS_MODULES } from '../lib/careers-training-data'

const prisma = new PrismaClient()

function markdownToHtml(text: string): string {
  let html = text
  // Convert markdown bold to <strong>
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  // Convert ### headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  // Convert ## headings
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  // Convert markdown bullet lists (lines starting with - or *)
  html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')
  // Convert numbered lists (lines starting with 1. 2. etc.)
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
  // Wrap in paragraphs: split on double newlines, wrap non-tag lines
  const blocks = html.split(/\n\n+/)
  html = blocks
    .map((block) => {
      const trimmed = block.trim()
      if (!trimmed) return ''
      if (/^<(h[1-6]|ul|ol|li|p|div|blockquote)/.test(trimmed)) return trimmed
      return `<p>${trimmed}</p>`
    })
    .filter(Boolean)
    .join('\n')
  // Clean up stray newlines inside tags
  html = html.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
  return html
}

async function main() {
  console.log('Seeding ASD modules...')
  for (const mod of TRAINING_MODULES) {
    await prisma.module.upsert({
      where: { id: mod.id },
      update: { title: mod.title, description: mod.description, type: 'ASD', order: mod.order },
      create: { id: mod.id, title: mod.title, description: mod.description, type: 'ASD', order: mod.order },
    })

    for (const lesson of mod.lessons) {
      const content = markdownToHtml(lesson.content)
      await prisma.lesson.upsert({
        where: { id: lesson.id },
        update: { title: lesson.title, type: lesson.type as 'TEXT' | 'VIDEO', content, videoUrl: lesson.videoUrl || null, order: lesson.order, moduleId: mod.id },
        create: { id: lesson.id, moduleId: mod.id, title: lesson.title, type: lesson.type as 'TEXT' | 'VIDEO', content, videoUrl: lesson.videoUrl || null, order: lesson.order },
      })

      // Delete existing quiz questions for this lesson then re-insert
      await prisma.quizQuestion.deleteMany({ where: { lessonId: lesson.id } })
      for (let i = 0; i < lesson.quizQuestions.length; i++) {
        const q = lesson.quizQuestions[i]
        await prisma.quizQuestion.create({
          data: {
            lessonId: lesson.id,
            question: q.question,
            options: JSON.stringify(q.options),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            order: i + 1,
          },
        })
      }
    }
    console.log(`  ✓ ${mod.title} (${mod.lessons.length} lessons)`)
  }

  console.log('Seeding Careers modules...')
  for (const mod of CAREERS_MODULES) {
    await prisma.module.upsert({
      where: { id: mod.id },
      update: { title: mod.title, description: mod.description, type: 'CAREERS', order: mod.order },
      create: { id: mod.id, title: mod.title, description: mod.description, type: 'CAREERS', order: mod.order },
    })

    for (const lesson of mod.lessons) {
      const content = markdownToHtml(lesson.content)
      await prisma.lesson.upsert({
        where: { id: lesson.id },
        update: { title: lesson.title, type: lesson.type as 'TEXT' | 'VIDEO', content, videoUrl: lesson.videoUrl || null, order: lesson.order, moduleId: mod.id },
        create: { id: lesson.id, moduleId: mod.id, title: lesson.title, type: lesson.type as 'TEXT' | 'VIDEO', content, videoUrl: lesson.videoUrl || null, order: lesson.order },
      })

      await prisma.quizQuestion.deleteMany({ where: { lessonId: lesson.id } })
      for (let i = 0; i < lesson.quizQuestions.length; i++) {
        const q = lesson.quizQuestions[i]
        await prisma.quizQuestion.create({
          data: {
            lessonId: lesson.id,
            question: q.question,
            options: JSON.stringify(q.options),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            order: i + 1,
          },
        })
      }
    }
    console.log(`  ✓ ${mod.title} (${mod.lessons.length} lessons)`)
  }

  console.log('Seed complete.')
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Run the seed script**

```bash
cd "C:/Users/Simon/OneDrive/Documents/asd-training-app"
cp .env.local .env
npx tsx prisma/seed-training-content.ts
rm .env
```

Expected: Each module logged with lesson count, "Seed complete." at end.

- [ ] **Step 3: Commit**

```bash
git add prisma/seed-training-content.ts
git commit -m "feat: add training content seed script and migrate data to DB"
```

---

### Task 3: Create Data Access Layer

**Files:**
- Create: `lib/training-db.ts`

- [ ] **Step 1: Write training-db.ts**

```typescript
import prisma from './prisma'
import type { Module, Lesson, QuizQuestion, ModuleType } from '@prisma/client'

export type ModuleWithLessons = Module & {
  lessons: (Lesson & { _count: { quizQuestions: number } })[]
}

export type LessonWithQuiz = Lesson & {
  quizQuestions: QuizQuestion[]
}

export async function getModules(type: ModuleType): Promise<Module[]> {
  return prisma.module.findMany({
    where: { type, active: true },
    orderBy: { order: 'asc' },
  })
}

export async function getAllModules(): Promise<(Module & { _count: { lessons: number } })[]> {
  return prisma.module.findMany({
    orderBy: [{ type: 'asc' }, { order: 'asc' }],
    include: { _count: { select: { lessons: true } } },
  })
}

export async function getModuleById(moduleId: string): Promise<ModuleWithLessons | null> {
  return prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      lessons: {
        orderBy: { order: 'asc' },
        include: { _count: { select: { quizQuestions: true } } },
      },
    },
  })
}

export async function getModuleByIdActive(moduleId: string): Promise<ModuleWithLessons | null> {
  return prisma.module.findFirst({
    where: { id: moduleId, active: true },
    include: {
      lessons: {
        where: { active: true },
        orderBy: { order: 'asc' },
        include: { _count: { select: { quizQuestions: true } } },
      },
    },
  })
}

export async function getLessonById(lessonId: string): Promise<LessonWithQuiz | null> {
  return prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      quizQuestions: { orderBy: { order: 'asc' } },
    },
  })
}

export async function getLessonByIdActive(lessonId: string): Promise<LessonWithQuiz | null> {
  return prisma.lesson.findFirst({
    where: { id: lessonId, active: true },
    include: {
      quizQuestions: { orderBy: { order: 'asc' } },
    },
  })
}

export async function getTotalActiveLessons(): Promise<number> {
  return prisma.lesson.count({
    where: { active: true, module: { active: true } },
  })
}

export async function getActiveLessonCount(moduleId: string): Promise<number> {
  return prisma.lesson.count({
    where: { moduleId, active: true },
  })
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd "C:/Users/Simon/OneDrive/Documents/asd-training-app"
npx tsc --noEmit lib/training-db.ts --skipLibCheck 2>&1 || npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add lib/training-db.ts
git commit -m "feat: add training DB access layer (lib/training-db.ts)"
```

---

### Task 4: Module CRUD API Routes

**Files:**
- Create: `app/api/super-admin/training/modules/route.ts`
- Create: `app/api/super-admin/training/modules/[moduleId]/route.ts`

- [ ] **Step 1: Create modules list/create route**

Create `app/api/super-admin/training/modules/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isSuperAdmin } from '@/lib/rbac'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const modules = await prisma.module.findMany({
    orderBy: [{ type: 'asc' }, { order: 'asc' }],
    include: { _count: { select: { lessons: true } } },
  })
  return NextResponse.json(modules)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id, title, description, type, order } = body

  if (!id || !title || !description || !type) {
    return NextResponse.json({ error: 'Missing required fields: id, title, description, type' }, { status: 400 })
  }
  if (!['ASD', 'CAREERS'].includes(type)) {
    return NextResponse.json({ error: 'type must be ASD or CAREERS' }, { status: 400 })
  }

  const existing = await prisma.module.findUnique({ where: { id } })
  if (existing) return NextResponse.json({ error: 'Module ID already exists' }, { status: 409 })

  const finalOrder = order ?? (await prisma.module.count({ where: { type } })) + 1

  const module = await prisma.module.create({
    data: { id, title, description, type, order: finalOrder },
  })
  return NextResponse.json(module, { status: 201 })
}
```

- [ ] **Step 2: Create single module route**

Create `app/api/super-admin/training/modules/[moduleId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isSuperAdmin } from '@/lib/rbac'

export async function GET(_req: NextRequest, { params }: { params: { moduleId: string } }) {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const module = await prisma.module.findUnique({
    where: { id: params.moduleId },
    include: {
      lessons: {
        orderBy: { order: 'asc' },
        include: { _count: { select: { quizQuestions: true } } },
      },
    },
  })
  if (!module) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(module)
}

export async function PATCH(req: NextRequest, { params }: { params: { moduleId: string } }) {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { title, description, order, active } = body

  const data: Record<string, unknown> = {}
  if (title !== undefined) data.title = title
  if (description !== undefined) data.description = description
  if (order !== undefined) data.order = order
  if (active !== undefined) data.active = active

  const module = await prisma.module.update({
    where: { id: params.moduleId },
    data,
  })
  return NextResponse.json(module)
}

export async function DELETE(_req: NextRequest, { params }: { params: { moduleId: string } }) {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const progressCount = await prisma.trainingProgress.count({
    where: { moduleId: params.moduleId },
  })
  if (progressCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${progressCount} progress records reference this module. Deactivate it instead.` },
      { status: 400 }
    )
  }

  await prisma.module.delete({ where: { id: params.moduleId } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/super-admin/training/modules/
git commit -m "feat: add module CRUD API routes"
```

---

### Task 5: Lesson CRUD API Routes

**Files:**
- Create: `app/api/super-admin/training/modules/[moduleId]/lessons/route.ts`
- Create: `app/api/super-admin/training/lessons/[lessonId]/route.ts`

- [ ] **Step 1: Create lesson creation route**

Create `app/api/super-admin/training/modules/[moduleId]/lessons/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isSuperAdmin } from '@/lib/rbac'

export async function POST(req: NextRequest, { params }: { params: { moduleId: string } }) {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const module = await prisma.module.findUnique({ where: { id: params.moduleId } })
  if (!module) return NextResponse.json({ error: 'Module not found' }, { status: 404 })

  const body = await req.json()
  const { id, title, type, content, videoUrl, order } = body

  if (!id || !title || !type || content === undefined) {
    return NextResponse.json({ error: 'Missing required fields: id, title, type, content' }, { status: 400 })
  }
  if (!['TEXT', 'VIDEO'].includes(type)) {
    return NextResponse.json({ error: 'type must be TEXT or VIDEO' }, { status: 400 })
  }

  const existing = await prisma.lesson.findUnique({ where: { id } })
  if (existing) return NextResponse.json({ error: 'Lesson ID already exists' }, { status: 409 })

  const finalOrder = order ?? (await prisma.lesson.count({ where: { moduleId: params.moduleId } })) + 1

  const lesson = await prisma.lesson.create({
    data: { id, moduleId: params.moduleId, title, type, content, videoUrl: videoUrl || null, order: finalOrder },
  })
  return NextResponse.json(lesson, { status: 201 })
}
```

- [ ] **Step 2: Create single lesson route**

Create `app/api/super-admin/training/lessons/[lessonId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isSuperAdmin } from '@/lib/rbac'

export async function GET(_req: NextRequest, { params }: { params: { lessonId: string } }) {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const lesson = await prisma.lesson.findUnique({
    where: { id: params.lessonId },
    include: { quizQuestions: { orderBy: { order: 'asc' } }, module: true },
  })
  if (!lesson) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(lesson)
}

export async function PATCH(req: NextRequest, { params }: { params: { lessonId: string } }) {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { title, type, content, videoUrl, order, active } = body

  const data: Record<string, unknown> = {}
  if (title !== undefined) data.title = title
  if (type !== undefined) data.type = type
  if (content !== undefined) data.content = content
  if (videoUrl !== undefined) data.videoUrl = videoUrl || null
  if (order !== undefined) data.order = order
  if (active !== undefined) data.active = active

  const lesson = await prisma.lesson.update({
    where: { id: params.lessonId },
    data,
  })
  return NextResponse.json(lesson)
}

export async function DELETE(_req: NextRequest, { params }: { params: { lessonId: string } }) {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.lesson.delete({ where: { id: params.lessonId } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/super-admin/training/modules/[moduleId]/lessons/ app/api/super-admin/training/lessons/
git commit -m "feat: add lesson CRUD API routes"
```

---

### Task 6: Quiz CRUD and AI Generation API Routes

**Files:**
- Create: `app/api/super-admin/training/quiz/[lessonId]/route.ts`
- Create: `app/api/super-admin/training/quiz/question/[questionId]/route.ts`
- Create: `app/api/super-admin/training/generate-quiz/route.ts`

- [ ] **Step 1: Create quiz list/create/bulk route**

Create `app/api/super-admin/training/quiz/[lessonId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isSuperAdmin } from '@/lib/rbac'

export async function GET(_req: NextRequest, { params }: { params: { lessonId: string } }) {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const questions = await prisma.quizQuestion.findMany({
    where: { lessonId: params.lessonId },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json(questions)
}

export async function POST(req: NextRequest, { params }: { params: { lessonId: string } }) {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const lesson = await prisma.lesson.findUnique({ where: { id: params.lessonId } })
  if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })

  const body = await req.json()
  const { question, options, correctAnswer, explanation, order } = body

  if (!question || !options || !correctAnswer || !explanation) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const finalOrder = order ?? (await prisma.quizQuestion.count({ where: { lessonId: params.lessonId } })) + 1
  const optionsStr = typeof options === 'string' ? options : JSON.stringify(options)

  const q = await prisma.quizQuestion.create({
    data: { lessonId: params.lessonId, question, options: optionsStr, correctAnswer, explanation, order: finalOrder },
  })
  return NextResponse.json(q, { status: 201 })
}

// PUT = bulk replace all quiz questions for this lesson
export async function PUT(req: NextRequest, { params }: { params: { lessonId: string } }) {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const lesson = await prisma.lesson.findUnique({ where: { id: params.lessonId } })
  if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })

  const body = await req.json()
  const { questions } = body
  if (!Array.isArray(questions)) {
    return NextResponse.json({ error: 'questions must be an array' }, { status: 400 })
  }

  await prisma.quizQuestion.deleteMany({ where: { lessonId: params.lessonId } })

  const created = []
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    const optionsStr = typeof q.options === 'string' ? q.options : JSON.stringify(q.options)
    const record = await prisma.quizQuestion.create({
      data: {
        lessonId: params.lessonId,
        question: q.question,
        options: optionsStr,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        order: i + 1,
      },
    })
    created.push(record)
  }
  return NextResponse.json(created)
}
```

- [ ] **Step 2: Create single question route**

Create `app/api/super-admin/training/quiz/question/[questionId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isSuperAdmin } from '@/lib/rbac'

export async function PATCH(req: NextRequest, { params }: { params: { questionId: string } }) {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { question, options, correctAnswer, explanation, order } = body

  const data: Record<string, unknown> = {}
  if (question !== undefined) data.question = question
  if (options !== undefined) data.options = typeof options === 'string' ? options : JSON.stringify(options)
  if (correctAnswer !== undefined) data.correctAnswer = correctAnswer
  if (explanation !== undefined) data.explanation = explanation
  if (order !== undefined) data.order = order

  const q = await prisma.quizQuestion.update({
    where: { id: params.questionId },
    data,
  })
  return NextResponse.json(q)
}

export async function DELETE(_req: NextRequest, { params }: { params: { questionId: string } }) {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.quizQuestion.delete({ where: { id: params.questionId } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Create AI quiz generation route**

Create `app/api/super-admin/training/generate-quiz/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { GoogleGenAI } from '@google/genai'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })
  }

  const body = await req.json()
  const { lessonContent, questionCount } = body

  if (!lessonContent || typeof lessonContent !== 'string') {
    return NextResponse.json({ error: 'lessonContent is required' }, { status: 400 })
  }
  const count = Math.min(Math.max(parseInt(questionCount) || 5, 1), 10)

  // Strip HTML tags for cleaner prompt
  const plainText = lessonContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  const prompt = `You are a training quiz generator. Based on the following lesson content, generate ${count} multiple-choice quiz questions.

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
${plainText}`

  try {
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt })
    const text = response.text ?? ''

    // Extract JSON from response (may be wrapped in ```json blocks)
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI did not return valid JSON', raw: text }, { status: 500 })
    }

    const questions = JSON.parse(jsonMatch[0])
    return NextResponse.json({ questions })
  } catch (error) {
    console.error('Quiz generation failed:', error)
    return NextResponse.json({ error: 'Quiz generation failed' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/super-admin/training/quiz/ app/api/super-admin/training/generate-quiz/
git commit -m "feat: add quiz CRUD and AI quiz generation API routes"
```

---

### Task 7: Install React Quill and Update Sidebar

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `components/layout/super-admin-sidebar.tsx`

- [ ] **Step 1: Install react-quill-new**

`react-quill` is unmaintained; `react-quill-new` is the active fork compatible with React 18.

```bash
cd "C:/Users/Simon/OneDrive/Documents/asd-training-app"
npm install react-quill-new
```

- [ ] **Step 2: Add Training Content to sidebar**

In `components/layout/super-admin-sidebar.tsx`, add `BookOpen` to the imports and a new nav item:

Add `BookOpen` to the lucide-react import (line 7):
```typescript
import {
  LayoutDashboard,
  Building2,
  BookOpen,
  Megaphone,
  BarChart3,
  LogOut,
  X,
  Crown,
} from 'lucide-react'
```

Update the `NAV_ITEMS` array (line 24) to include Training Content between Organisations and Announcements:
```typescript
const NAV_ITEMS: NavItem[] = [
  { href: '/super-admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/super-admin/organisations', label: 'Organisations', icon: Building2 },
  { href: '/super-admin/training', label: 'Training Content', icon: BookOpen },
  { href: '/super-admin/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/super-admin/reports', label: 'Reports', icon: BarChart3 },
]
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json components/layout/super-admin-sidebar.tsx
git commit -m "feat: install react-quill-new and add Training Content to sidebar"
```

---

### Task 8: Super Admin Module List Page

**Files:**
- Create: `app/(super-admin)/super-admin/training/page.tsx`

- [ ] **Step 1: Create the module list page**

Create `app/(super-admin)/super-admin/training/page.tsx` — a client component that fetches modules from the API and displays them in two sections (ASD and Careers). Includes add module dialog, toggle active, reorder, and edit/view links.

This is a large page (~350 lines). Key elements:
- Fetches `GET /api/super-admin/training/modules` on mount
- Groups modules by `type` (ASD vs CAREERS)
- Each module card shows: title, description (truncated), lesson count badge, active/inactive badge
- "Add Module" button opens inline form with fields: ID, title, description
- Edit button links to `/super-admin/training/[moduleId]`
- Toggle active via `PATCH /api/super-admin/training/modules/[moduleId]`
- Up/down arrows call PATCH to swap order values
- Styling matches existing super admin pages (purple accents, dark mode support)

The full component code should follow the patterns established in `app/(super-admin)/super-admin/organisations/page.tsx` — use `useState` for data/loading, `useEffect` for fetch, and inline forms with the existing card/button styling.

- [ ] **Step 2: Verify page loads**

```bash
cd "C:/Users/Simon/OneDrive/Documents/asd-training-app"
npm run dev
```

Navigate to `http://localhost:3000/super-admin/training` — should show all 9 modules in two groups.

- [ ] **Step 3: Commit**

```bash
git add app/(super-admin)/super-admin/training/page.tsx
git commit -m "feat: add super admin training module list page"
```

---

### Task 9: Module Editor Page (Lesson List)

**Files:**
- Create: `app/(super-admin)/super-admin/training/[moduleId]/page.tsx`

- [ ] **Step 1: Create the module editor page**

Create `app/(super-admin)/super-admin/training/[moduleId]/page.tsx` — client component that:
- Fetches module details via `GET /api/super-admin/training/modules/[moduleId]`
- Shows editable title and description fields with save button (PATCH)
- Lists all lessons as cards with: title, type badge (TEXT/VIDEO), active badge, quiz question count
- "Add Lesson" button with inline form: ID, title, type dropdown, content (textarea for now — full WYSIWYG is in the lesson editor)
- Edit button links to `/super-admin/training/[moduleId]/[lessonId]`
- Toggle active, reorder with up/down arrows
- Back link to `/super-admin/training`

Follow the same pattern as the organisations detail page (`app/(super-admin)/super-admin/organisations/[orgId]/page.tsx`).

- [ ] **Step 2: Verify page loads**

Navigate to `http://localhost:3000/super-admin/training/module-1` — should show Module 1 with its 3 lessons.

- [ ] **Step 3: Commit**

```bash
git add "app/(super-admin)/super-admin/training/[moduleId]/page.tsx"
git commit -m "feat: add module editor page with lesson list"
```

---

### Task 10: Lesson Editor Page with WYSIWYG and Quiz Management

**Files:**
- Create: `app/(super-admin)/super-admin/training/[moduleId]/[lessonId]/page.tsx`

- [ ] **Step 1: Create the lesson editor page**

Create `app/(super-admin)/super-admin/training/[moduleId]/[lessonId]/page.tsx` — the most complex page. Client component with:

**Lesson editing section:**
- Title input, type dropdown (TEXT/VIDEO), video URL input (shown when type=VIDEO)
- React Quill WYSIWYG editor loaded via `dynamic(() => import('react-quill-new'), { ssr: false })`
- Import the Quill CSS: `import 'react-quill-new/dist/quill.snow.css'`
- Quill toolbar config: `[['bold', 'italic', 'underline'], [{ header: [2, 3, false] }], [{ list: 'ordered' }, { list: 'bullet' }], ['link'], ['clean']]`
- Save button calls `PATCH /api/super-admin/training/lessons/[lessonId]`

**Quiz section:**
- Lists existing quiz questions as collapsible cards showing question, options (correct answer highlighted green), explanation
- Each question has Edit and Delete buttons
- Edit opens inline form with: question text, 4 option inputs, correct answer dropdown, explanation textarea
- "Add Question" button with same inline form
- **"Generate Quiz with AI" button:**
  - Shows a number input (3-10, default 5)
  - Calls `POST /api/super-admin/training/generate-quiz` with `{ lessonContent, questionCount }`
  - Shows loading spinner while generating
  - Displays preview of generated questions in editable cards
  - "Save All" button calls `PUT /api/super-admin/training/quiz/[lessonId]` with the questions
  - If existing questions, shows warning: "This will replace N existing questions. Continue?"
- Back link to `/super-admin/training/[moduleId]`

- [ ] **Step 2: Verify WYSIWYG and quiz generation**

Navigate to `http://localhost:3000/super-admin/training/module-1/lesson-1-1`:
- WYSIWYG editor should load with lesson content as HTML
- Can bold, add headings, lists
- Quiz section should show existing quiz questions
- "Generate Quiz with AI" should call Gemini and show preview

- [ ] **Step 3: Commit**

```bash
git add "app/(super-admin)/super-admin/training/[moduleId]/[lessonId]/page.tsx"
git commit -m "feat: add lesson editor with WYSIWYG and AI quiz generation"
```

---

### Task 11: Update Training Pages to Read from Database

**Files:**
- Modify: `app/(dashboard)/training/page.tsx`
- Modify: `app/(dashboard)/training/[moduleId]/[lessonId]/page.tsx`
- Modify: `app/(dashboard)/careers/page.tsx`
- Modify: `app/(dashboard)/careers/[moduleId]/[lessonId]/page.tsx`

- [ ] **Step 1: Update ASD training hub page**

In `app/(dashboard)/training/page.tsx`:
- Remove import of `TRAINING_MODULES` from `lib/training-data`
- Import `getModules` from `lib/training-db`
- Fetch modules: `const modules = await getModules('ASD')`
- Replace `TRAINING_MODULES` references with `modules`
- The module shape is compatible (id, title, description, order) — lessons are not loaded on this page, only the count via a separate query or include

- [ ] **Step 2: Update ASD lesson viewer page**

In `app/(dashboard)/training/[moduleId]/[lessonId]/page.tsx`:
- Remove imports from `lib/training-data`
- Import `getModuleByIdActive`, `getLessonByIdActive` from `lib/training-db`
- Fetch lesson: `const lesson = await getLessonByIdActive(lessonId)` (or fetch in useEffect since it's a client component)
- Replace the markdown `renderContent()` function with `dangerouslySetInnerHTML={{ __html: lesson.content }}` since content is now HTML
- Quiz questions: `lesson.quizQuestions` already included, parse `options` from JSON string: `JSON.parse(q.options)`

- [ ] **Step 3: Update Careers hub page**

In `app/(dashboard)/careers/page.tsx`:
- Remove import of `CAREERS_MODULES` from `lib/careers-training-data`
- Import `getModules` from `lib/training-db`
- Fetch modules: `const modules = await getModules('CAREERS')`

- [ ] **Step 4: Update Careers lesson viewer page**

In `app/(dashboard)/careers/[moduleId]/[lessonId]/page.tsx`:
- Same changes as step 2 but for the careers lesson viewer
- Remove imports from `lib/careers-training-data`
- Use `getLessonByIdActive` and render HTML content with `dangerouslySetInnerHTML`
- Parse quiz question options from JSON

- [ ] **Step 5: Verify both training areas work**

```bash
npm run dev
```

- Navigate to `/training` as a CAREGIVER — should see ASD modules from DB
- Open a lesson — content should render as HTML, quiz should work
- Navigate to `/careers` as CAREER_DEV_OFFICER — should see Careers modules from DB
- Open a careers lesson — same verification

- [ ] **Step 6: Commit**

```bash
git add app/(dashboard)/training/ app/(dashboard)/careers/
git commit -m "feat: update training and careers pages to read from database"
```

---

### Task 12: Update lib/modules.ts to Read from DB

**Files:**
- Modify: `lib/modules.ts`

- [ ] **Step 1: Update module ID helpers**

The existing `lib/modules.ts` has hardcoded module ID arrays. These need to work with DB content. Since `getEffectiveModules`, `hasAsdAccess`, and `hasCareersAccess` are called from server components, they can be made async and query the DB. However, since they're also used in client components, keep the current approach of passing module IDs around — the IDs still follow the same naming convention (`module-*` for ASD, `careers-module-*` for Careers).

The hardcoded `ASD_MODULE_IDS` and `CAREERS_MODULE_IDS` arrays are used as fallback defaults. Keep them as-is for backward compatibility — they match what's in the DB. The helper functions (`getEffectiveModules`, `hasAsdAccess`, `hasCareersAccess`) work on ID strings regardless of source.

No code changes needed — the existing module ID constants match the seeded DB IDs, and the helper functions operate on string arrays passed to them.

- [ ] **Step 2: Commit (skip if no changes)**

If changes were needed:
```bash
git add lib/modules.ts
git commit -m "refactor: update modules.ts for DB-backed content"
```

---

### Task 13: Build, Type-Check, and Deploy

**Files:** None new — verification only

- [ ] **Step 1: Type-check**

```bash
cd "C:/Users/Simon/OneDrive/Documents/asd-training-app"
npx tsc --noEmit
```

Fix any type errors.

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: Clean build with no errors.

- [ ] **Step 3: Push and deploy**

```bash
git push origin main
npx vercel deploy --prod
```

- [ ] **Step 4: Run seed script on production**

```bash
cp .env.local .env
npx tsx prisma/seed-training-content.ts
rm .env
```

(Uses production DATABASE_URL from .env.local pulled from Vercel)

- [ ] **Step 5: Post-deploy verification**

- Login as super admin → navigate to `/super-admin/training`
- Verify all 9 modules listed (5 ASD + 4 Careers)
- Click into a module → verify lessons listed
- Click into a lesson → verify WYSIWYG editor loads with content
- Click "Generate Quiz with AI" → verify Gemini generates questions
- Save a quiz → verify questions persist
- Navigate to `/training` as a regular user → verify modules load from DB
- Open a lesson → verify content renders and quiz works
