# AI Content Generation — Design Spec

**Date:** 2026-03-30
**Status:** Draft
**Feature:** Two-mode AI content generation from uploaded files for the super admin training CMS

---

## Summary

Add two AI-powered content generation modes to the existing Training Content page (`/super-admin/training`). Both modes accept file uploads (PDF, DOCX, PPTX), extract text server-side, and use Gemini to produce a full training program (modules, lessons, quizzes) that the super admin previews, edits, and saves.

- **Structure Mode** — Organises uploaded material into modules/lessons/quizzes while preserving the original wording verbatim. No content is added, removed, or paraphrased.
- **Generate Mode** — Reads uploaded material and creates original training content with a lens choice:
  - **Autism Lens** — Written for autistic learners: clear, literal language, structured layouts, concrete examples, no idioms.
  - **Practitioner Lens** — Written for caregivers/practitioners: professional but accessible, practical strategies, case examples, reflection prompts.

---

## UI Flow

### Entry Point

Two new buttons on the Training Content page (`/super-admin/training`), alongside existing program management:

- **"Import from Files"** — opens the modal in Structure Mode
- **"Generate from Files"** — opens the modal in Generate Mode

### Modal Step 1: Upload & Configure

- **File drop zone** — drag-and-drop or click to select. Accepts `.pdf`, `.docx`, `.pptx`. Multiple files allowed. No file size cap enforced client-side; server rejects files it cannot parse.
- **Program name** field — user names the new program (e.g., "Safeguarding Level 2").
- **Mode-specific options:**
  - Structure Mode: no extra options.
  - Generate Mode: a toggle — "Autism Lens" or "Practitioner Lens".
- **"Process Files"** button to begin.

### Modal Step 2: Processing (with progress)

Progress indicator with status messages streamed from the server:

1. "Parsing files..."
2. "Creating outline..."
3. "Generating lesson X of Y..."
4. "Generating quizzes for lesson X of Y..."

### Modal Step 3: Preview & Edit

Full editable preview of the proposed program:

- **Program name** — editable text field.
- **Modules list** — each expandable, showing:
  - Module title (editable)
  - Lessons within, each expandable:
    - Lesson title (editable)
    - Lesson content (editable via rich text editor — React Quill, matching existing editor)
    - Quiz questions (editable — question text, four options, correct answer, explanation)
  - Failed lessons shown with error badge and options:
    - **"Retry"** — re-run generation for that lesson
    - **"Upload additional files"** — parse new documents and regenerate failed/incomplete lessons while preserving successfully generated content
- Ability to **delete** modules, lessons, or questions.
- Ability to **reorder** modules and lessons (up/down arrows, matching existing UI).
- **"Save Program"** button to persist everything.

### Modal Step 4: Confirmation

Success message with a link to view the new program in the existing training content editor.

---

## File Parsing

Server-side extraction using Node.js libraries. Files are parsed in memory and discarded — no blob storage required.

| Format | Library | Extraction |
|--------|---------|------------|
| PDF | `pdf-parse` | Full text, page breaks as section boundaries |
| DOCX | `mammoth` | HTML output preserving headings (H1–H3), lists, bold — headings define sections |
| PPTX | `pptx-parser` | Slide titles + slide text, each slide as a logical section |

**Multi-file handling:** Files parsed in upload order. Results concatenated with file-boundary markers so Gemini can reference source locations.

**Parsed output structure per file:**

```typescript
interface ParsedFile {
  filename: string;
  format: 'pdf' | 'docx' | 'pptx';
  sections: Array<{
    heading?: string;
    content: string;
  }>;
}
```

---

## Three-Phase Gemini Processing

All Gemini calls use the existing `gemini-2.5-flash` model via `@google/genai` (same as existing quiz generation).

### Phase 1: Outline Generation

Single Gemini call. Receives the full extracted text and returns a proposed structure.

**Structure Mode prompt direction:** Identify logical groupings in the source material. Propose module and lesson titles. Map each lesson to specific sections of the source text via `sourceRef`. Do not invent content — only organise what exists.

**Generate Mode prompt direction:** Read and understand the source material. Propose a pedagogically sound module/lesson structure. Map each lesson to which parts of the source inform it via `sourceRef`.

**Output schema:**

```typescript
interface GeneratedOutline {
  programName: string;
  modules: Array<{
    title: string;
    description: string;
    lessons: Array<{
      title: string;
      sourceRefs: Array<{
        fileIndex: number;       // 0-based index into ParsedFile[]
        sectionIndices: number[]; // 0-based indices into that file's sections[]
      }>;
    }>;
  }>;
}
```

The `sourceRefs` use numeric indices rather than free-text descriptions, ensuring deterministic mapping from outline back to parsed content. The content-generation phase uses these indices to extract the exact source sections for each lesson.

### Phase 2: Lesson Content Generation

One Gemini call per lesson, iterating through the outline.

**Structure Mode prompt direction:** "Format this content as a training lesson. Use the original wording exactly as it appears in the source material. Do not add, remove, or paraphrase any content. Only add HTML formatting (headings, lists, paragraphs) for readability."

**Generate Mode prompt direction (Autism Lens):** "Generate a training lesson for autistic learners based on the following source material. Use clear, literal language. Avoid idioms, metaphors, and ambiguity. Use bullet points and structured layouts. Include concrete examples. Output as HTML."

**Generate Mode prompt direction (Practitioner Lens):** "Generate a training lesson for practitioners and caregivers working with autistic individuals. Use professional but accessible language. Include practical strategies, case examples, and reflection prompts. Output as HTML."

Each call receives only the relevant source sections (identified by `sourceRef` from Phase 1), not the entire document.

### Phase 3: Quiz Generation

One Gemini call per lesson after its content is generated. Reuses the existing quiz generation logic from `POST /api/super-admin/training/generate-quiz`. 5 questions per lesson. Each question has 4 options (A–D), a correct answer, and an explanation.

**Structure Mode:** Quizzes test comprehension of the original material.

**Generate Mode:** Quizzes match the chosen lens — testing understanding appropriate to the target audience.

---

## API Routes

All routes under `/api/super-admin/training/`. All require SUPER_ADMIN role.

### `POST /api/super-admin/training/parse-files`

- **Input:** `multipart/form-data` — uploaded files
- **Output:** `{ files: ParsedFile[] }`
- **Errors:** 400 for unsupported format, 400 for corrupt/unreadable file (identifies which file), 413 for unparseable size
- **Why separate:** Parsing is fast and deterministic. Fail fast before touching Gemini.

### `POST /api/super-admin/training/generate-outline`

- **Input:** `{ parsedContent: ParsedFile[], mode: 'structure' | 'generate', lens?: 'autism' | 'practitioner', programName: string }`
- **Output:** `GeneratedOutline` (JSON response)
- **Errors:** 500 for Gemini failure (after 3 retries with exponential backoff), 400 for missing/invalid params

### `POST /api/super-admin/training/generate-content`

- **Input:** `{ outline: GeneratedOutline, parsedContent: ParsedFile[], mode: 'structure' | 'generate', lens?: 'autism' | 'practitioner' }`
- **Output:** Server-Sent Events stream. Events:
  - `{ type: 'progress', lesson: number, total: number, phase: 'content' | 'quiz' }`
  - `{ type: 'lesson-complete', moduleIndex: number, lessonIndex: number, content: string }`
  - `{ type: 'quiz-complete', moduleIndex: number, lessonIndex: number, questions: QuizQuestion[] }`
  - `{ type: 'lesson-error', moduleIndex: number, lessonIndex: number, error: string }`
  - `{ type: 'complete', program: GeneratedProgram }`
- **Errors:** Per-lesson errors are streamed as `lesson-error` events. The stream continues past failures.

### `POST /api/super-admin/training/save-program`

- **Input:** The full `GeneratedProgram` structure after preview/editing:

```typescript
interface GeneratedProgram {
  programName: string;
  modules: Array<{
    title: string;
    description: string;
    order: number;
    lessons: Array<{
      title: string;
      content: string; // HTML
      order: number;
      quizQuestions: Array<{
        question: string;
        options: string; // JSON string of 4 options
        correctAnswer: string;
        explanation: string;
        order: number;
      }>;
    }>;
  }>;
}
```

- **Output:** `{ programId: string }`
- **Behaviour:** Creates `TrainingProgram` (status: `DRAFT`), `Module` (active: `false`), `Lesson` (active: `false`, type: `TEXT`), and `QuizQuestion` records in a single Prisma transaction.
- **Errors:** 500 with full rollback on any failure. Preview data stays intact on the client for retry.

### `POST /api/super-admin/training/parse-and-regenerate`

- **Input:** `multipart/form-data` — new files, plus JSON fields: `{ existingProgram: GeneratedProgram, failedLessons: Array<{ moduleIndex, lessonIndex }>, mode, lens? }`
- **Output:** Same SSE stream as `generate-content`, but only for the failed/targeted lessons. Successfully generated content is untouched.
- **Purpose:** Supports the "upload additional files to complete modules" workflow on partial failures.

---

## Data Model

**No schema changes.** Uses existing models:

- `TrainingProgram` — new program, `status: DRAFT`
- `Module` — `active: false`, `order` set by AI structure
- `Lesson` — `active: false`, `type: TEXT`, content as HTML
- `QuizQuestion` — same structure as existing AI-generated quizzes

**Not stored:**
- Original uploaded files — parsed in memory, discarded
- Parsed text — ephemeral, passed between API calls via the client

Generated programs are invisible to learners until the super admin reviews and activates via the existing training content management UI.

---

## New Dependencies

| Package | Purpose | Size | Server-only |
|---------|---------|------|-------------|
| `pdf-parse` | PDF text extraction | ~50KB | Yes |
| `mammoth` | DOCX to HTML conversion | ~200KB | Yes |
| `pptx-parser` | PPTX text/slide extraction | ~30KB | Yes |

No other dependencies. AI uses existing `@google/genai`. SSE uses native `ReadableStream`. File uploads use Next.js built-in `request.formData()`.

---

## Error Handling

| Failure | Behaviour |
|---------|-----------|
| Unsupported file format | Reject at parse step: "Only PDF, DOCX, and PPTX files are supported" |
| Corrupt/unreadable file | Reject at parse step, identify which file failed |
| File too large for memory | Reject at parse step: "File too large to process. Try splitting into smaller documents" |
| Gemini rate limit / API error | Retry up to 3 times with exponential backoff, then surface error with "Try again" |
| Gemini returns malformed JSON | Retry once, then surface error |
| Partial generation failure | Show successfully generated content. Mark failed lessons with error badge. Offer "Retry" and "Upload additional files" options |
| Save transaction fails | Full rollback. Preview stays intact for retry |

---

## File Summary

New files to create:

| File | Purpose |
|------|---------|
| `lib/file-parser.ts` | Server-side PDF/DOCX/PPTX parsing logic |
| `lib/content-generator.ts` | Gemini prompts and orchestration for outline, content, and quiz generation |
| `app/api/super-admin/training/parse-files/route.ts` | File upload and parsing endpoint |
| `app/api/super-admin/training/generate-outline/route.ts` | Outline generation endpoint |
| `app/api/super-admin/training/generate-content/route.ts` | Lesson + quiz generation SSE endpoint |
| `app/api/super-admin/training/save-program/route.ts` | Program save endpoint (Prisma transaction) |
| `app/api/super-admin/training/parse-and-regenerate/route.ts` | Supplementary file upload + regeneration endpoint |
| `components/super-admin/content-generation-modal.tsx` | Main modal component (upload, progress, preview) |
| `components/super-admin/file-drop-zone.tsx` | Drag-and-drop file upload component |
| `components/super-admin/program-preview.tsx` | Editable preview of generated program |
| `components/super-admin/generation-progress.tsx` | Progress indicator with streamed status |

Modified files:

| File | Change |
|------|--------|
| `app/(super-admin)/super-admin/training/page.tsx` | Add "Import from Files" and "Generate from Files" buttons, mount modal |

Note: Content generation functions live in a new `lib/content-generator.ts` (not `lib/gemini.ts`) to keep child observation AI separate from training content AI.

---

## Out of Scope

- Video content generation (lessons are text-only)
- URL/web page scraping as an input source
- Copy-paste text input (files only)
- Per-organisation content generation (super admin feature only)
- Automatic activation of generated content (always starts as draft)
- Storing original uploaded files for later reference
