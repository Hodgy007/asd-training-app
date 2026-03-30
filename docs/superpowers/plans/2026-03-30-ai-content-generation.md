# AI Content Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two AI-powered content generation modes (Structure and Generate) to the super admin Training Content page, enabling file uploads (PDF, DOCX, PPTX) that produce full training programs with modules, lessons, and quizzes.

**Architecture:** Server-side file parsing extracts text from uploaded documents. A three-phase Gemini pipeline (outline → lesson content → quizzes) produces a complete program structure. The super admin previews and edits everything in a modal before saving. An SSE stream provides real-time progress during generation.

**Tech Stack:** Next.js 14 (App Router), Google Gemini 2.5 Flash (`@google/genai`), Prisma, `pdf-parse`, `mammoth`, `pptx-parser`, Server-Sent Events (native `ReadableStream`), React Quill (`react-quill-new`)

**Spec:** `docs/superpowers/specs/2026-03-30-ai-content-generation-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `lib/file-parser.ts` | Parse PDF/DOCX/PPTX into structured text sections |
| `lib/content-generator.ts` | Gemini prompts and orchestration — outline, lesson content, quiz generation |
| `lib/content-generator-types.ts` | Shared TypeScript interfaces for all generation types |
| `app/api/super-admin/training/parse-files/route.ts` | File upload + parsing endpoint |
| `app/api/super-admin/training/generate-outline/route.ts` | Outline generation endpoint |
| `app/api/super-admin/training/generate-content/route.ts` | Lesson + quiz SSE streaming endpoint |
| `app/api/super-admin/training/save-program/route.ts` | Batch save program to DB |
| `app/api/super-admin/training/parse-and-regenerate/route.ts` | Upload additional files + regenerate failed lessons |
| `components/super-admin/content-generation-modal.tsx` | Top-level modal orchestrating all steps |
| `components/super-admin/file-drop-zone.tsx` | Drag-and-drop file upload component |
| `components/super-admin/generation-progress.tsx` | Progress indicator with streamed status |
| `components/super-admin/program-preview.tsx` | Full editable preview of generated program |

### Modified Files

| File | Change |
|------|--------|
| `app/(super-admin)/super-admin/training/page.tsx` | Add "Import from Files" and "Generate from Files" buttons, mount modal |
| `package.json` | Add `pdf-parse`, `mammoth`, `pptx-parser` dependencies |

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the three file-parsing packages**

```bash
cd C:/Users/Simon/OneDrive/Documents/asd-training-app && npm install pdf-parse mammoth pptx-parser
```

- [ ] **Step 2: Verify installation**

```bash
cd C:/Users/Simon/OneDrive/Documents/asd-training-app && node -e "require('pdf-parse'); require('mammoth'); console.log('pdf-parse and mammoth OK')"
```

Expected: `pdf-parse and mammoth OK` printed with no errors.

Note: `pptx-parser` may not have a default export — that's fine, we'll verify when we implement the parser. If `pptx-parser` is not available or has issues, we'll implement PPTX parsing using the existing `xml2js` dependency (already in package.json) to unzip and parse the XML inside `.pptx` files.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/Simon/OneDrive/Documents/asd-training-app && git add package.json package-lock.json && git commit -m "feat: add pdf-parse, mammoth, pptx-parser for file upload parsing"
```

---

## Task 2: Shared TypeScript Types

**Files:**
- Create: `lib/content-generator-types.ts`

- [ ] **Step 1: Create the shared types file**

```typescript
// lib/content-generator-types.ts

// ─── File Parsing Types ─────────────────────────────────────────────────────

export interface ParsedSection {
  heading?: string
  content: string
}

export interface ParsedFile {
  filename: string
  format: 'pdf' | 'docx' | 'pptx'
  sections: ParsedSection[]
}

// ─── Generation Mode Types ──────────────────────────────────────────────────

export type GenerationMode = 'structure' | 'generate'
export type GenerationLens = 'autism' | 'practitioner'

// ─── Outline Types ──────────────────────────────────────────────────────────

export interface SourceRef {
  fileIndex: number
  sectionIndices: number[]
}

export interface OutlineLesson {
  title: string
  sourceRefs: SourceRef[]
}

export interface OutlineModule {
  title: string
  description: string
  lessons: OutlineLesson[]
}

export interface GeneratedOutline {
  programName: string
  modules: OutlineModule[]
}

// ─── Generated Content Types ────────────────────────────────────────────────

export interface GeneratedQuizQuestion {
  question: string
  options: string[] // ["A) ...", "B) ...", "C) ...", "D) ..."]
  correctAnswer: string
  explanation: string
}

export interface GeneratedLesson {
  title: string
  content: string // HTML
  order: number
  quizQuestions: GeneratedQuizQuestion[]
  error?: string // Set if generation failed for this lesson
}

export interface GeneratedModule {
  title: string
  description: string
  order: number
  lessons: GeneratedLesson[]
}

export interface GeneratedProgram {
  programName: string
  modules: GeneratedModule[]
}

// ─── SSE Event Types ────────────────────────────────────────────────────────

export type SSEEvent =
  | { type: 'progress'; lesson: number; total: number; phase: 'content' | 'quiz' }
  | { type: 'lesson-complete'; moduleIndex: number; lessonIndex: number; content: string }
  | { type: 'quiz-complete'; moduleIndex: number; lessonIndex: number; questions: GeneratedQuizQuestion[] }
  | { type: 'lesson-error'; moduleIndex: number; lessonIndex: number; error: string }
  | { type: 'complete'; program: GeneratedProgram }
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd C:/Users/Simon/OneDrive/Documents/asd-training-app && npx tsc --noEmit lib/content-generator-types.ts 2>&1 | head -20
```

Expected: No errors (or only unrelated existing errors from other files).

- [ ] **Step 3: Commit**

```bash
cd C:/Users/Simon/OneDrive/Documents/asd-training-app && git add lib/content-generator-types.ts && git commit -m "feat: add shared TypeScript types for AI content generation"
```

---

## Task 3: File Parser

**Files:**
- Create: `lib/file-parser.ts`

- [ ] **Step 1: Create the file parser module**

This module exports a single function `parseFiles()` that accepts an array of `File` objects and returns `ParsedFile[]`. Each parser handles one format.

```typescript
// lib/file-parser.ts

import type { ParsedFile, ParsedSection } from './content-generator-types'

// ─── PDF Parsing ────────────────────────────────────────────────────────────

async function parsePdf(buffer: Buffer, filename: string): Promise<ParsedFile> {
  const pdfParse = (await import('pdf-parse')).default
  const data = await pdfParse(buffer)

  // Split on double newlines to approximate section boundaries
  const rawSections = data.text.split(/\n{2,}/).filter((s: string) => s.trim().length > 0)

  const sections: ParsedSection[] = rawSections.map((text: string) => {
    const trimmed = text.trim()
    // Heuristic: short lines in ALL CAPS or ending with colon are likely headings
    const lines = trimmed.split('\n')
    const firstLine = lines[0]?.trim() ?? ''
    const isHeading =
      firstLine.length < 100 &&
      (firstLine === firstLine.toUpperCase() || firstLine.endsWith(':'))

    if (isHeading && lines.length > 1) {
      return {
        heading: firstLine.replace(/:$/, ''),
        content: lines.slice(1).join('\n').trim(),
      }
    }
    return { content: trimmed }
  })

  return { filename, format: 'pdf', sections }
}

// ─── DOCX Parsing ───────────────────────────────────────────────────────────

async function parseDocx(buffer: Buffer, filename: string): Promise<ParsedFile> {
  const mammoth = await import('mammoth')
  const result = await mammoth.convertToHtml({ buffer })
  const html = result.value

  // Split by heading tags to extract sections
  // Each <h1>, <h2>, or <h3> starts a new section
  const parts = html.split(/(?=<h[123][^>]*>)/i)

  const sections: ParsedSection[] = parts
    .map((part: string) => {
      const headingMatch = part.match(/<h[123][^>]*>(.*?)<\/h[123]>/i)
      const heading = headingMatch ? headingMatch[1].replace(/<[^>]+>/g, '').trim() : undefined
      const content = heading
        ? part.replace(/<h[123][^>]*>.*?<\/h[123]>/i, '').trim()
        : part.trim()

      if (!content && !heading) return null
      return { heading, content }
    })
    .filter((s: ParsedSection | null): s is ParsedSection => s !== null && (s.content.length > 0 || !!s.heading))

  return { filename, format: 'docx', sections }
}

// ─── PPTX Parsing ───────────────────────────────────────────────────────────

async function parsePptx(buffer: Buffer, filename: string): Promise<ParsedFile> {
  // PPTX files are ZIP archives containing XML.
  // We use AdmZip to extract slide XML and xml2js to parse it.
  // Each slide becomes a section with the slide title as heading.
  const AdmZip = (await import('adm-zip')).default
  const { parseStringPromise } = await import('xml2js')

  const zip = new AdmZip(buffer)
  const slideEntries = zip.getEntries()
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
    .sort((a, b) => {
      const numA = parseInt(a.entryName.match(/slide(\d+)/)?.[1] ?? '0')
      const numB = parseInt(b.entryName.match(/slide(\d+)/)?.[1] ?? '0')
      return numA - numB
    })

  const sections: ParsedSection[] = []

  for (const entry of slideEntries) {
    const xml = entry.getData().toString('utf8')
    const parsed = await parseStringPromise(xml)

    // Extract all text runs from the slide
    const texts: string[] = []
    const extractText = (obj: unknown): void => {
      if (!obj || typeof obj !== 'object') return
      if (Array.isArray(obj)) {
        obj.forEach(extractText)
        return
      }
      const record = obj as Record<string, unknown>
      // a:t elements contain text
      if (record['a:t']) {
        const vals = Array.isArray(record['a:t']) ? record['a:t'] : [record['a:t']]
        for (const v of vals) {
          if (typeof v === 'string') texts.push(v)
          else if (v && typeof v === 'object' && '_' in (v as Record<string, unknown>)) {
            texts.push(String((v as Record<string, unknown>)._))
          }
        }
      }
      for (const val of Object.values(record)) {
        extractText(val)
      }
    }

    extractText(parsed)

    if (texts.length === 0) continue

    // First text element is typically the slide title
    const heading = texts[0]?.trim()
    const content = texts.slice(1).join('\n').trim()

    sections.push({
      heading: heading || undefined,
      content: content || heading || '',
    })
  }

  return { filename, format: 'pptx', sections }
}

// ─── Public API ─────────────────────────────────────────────────────────────

const SUPPORTED_EXTENSIONS: Record<string, (buffer: Buffer, filename: string) => Promise<ParsedFile>> = {
  '.pdf': parsePdf,
  '.docx': parseDocx,
  '.pptx': parsePptx,
}

export function getSupportedExtensions(): string[] {
  return Object.keys(SUPPORTED_EXTENSIONS)
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const filename = file.name
  const ext = '.' + filename.split('.').pop()?.toLowerCase()

  const parser = SUPPORTED_EXTENSIONS[ext]
  if (!parser) {
    throw new Error(`Unsupported file format: ${ext}. Supported: ${getSupportedExtensions().join(', ')}`)
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  return parser(buffer, filename)
}

export async function parseFiles(files: File[]): Promise<ParsedFile[]> {
  const results: ParsedFile[] = []
  for (const file of files) {
    results.push(await parseFile(file))
  }
  return results
}
```

- [ ] **Step 2: Install adm-zip for PPTX parsing**

Since `pptx-parser` may be unreliable, we'll use `adm-zip` (a well-maintained ZIP library) combined with `xml2js` (already a dependency) to parse PPTX files directly.

```bash
cd C:/Users/Simon/OneDrive/Documents/asd-training-app && npm install adm-zip && npm install -D @types/adm-zip
```

If `pptx-parser` was installed in Task 1, remove it:

```bash
cd C:/Users/Simon/OneDrive/Documents/asd-training-app && npm uninstall pptx-parser 2>/dev/null; echo "done"
```

- [ ] **Step 3: Verify the parser compiles**

```bash
cd C:/Users/Simon/OneDrive/Documents/asd-training-app && npx tsc --noEmit lib/file-parser.ts 2>&1 | head -20
```

Expected: No errors from this file.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/Simon/OneDrive/Documents/asd-training-app && git add lib/file-parser.ts package.json package-lock.json && git commit -m "feat: add server-side file parser for PDF, DOCX, PPTX"
```

---

## Task 4: Content Generator — Gemini Orchestration

**Files:**
- Create: `lib/content-generator.ts`

- [ ] **Step 1: Create the content generator module**

This module contains three functions matching the three Gemini phases: outline generation, lesson content generation, and quiz generation for content.

```typescript
// lib/content-generator.ts

import { GoogleGenAI } from '@google/genai'
import type {
  ParsedFile,
  GenerationMode,
  GenerationLens,
  GeneratedOutline,
  GeneratedQuizQuestion,
} from './content-generator-types'

const MODEL = 'gemini-2.5-flash'

function getAI(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured')
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) return fenced[1].trim()
  return text.trim()
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── Format parsed content for prompts ──────────────────────────────────────

function formatParsedContentForPrompt(files: ParsedFile[]): string {
  return files
    .map((file, fi) => {
      const header = `=== FILE ${fi}: ${file.filename} (${file.format}) ===`
      const body = file.sections
        .map((s, si) => {
          const sectionHeader = s.heading ? `[Section ${si}: ${s.heading}]` : `[Section ${si}]`
          return `${sectionHeader}\n${s.content}`
        })
        .join('\n\n')
      return `${header}\n${body}`
    })
    .join('\n\n')
}

function extractSourceSections(
  files: ParsedFile[],
  sourceRefs: Array<{ fileIndex: number; sectionIndices: number[] }>
): string {
  return sourceRefs
    .map((ref) => {
      const file = files[ref.fileIndex]
      if (!file) return ''
      return ref.sectionIndices
        .map((si) => {
          const section = file.sections[si]
          if (!section) return ''
          const heading = section.heading ? `### ${section.heading}\n` : ''
          return `${heading}${section.content}`
        })
        .join('\n\n')
    })
    .join('\n\n')
}

// ─── Phase 1: Outline Generation ────────────────────────────────────────────

export async function generateOutline(
  files: ParsedFile[],
  mode: GenerationMode,
  programName: string
): Promise<GeneratedOutline> {
  const ai = getAI()
  const formattedContent = formatParsedContentForPrompt(files)

  const modeInstructions =
    mode === 'structure'
      ? `You are organising existing training material into a structured program.
Identify logical groupings in the source material and propose module and lesson titles.
Do NOT invent any new content — only organise what exists.
Each lesson's sourceRefs must map precisely to the sections that contain its content.`
      : `You are designing a training program based on source reference material.
Read and understand the material, then propose a pedagogically sound module and lesson structure.
Each lesson's sourceRefs should indicate which parts of the source inform that lesson.
Design for progressive learning — earlier modules cover fundamentals, later ones build on them.`

  const prompt = `${modeInstructions}

The program name is: "${programName}"

Source material (files with numbered sections):
${formattedContent}

Return ONLY valid JSON matching this exact structure (no markdown, no explanation):
{
  "programName": "${programName}",
  "modules": [
    {
      "title": "Module title",
      "description": "Brief module description",
      "lessons": [
        {
          "title": "Lesson title",
          "sourceRefs": [
            { "fileIndex": 0, "sectionIndices": [0, 1, 2] }
          ]
        }
      ]
    }
  ]
}

Rules:
- fileIndex is 0-based, referring to the FILE number above
- sectionIndices are 0-based, referring to [Section N] numbers within that file
- Every section of the source should be assigned to at least one lesson
- Each module should have 2-6 lessons
- Order modules from introductory to advanced`

  const response = await ai.models.generateContent({ model: MODEL, contents: prompt })
  const rawText = response.text ?? ''
  const jsonString = extractJson(rawText)

  const parsed = JSON.parse(jsonString) as GeneratedOutline
  // Ensure programName is preserved
  parsed.programName = programName
  return parsed
}

// ─── Phase 2: Lesson Content Generation ─────────────────────────────────────

export async function generateLessonContent(
  files: ParsedFile[],
  lessonTitle: string,
  sourceRefs: Array<{ fileIndex: number; sectionIndices: number[] }>,
  mode: GenerationMode,
  lens?: GenerationLens
): Promise<string> {
  const ai = getAI()
  const sourceText = extractSourceSections(files, sourceRefs)

  let prompt: string

  if (mode === 'structure') {
    prompt = `You are formatting existing training material as a lesson.

Lesson title: "${lessonTitle}"

Source content:
${sourceText}

Format this content as a training lesson in HTML. Rules:
- Use the ORIGINAL WORDING exactly as it appears in the source material
- Do NOT add, remove, or paraphrase any content
- Do NOT add introductions, summaries, or conclusions that aren't in the source
- Only add HTML formatting for readability: <h2>, <h3> for sub-headings, <p> for paragraphs, <ul>/<ol>/<li> for lists, <strong> for emphasis
- Preserve the order of information as it appears in the source
- Return ONLY the HTML content, no markdown, no explanation`
  } else if (lens === 'autism') {
    prompt = `You are generating a training lesson for autistic learners based on source reference material.

Lesson title: "${lessonTitle}"

Source reference material:
${sourceText}

Generate a training lesson in HTML. Rules:
- Use clear, literal language throughout
- Avoid idioms, metaphors, sarcasm, and ambiguous phrasing
- Use short sentences and paragraphs
- Use bullet points and numbered lists for structured information
- Include concrete, specific examples wherever possible
- Use consistent terminology — don't use synonyms for the same concept
- Add brief definitions when introducing specialist terms
- Use a calm, supportive, matter-of-fact tone
- Structure with clear <h2>/<h3> headings, <p> paragraphs, <ul>/<ol> lists
- Return ONLY the HTML content, no markdown, no explanation`
  } else {
    // Practitioner lens
    prompt = `You are generating a training lesson for practitioners and caregivers who work with autistic individuals.

Lesson title: "${lessonTitle}"

Source reference material:
${sourceText}

Generate a training lesson in HTML. Rules:
- Use professional but accessible language
- Include practical strategies and actionable advice
- Add realistic case examples or scenarios where appropriate
- Include reflection prompts to encourage critical thinking (e.g., "Consider how you might...")
- Reference evidence-based approaches where relevant
- Use a warm, supportive, professional tone
- Structure with clear <h2>/<h3> headings, <p> paragraphs, <ul>/<ol> lists
- Return ONLY the HTML content, no markdown, no explanation`
  }

  const response = await ai.models.generateContent({ model: MODEL, contents: prompt })
  return response.text ?? ''
}

// ─── Phase 3: Quiz Generation ───────────────────────────────────────────────

export async function generateQuizForLesson(
  lessonContent: string,
  mode: GenerationMode,
  lens?: GenerationLens,
  questionCount: number = 5
): Promise<GeneratedQuizQuestion[]> {
  const ai = getAI()
  const plainText = stripHtml(lessonContent)
  const count = Math.min(10, Math.max(1, questionCount))

  const audienceNote =
    mode === 'generate' && lens === 'autism'
      ? 'The quiz is for autistic learners. Use clear, literal language. Avoid idioms or ambiguous phrasing in questions and answers.'
      : mode === 'generate' && lens === 'practitioner'
        ? 'The quiz is for practitioners and caregivers. Test practical understanding and application of concepts.'
        : 'The quiz tests comprehension of the training material.'

  const prompt = `You are a training quiz generator. Based on the following lesson content, generate ${count} multiple-choice quiz questions.

${audienceNote}

Each question must:
- Test understanding of a key concept from the lesson
- Have exactly 4 options labelled A, B, C, D
- Have exactly one correct answer
- Include a brief explanation of why the correct answer is right

Return ONLY a valid JSON array with this structure:
[{"question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correctAnswer": "A) ...", "explanation": "..."}]

Lesson content:
${plainText}`

  const response = await ai.models.generateContent({ model: MODEL, contents: prompt })
  const rawText = response.text ?? ''
  const jsonString = extractJson(rawText)
  return JSON.parse(jsonString) as GeneratedQuizQuestion[]
}

// ─── Retry helper ───────────────────────────────────────────────────────────

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd C:/Users/Simon/OneDrive/Documents/asd-training-app && npx tsc --noEmit lib/content-generator.ts 2>&1 | head -20
```

Expected: No errors from this file.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/Simon/OneDrive/Documents/asd-training-app && git add lib/content-generator.ts && git commit -m "feat: add Gemini content generation orchestration (outline, lessons, quizzes)"
```

---

## Task 5: API Route — Parse Files

**Files:**
- Create: `app/api/super-admin/training/parse-files/route.ts`

- [ ] **Step 1: Create the parse-files endpoint**

```typescript
// app/api/super-admin/training/parse-files/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { parseFiles, getSupportedExtensions } from '@/lib/file-parser'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const files: File[] = []
  for (const [, value] of formData.entries()) {
    if (value instanceof File && value.size > 0) {
      files.push(value)
    }
  }

  if (files.length === 0) {
    return NextResponse.json({ error: 'No files uploaded' }, { status: 400 })
  }

  // Validate extensions before parsing
  const supported = getSupportedExtensions()
  for (const file of files) {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!supported.includes(ext)) {
      return NextResponse.json(
        { error: `Unsupported file: "${file.name}". Supported formats: ${supported.join(', ')}` },
        { status: 400 }
      )
    }
  }

  try {
    const parsed = await parseFiles(files)
    return NextResponse.json({ files: parsed })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to parse files'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/Simon/OneDrive/Documents/asd-training-app && git add app/api/super-admin/training/parse-files/route.ts && git commit -m "feat: add parse-files API endpoint for file upload"
```

---

## Task 6: API Route — Generate Outline

**Files:**
- Create: `app/api/super-admin/training/generate-outline/route.ts`

- [ ] **Step 1: Create the generate-outline endpoint**

```typescript
// app/api/super-admin/training/generate-outline/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { generateOutline, withRetry } from '@/lib/content-generator'
import type { ParsedFile, GenerationMode, GenerationLens } from '@/lib/content-generator-types'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 })
  }

  const body = await req.json()
  const { parsedContent, mode, programName } = body as {
    parsedContent: ParsedFile[]
    mode: GenerationMode
    lens?: GenerationLens
    programName: string
  }

  if (!parsedContent || !Array.isArray(parsedContent) || parsedContent.length === 0) {
    return NextResponse.json({ error: 'parsedContent is required' }, { status: 400 })
  }
  if (!mode || !['structure', 'generate'].includes(mode)) {
    return NextResponse.json({ error: 'mode must be "structure" or "generate"' }, { status: 400 })
  }
  if (!programName || typeof programName !== 'string') {
    return NextResponse.json({ error: 'programName is required' }, { status: 400 })
  }

  try {
    const outline = await withRetry(() => generateOutline(parsedContent, mode, programName))
    return NextResponse.json(outline)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate outline'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/Simon/OneDrive/Documents/asd-training-app && git add app/api/super-admin/training/generate-outline/route.ts && git commit -m "feat: add generate-outline API endpoint"
```

---

## Task 7: API Route — Generate Content (SSE Stream)

**Files:**
- Create: `app/api/super-admin/training/generate-content/route.ts`

- [ ] **Step 1: Create the SSE streaming endpoint**

This is the most complex endpoint. It iterates through each lesson in the outline, generating content then quizzes, streaming progress events back to the client.

```typescript
// app/api/super-admin/training/generate-content/route.ts

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import {
  generateLessonContent,
  generateQuizForLesson,
  withRetry,
} from '@/lib/content-generator'
import type {
  ParsedFile,
  GenerationMode,
  GenerationLens,
  GeneratedOutline,
  GeneratedProgram,
  GeneratedModule,
  GeneratedLesson,
  SSEEvent,
} from '@/lib/content-generator-types'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!process.env.GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const body = await req.json()
  const { outline, parsedContent, mode, lens } = body as {
    outline: GeneratedOutline
    parsedContent: ParsedFile[]
    mode: GenerationMode
    lens?: GenerationLens
  }

  if (!outline || !parsedContent || !mode) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Count total lessons for progress tracking
  const totalLessons = outline.modules.reduce((sum, m) => sum + m.lessons.length, 0)

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      function sendEvent(event: SSEEvent) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      const program: GeneratedProgram = {
        programName: outline.programName,
        modules: [],
      }

      let lessonCounter = 0

      for (let mi = 0; mi < outline.modules.length; mi++) {
        const outlineModule = outline.modules[mi]
        const genModule: GeneratedModule = {
          title: outlineModule.title,
          description: outlineModule.description,
          order: mi + 1,
          lessons: [],
        }

        for (let li = 0; li < outlineModule.lessons.length; li++) {
          const outlineLesson = outlineModule.lessons[li]
          lessonCounter++

          // Phase 2: Generate lesson content
          sendEvent({
            type: 'progress',
            lesson: lessonCounter,
            total: totalLessons,
            phase: 'content',
          })

          const genLesson: GeneratedLesson = {
            title: outlineLesson.title,
            content: '',
            order: li + 1,
            quizQuestions: [],
          }

          try {
            const content = await withRetry(
              () =>
                generateLessonContent(
                  parsedContent,
                  outlineLesson.title,
                  outlineLesson.sourceRefs,
                  mode,
                  lens
                ),
              2 // 2 retries for content
            )

            genLesson.content = content

            sendEvent({
              type: 'lesson-complete',
              moduleIndex: mi,
              lessonIndex: li,
              content,
            })

            // Phase 3: Generate quiz
            sendEvent({
              type: 'progress',
              lesson: lessonCounter,
              total: totalLessons,
              phase: 'quiz',
            })

            try {
              const questions = await withRetry(
                () => generateQuizForLesson(content, mode, lens, 5),
                2
              )

              genLesson.quizQuestions = questions

              sendEvent({
                type: 'quiz-complete',
                moduleIndex: mi,
                lessonIndex: li,
                questions,
              })
            } catch (quizErr) {
              // Quiz failure is non-fatal — lesson still has content
              genLesson.quizQuestions = []
              sendEvent({
                type: 'lesson-error',
                moduleIndex: mi,
                lessonIndex: li,
                error: `Quiz generation failed: ${quizErr instanceof Error ? quizErr.message : String(quizErr)}`,
              })
            }
          } catch (err) {
            genLesson.content = ''
            genLesson.error = err instanceof Error ? err.message : String(err)

            sendEvent({
              type: 'lesson-error',
              moduleIndex: mi,
              lessonIndex: li,
              error: genLesson.error,
            })
          }

          genModule.lessons.push(genLesson)
        }

        program.modules.push(genModule)
      }

      // Send complete program
      sendEvent({ type: 'complete', program })

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/Simon/OneDrive/Documents/asd-training-app && git add app/api/super-admin/training/generate-content/route.ts && git commit -m "feat: add SSE streaming endpoint for lesson + quiz generation"
```

---

## Task 8: API Route — Save Program

**Files:**
- Create: `app/api/super-admin/training/save-program/route.ts`

- [ ] **Step 1: Create the save-program endpoint**

```typescript
// app/api/super-admin/training/save-program/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import prisma from '@/lib/prisma'
import type { GeneratedProgram } from '@/lib/content-generator-types'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await req.json()) as GeneratedProgram

  if (!body.programName || !body.modules || !Array.isArray(body.modules)) {
    return NextResponse.json({ error: 'Invalid program data' }, { status: 400 })
  }

  try {
    // Get next program order
    const maxOrder = await prisma.trainingProgram.aggregate({ _max: { order: true } })
    const programOrder = (maxOrder._max.order ?? 0) + 1

    // Create everything in a single transaction
    const program = await prisma.$transaction(async (tx) => {
      // Create the program
      const createdProgram = await tx.trainingProgram.create({
        data: {
          name: body.programName,
          description: `AI-generated training program`,
          order: programOrder,
          version: '1.0',
          status: 'DRAFT',
        },
      })

      // Create modules, lessons, and quiz questions
      for (const mod of body.modules) {
        // Generate a slug-style ID for the module
        const moduleId = `${createdProgram.id}-mod-${mod.order}`

        await tx.module.create({
          data: {
            id: moduleId,
            title: mod.title,
            description: mod.description,
            order: mod.order,
            active: false,
            programId: createdProgram.id,
          },
        })

        for (const lesson of mod.lessons) {
          const lessonId = `${moduleId}-les-${lesson.order}`

          await tx.lesson.create({
            data: {
              id: lessonId,
              title: lesson.title,
              type: 'TEXT',
              content: lesson.content,
              order: lesson.order,
              active: false,
              moduleId: moduleId,
            },
          })

          // Create quiz questions
          for (let qi = 0; qi < lesson.quizQuestions.length; qi++) {
            const q = lesson.quizQuestions[qi]
            await tx.quizQuestion.create({
              data: {
                lessonId: lessonId,
                question: q.question,
                options: JSON.stringify(q.options),
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
                order: qi + 1,
              },
            })
          }
        }
      }

      return createdProgram
    })

    return NextResponse.json({ programId: program.id }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save program'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/Simon/OneDrive/Documents/asd-training-app && git add app/api/super-admin/training/save-program/route.ts && git commit -m "feat: add save-program endpoint with Prisma transaction"
```

---

## Task 9: API Route — Parse and Regenerate

**Files:**
- Create: `app/api/super-admin/training/parse-and-regenerate/route.ts`

- [ ] **Step 1: Create the parse-and-regenerate endpoint**

This endpoint handles uploading additional files and regenerating failed lessons. It accepts multipart form data with files plus JSON metadata.

```typescript
// app/api/super-admin/training/parse-and-regenerate/route.ts

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { parseFiles } from '@/lib/file-parser'
import {
  generateLessonContent,
  generateQuizForLesson,
  withRetry,
} from '@/lib/content-generator'
import type {
  ParsedFile,
  GenerationMode,
  GenerationLens,
  GeneratedProgram,
  GeneratedQuizQuestion,
  SSEEvent,
} from '@/lib/content-generator-types'

interface RegenerateRequest {
  existingParsedContent: ParsedFile[]
  program: GeneratedProgram
  failedLessons: Array<{ moduleIndex: number; lessonIndex: number }>
  mode: GenerationMode
  lens?: GenerationLens
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!process.env.GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const formData = await req.formData()

  // Extract files
  const newFiles: File[] = []
  for (const [key, value] of formData.entries()) {
    if (key === 'files' && value instanceof File && value.size > 0) {
      newFiles.push(value)
    }
  }

  // Extract JSON metadata
  const metadataStr = formData.get('metadata')
  if (!metadataStr || typeof metadataStr !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing metadata' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const metadata = JSON.parse(metadataStr) as RegenerateRequest

  // Parse new files and combine with existing parsed content
  let combinedContent: ParsedFile[] = [...(metadata.existingParsedContent || [])]
  if (newFiles.length > 0) {
    const newParsed = await parseFiles(newFiles)
    combinedContent = [...combinedContent, ...newParsed]
  }

  const { program, failedLessons, mode, lens } = metadata
  const totalToRegenerate = failedLessons.length

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      function sendEvent(event: SSEEvent) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      let counter = 0

      for (const { moduleIndex, lessonIndex } of failedLessons) {
        counter++
        const mod = program.modules[moduleIndex]
        const lesson = mod?.lessons[lessonIndex]
        if (!mod || !lesson) continue

        sendEvent({
          type: 'progress',
          lesson: counter,
          total: totalToRegenerate,
          phase: 'content',
        })

        try {
          // Use all available content as context for regeneration
          // Build sourceRefs covering all files and sections
          const allSourceRefs = combinedContent.map((_, fi) => ({
            fileIndex: fi,
            sectionIndices: combinedContent[fi].sections.map((__, si) => si),
          }))

          const content = await withRetry(
            () => generateLessonContent(combinedContent, lesson.title, allSourceRefs, mode, lens),
            2
          )

          sendEvent({
            type: 'lesson-complete',
            moduleIndex,
            lessonIndex,
            content,
          })

          // Generate quiz
          sendEvent({
            type: 'progress',
            lesson: counter,
            total: totalToRegenerate,
            phase: 'quiz',
          })

          try {
            const questions: GeneratedQuizQuestion[] = await withRetry(
              () => generateQuizForLesson(content, mode, lens, 5),
              2
            )

            sendEvent({
              type: 'quiz-complete',
              moduleIndex,
              lessonIndex,
              questions,
            })
          } catch {
            sendEvent({
              type: 'lesson-error',
              moduleIndex,
              lessonIndex,
              error: 'Quiz generation failed on retry',
            })
          }
        } catch (err) {
          sendEvent({
            type: 'lesson-error',
            moduleIndex,
            lessonIndex,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }

      // Signal completion (program will be updated client-side)
      sendEvent({ type: 'complete', program })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/Simon/OneDrive/Documents/asd-training-app && git add app/api/super-admin/training/parse-and-regenerate/route.ts && git commit -m "feat: add parse-and-regenerate endpoint for supplementary file uploads"
```

---

## Task 10: File Drop Zone Component

**Files:**
- Create: `components/super-admin/file-drop-zone.tsx`

- [ ] **Step 1: Create the file drop zone component**

```tsx
// components/super-admin/file-drop-zone.tsx

'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, FileText, File as FileIcon } from 'lucide-react'
import { clsx } from 'clsx'

interface FileDropZoneProps {
  files: File[]
  onFilesChange: (files: File[]) => void
  disabled?: boolean
}

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.pptx']
const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return <FileText className="h-5 w-5 text-red-500" />
  if (ext === 'docx') return <FileText className="h-5 w-5 text-blue-500" />
  if (ext === 'pptx') return <FileIcon className="h-5 w-5 text-orange-500" />
  return <FileIcon className="h-5 w-5 text-slate-400" />
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileDropZone({ files, onFilesChange, disabled }: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const valid: File[] = []
      for (const file of Array.from(newFiles)) {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase()
        if (ACCEPTED_EXTENSIONS.includes(ext)) {
          // Avoid duplicates by name
          if (!files.some((f) => f.name === file.name && f.size === file.size)) {
            valid.push(file)
          }
        }
      }
      if (valid.length > 0) {
        onFilesChange([...files, ...valid])
      }
    },
    [files, onFilesChange]
  )

  const removeFile = useCallback(
    (index: number) => {
      onFilesChange(files.filter((_, i) => i !== index))
    },
    [files, onFilesChange]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled) setIsDragOver(true)
    },
    [disabled]
  )

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      if (!disabled && e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files)
      }
    },
    [disabled, addFiles]
  )

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={clsx(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
          isDragOver
            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
            : 'border-slate-300 dark:border-slate-600 hover:border-purple-400 dark:hover:border-purple-500',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Upload className="h-8 w-8 mx-auto mb-3 text-slate-400 dark:text-slate-500" />
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Drop files here or click to browse
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          PDF, DOCX, PPTX files supported
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_MIME_TYPES.join(',')}
          onChange={(e) => e.target.files && addFiles(e.target.files)}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${file.size}`}
              className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2"
            >
              {getFileIcon(file.name)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatFileSize(file.size)}
                </p>
              </div>
              {!disabled && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(index)
                  }}
                  className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
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
cd C:/Users/Simon/OneDrive/Documents/asd-training-app && git add components/super-admin/file-drop-zone.tsx && git commit -m "feat: add file drop zone component for drag-and-drop upload"
```

---

## Task 11: Generation Progress Component

**Files:**
- Create: `components/super-admin/generation-progress.tsx`

- [ ] **Step 1: Create the progress indicator component**

```tsx
// components/super-admin/generation-progress.tsx

'use client'

import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'

export type ProgressPhase = 'parsing' | 'outline' | 'content' | 'quiz' | 'complete' | 'error'

interface GenerationProgressProps {
  phase: ProgressPhase
  currentLesson: number
  totalLessons: number
  currentPhase: 'content' | 'quiz'
  errors: string[]
}

export default function GenerationProgress({
  phase,
  currentLesson,
  totalLessons,
  currentPhase,
  errors,
}: GenerationProgressProps) {
  const steps = [
    { key: 'parsing', label: 'Parsing files...' },
    { key: 'outline', label: 'Creating outline...' },
    {
      key: 'content',
      label:
        currentPhase === 'quiz'
          ? `Generating quizzes for lesson ${currentLesson} of ${totalLessons}...`
          : `Generating lesson ${currentLesson} of ${totalLessons}...`,
    },
    { key: 'complete', label: 'Complete!' },
  ]

  const phaseOrder = ['parsing', 'outline', 'content', 'complete']
  const currentIndex = phaseOrder.indexOf(phase === 'quiz' ? 'content' : phase === 'error' ? 'complete' : phase)

  return (
    <div className="space-y-4 py-8">
      {/* Progress bar */}
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
        <div
          className="bg-purple-600 h-2 rounded-full transition-all duration-500"
          style={{
            width:
              phase === 'complete'
                ? '100%'
                : phase === 'parsing'
                  ? '10%'
                  : phase === 'outline'
                    ? '25%'
                    : totalLessons > 0
                      ? `${25 + (currentLesson / totalLessons) * 70}%`
                      : '25%',
          }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, idx) => {
          const stepPhaseIdx = phaseOrder.indexOf(step.key)
          const isComplete = stepPhaseIdx < currentIndex
          const isCurrent = stepPhaseIdx === currentIndex
          const isPending = stepPhaseIdx > currentIndex

          return (
            <div key={step.key} className="flex items-center gap-3">
              {isComplete && <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />}
              {isCurrent && (
                <Loader2 className="h-5 w-5 text-purple-500 animate-spin flex-shrink-0" />
              )}
              {isPending && (
                <div className="h-5 w-5 rounded-full border-2 border-slate-300 dark:border-slate-600 flex-shrink-0" />
              )}
              <span
                className={
                  isComplete
                    ? 'text-sm text-green-600 dark:text-green-400'
                    : isCurrent
                      ? 'text-sm font-medium text-purple-600 dark:text-purple-400'
                      : 'text-sm text-slate-400 dark:text-slate-500'
                }
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
              {errors.length} lesson{errors.length > 1 ? 's' : ''} had issues
            </span>
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400">
            You can retry or upload additional files in the next step.
          </p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/Simon/OneDrive/Documents/asd-training-app && git add components/super-admin/generation-progress.tsx && git commit -m "feat: add generation progress indicator component"
```

---

## Task 12: Program Preview Component

**Files:**
- Create: `components/super-admin/program-preview.tsx`

- [ ] **Step 1: Create the editable preview component**

This is a large component. It renders the full generated program with editable fields for the program name, module titles/descriptions, lesson titles/content, and quiz questions. Uses React Quill for lesson content editing (matching the existing lesson editor).

```tsx
// components/super-admin/program-preview.tsx

'use client'

import { useState, useCallback, useMemo, lazy, Suspense } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  ChevronUp,
  AlertCircle,
  RefreshCw,
  Plus,
  Loader2,
} from 'lucide-react'
import { clsx } from 'clsx'
import type {
  GeneratedProgram,
  GeneratedModule,
  GeneratedLesson,
  GeneratedQuizQuestion,
} from '@/lib/content-generator-types'

// Lazy-load React Quill (heavy dependency, client-only)
const ReactQuill = lazy(() => import('react-quill-new'))

interface ProgramPreviewProps {
  program: GeneratedProgram
  onProgramChange: (program: GeneratedProgram) => void
  onRetryLesson?: (moduleIndex: number, lessonIndex: number) => void
  onUploadMore?: () => void
}

export default function ProgramPreview({
  program,
  onProgramChange,
  onRetryLesson,
  onUploadMore,
}: ProgramPreviewProps) {
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set([0]))
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set())
  const [expandedQuizzes, setExpandedQuizzes] = useState<Set<string>>(new Set())

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const toggleModule = useCallback((idx: number) => {
    setExpandedModules((prev) => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }, [])

  const toggleLesson = useCallback((key: string) => {
    setExpandedLessons((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [])

  const toggleQuiz = useCallback((key: string) => {
    setExpandedQuizzes((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [])

  const updateModule = useCallback(
    (mi: number, updates: Partial<GeneratedModule>) => {
      const newModules = [...program.modules]
      newModules[mi] = { ...newModules[mi], ...updates }
      onProgramChange({ ...program, modules: newModules })
    },
    [program, onProgramChange]
  )

  const updateLesson = useCallback(
    (mi: number, li: number, updates: Partial<GeneratedLesson>) => {
      const newModules = [...program.modules]
      const newLessons = [...newModules[mi].lessons]
      newLessons[li] = { ...newLessons[li], ...updates }
      newModules[mi] = { ...newModules[mi], lessons: newLessons }
      onProgramChange({ ...program, modules: newModules })
    },
    [program, onProgramChange]
  )

  const updateQuizQuestion = useCallback(
    (mi: number, li: number, qi: number, updates: Partial<GeneratedQuizQuestion>) => {
      const newModules = [...program.modules]
      const newLessons = [...newModules[mi].lessons]
      const newQuestions = [...newLessons[li].quizQuestions]
      newQuestions[qi] = { ...newQuestions[qi], ...updates }
      newLessons[li] = { ...newLessons[li], quizQuestions: newQuestions }
      newModules[mi] = { ...newModules[mi], lessons: newLessons }
      onProgramChange({ ...program, modules: newModules })
    },
    [program, onProgramChange]
  )

  const deleteModule = useCallback(
    (mi: number) => {
      const newModules = program.modules.filter((_, i) => i !== mi)
        .map((m, i) => ({ ...m, order: i + 1 }))
      onProgramChange({ ...program, modules: newModules })
    },
    [program, onProgramChange]
  )

  const deleteLesson = useCallback(
    (mi: number, li: number) => {
      const newModules = [...program.modules]
      const newLessons = newModules[mi].lessons.filter((_, i) => i !== li)
        .map((l, i) => ({ ...l, order: i + 1 }))
      newModules[mi] = { ...newModules[mi], lessons: newLessons }
      onProgramChange({ ...program, modules: newModules })
    },
    [program, onProgramChange]
  )

  const deleteQuizQuestion = useCallback(
    (mi: number, li: number, qi: number) => {
      const newModules = [...program.modules]
      const newLessons = [...newModules[mi].lessons]
      const newQuestions = newLessons[li].quizQuestions.filter((_, i) => i !== qi)
      newLessons[li] = { ...newLessons[li], quizQuestions: newQuestions }
      newModules[mi] = { ...newModules[mi], lessons: newLessons }
      onProgramChange({ ...program, modules: newModules })
    },
    [program, onProgramChange]
  )

  const moveModule = useCallback(
    (mi: number, direction: 'up' | 'down') => {
      const newModules = [...program.modules]
      const swapIdx = direction === 'up' ? mi - 1 : mi + 1
      if (swapIdx < 0 || swapIdx >= newModules.length) return
      ;[newModules[mi], newModules[swapIdx]] = [newModules[swapIdx], newModules[mi]]
      newModules.forEach((m, i) => (m.order = i + 1))
      onProgramChange({ ...program, modules: newModules })
    },
    [program, onProgramChange]
  )

  const moveLesson = useCallback(
    (mi: number, li: number, direction: 'up' | 'down') => {
      const newModules = [...program.modules]
      const newLessons = [...newModules[mi].lessons]
      const swapIdx = direction === 'up' ? li - 1 : li + 1
      if (swapIdx < 0 || swapIdx >= newLessons.length) return
      ;[newLessons[li], newLessons[swapIdx]] = [newLessons[swapIdx], newLessons[li]]
      newLessons.forEach((l, i) => (l.order = i + 1))
      newModules[mi] = { ...newModules[mi], lessons: newLessons }
      onProgramChange({ ...program, modules: newModules })
    },
    [program, onProgramChange]
  )

  // Count failed lessons
  const failedCount = useMemo(
    () => program.modules.reduce((sum, m) => sum + m.lessons.filter((l) => !!l.error).length, 0),
    [program]
  )

  const quillModules = useMemo(
    () => ({
      toolbar: [
        [{ header: [2, 3, false] }],
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['clean'],
      ],
    }),
    []
  )

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
      {/* Program name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Program Name
        </label>
        <input
          type="text"
          value={program.programName}
          onChange={(e) => onProgramChange({ ...program, programName: e.target.value })}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
        />
      </div>

      {/* Failed lessons banner */}
      {failedCount > 0 && (
        <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <span className="text-sm text-amber-700 dark:text-amber-300">
              {failedCount} lesson{failedCount > 1 ? 's' : ''} failed to generate
            </span>
          </div>
          {onUploadMore && (
            <button
              onClick={onUploadMore}
              className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline"
            >
              Upload additional files
            </button>
          )}
        </div>
      )}

      {/* Modules */}
      {program.modules.map((mod, mi) => (
        <div
          key={mi}
          className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
        >
          {/* Module header */}
          <div className="flex items-center gap-2 p-4 bg-slate-50 dark:bg-slate-800">
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => moveModule(mi, 'up')}
                disabled={mi === 0}
                className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30"
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                onClick={() => moveModule(mi, 'down')}
                disabled={mi === program.modules.length - 1}
                className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>

            <button onClick={() => toggleModule(mi)} className="p-1">
              {expandedModules.has(mi) ? (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-500" />
              )}
            </button>

            <input
              type="text"
              value={mod.title}
              onChange={(e) => updateModule(mi, { title: e.target.value })}
              className="flex-1 bg-transparent text-sm font-semibold text-slate-900 dark:text-white border-none outline-none"
            />

            <span className="text-xs text-slate-500 dark:text-slate-400">
              {mod.lessons.length} lesson{mod.lessons.length !== 1 ? 's' : ''}
            </span>

            <button
              onClick={() => deleteModule(mi)}
              className="p-1 text-slate-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Module content */}
          {expandedModules.has(mi) && (
            <div className="p-4 space-y-3">
              {/* Module description */}
              <textarea
                value={mod.description}
                onChange={(e) => updateModule(mi, { description: e.target.value })}
                placeholder="Module description"
                rows={2}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-300"
              />

              {/* Lessons */}
              {mod.lessons.map((lesson, li) => {
                const lessonKey = `${mi}-${li}`
                const isExpanded = expandedLessons.has(lessonKey)
                const hasError = !!lesson.error

                return (
                  <div
                    key={li}
                    className={clsx(
                      'border rounded-lg overflow-hidden',
                      hasError
                        ? 'border-red-300 dark:border-red-700'
                        : 'border-slate-200 dark:border-slate-600'
                    )}
                  >
                    {/* Lesson header */}
                    <div
                      className={clsx(
                        'flex items-center gap-2 p-3',
                        hasError ? 'bg-red-50 dark:bg-red-900/20' : 'bg-white dark:bg-slate-700/50'
                      )}
                    >
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => moveLesson(mi, li, 'up')}
                          disabled={li === 0}
                          className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => moveLesson(mi, li, 'down')}
                          disabled={li === mod.lessons.length - 1}
                          className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>

                      <button onClick={() => toggleLesson(lessonKey)} className="p-1">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-slate-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-500" />
                        )}
                      </button>

                      <input
                        type="text"
                        value={lesson.title}
                        onChange={(e) => updateLesson(mi, li, { title: e.target.value })}
                        className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-200 border-none outline-none"
                      />

                      {hasError && (
                        <>
                          <span className="text-xs text-red-500 font-medium">Failed</span>
                          {onRetryLesson && (
                            <button
                              onClick={() => onRetryLesson(mi, li)}
                              className="p-1 text-purple-500 hover:text-purple-700 transition-colors"
                              title="Retry generation"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                          )}
                        </>
                      )}

                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {lesson.quizQuestions.length} quiz Q
                      </span>

                      <button
                        onClick={() => deleteLesson(mi, li)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Lesson content */}
                    {isExpanded && (
                      <div className="p-3 space-y-3 border-t border-slate-200 dark:border-slate-600">
                        {hasError ? (
                          <div className="text-sm text-red-600 dark:text-red-400 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                            {lesson.error}
                          </div>
                        ) : (
                          <Suspense
                            fallback={
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                              </div>
                            }
                          >
                            <ReactQuill
                              theme="snow"
                              value={lesson.content}
                              onChange={(val: string) => updateLesson(mi, li, { content: val })}
                              modules={quillModules}
                            />
                          </Suspense>
                        )}

                        {/* Quiz questions */}
                        {lesson.quizQuestions.length > 0 && (
                          <div>
                            <button
                              onClick={() => toggleQuiz(lessonKey)}
                              className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-400 mb-2"
                            >
                              {expandedQuizzes.has(lessonKey) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              Quiz Questions ({lesson.quizQuestions.length})
                            </button>

                            {expandedQuizzes.has(lessonKey) && (
                              <div className="space-y-3 pl-2">
                                {lesson.quizQuestions.map((q, qi) => (
                                  <div
                                    key={qi}
                                    className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-2"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <span className="text-xs font-bold text-slate-500">
                                        Q{qi + 1}
                                      </span>
                                      <button
                                        onClick={() => deleteQuizQuestion(mi, li, qi)}
                                        className="p-0.5 text-slate-400 hover:text-red-500"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                    <textarea
                                      value={q.question}
                                      onChange={(e) =>
                                        updateQuizQuestion(mi, li, qi, {
                                          question: e.target.value,
                                        })
                                      }
                                      rows={2}
                                      className="w-full text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-slate-800 dark:text-slate-200"
                                    />
                                    {q.options.map((opt, oi) => (
                                      <input
                                        key={oi}
                                        type="text"
                                        value={opt}
                                        onChange={(e) => {
                                          const newOptions = [...q.options]
                                          newOptions[oi] = e.target.value
                                          updateQuizQuestion(mi, li, qi, { options: newOptions })
                                        }}
                                        className={clsx(
                                          'w-full text-sm rounded border px-2 py-1',
                                          opt === q.correctAnswer
                                            ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20'
                                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700',
                                          'text-slate-800 dark:text-slate-200'
                                        )}
                                      />
                                    ))}
                                    <select
                                      value={q.correctAnswer}
                                      onChange={(e) =>
                                        updateQuizQuestion(mi, li, qi, {
                                          correctAnswer: e.target.value,
                                        })
                                      }
                                      className="text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-slate-700 dark:text-slate-300"
                                    >
                                      {q.options.map((opt, oi) => (
                                        <option key={oi} value={opt}>
                                          Correct: {opt}
                                        </option>
                                      ))}
                                    </select>
                                    <textarea
                                      value={q.explanation}
                                      onChange={(e) =>
                                        updateQuizQuestion(mi, li, qi, {
                                          explanation: e.target.value,
                                        })
                                      }
                                      rows={1}
                                      placeholder="Explanation"
                                      className="w-full text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-slate-600 dark:text-slate-400"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/Simon/OneDrive/Documents/asd-training-app && git add components/super-admin/program-preview.tsx && git commit -m "feat: add editable program preview component for AI-generated content"
```

---

## Task 13: Content Generation Modal

**Files:**
- Create: `components/super-admin/content-generation-modal.tsx`

- [ ] **Step 1: Create the main modal component**

This component orchestrates the full flow: upload → progress → preview → save. It manages the state machine across all steps and calls the API routes.

```tsx
// components/super-admin/content-generation-modal.tsx

'use client'

import { useState, useCallback } from 'react'
import { X, Loader2, Upload, Sparkles, CheckCircle } from 'lucide-react'
import { clsx } from 'clsx'
import FileDropZone from './file-drop-zone'
import GenerationProgress from './generation-progress'
import type { ProgressPhase } from './generation-progress'
import ProgramPreview from './program-preview'
import type {
  ParsedFile,
  GenerationMode,
  GenerationLens,
  GeneratedOutline,
  GeneratedProgram,
  SSEEvent,
} from '@/lib/content-generator-types'

type ModalStep = 'upload' | 'processing' | 'preview' | 'saving' | 'done'

interface ContentGenerationModalProps {
  mode: GenerationMode
  isOpen: boolean
  onClose: () => void
  onComplete: () => void // Called after save to refresh parent
}

export default function ContentGenerationModal({
  mode,
  isOpen,
  onClose,
  onComplete,
}: ContentGenerationModalProps) {
  // Step state
  const [step, setStep] = useState<ModalStep>('upload')

  // Upload state
  const [files, setFiles] = useState<File[]>([])
  const [programName, setProgramName] = useState('')
  const [lens, setLens] = useState<GenerationLens>('practitioner')

  // Processing state
  const [phase, setPhase] = useState<ProgressPhase>('parsing')
  const [currentLesson, setCurrentLesson] = useState(0)
  const [totalLessons, setTotalLessons] = useState(0)
  const [currentPhase, setCurrentPhase] = useState<'content' | 'quiz'>('content')
  const [errors, setErrors] = useState<string[]>([])

  // Data state
  const [parsedContent, setParsedContent] = useState<ParsedFile[]>([])
  const [program, setProgram] = useState<GeneratedProgram | null>(null)
  const [savedProgramId, setSavedProgramId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  // ─── Reset ──────────────────────────────────────────────────────────────────

  const resetModal = useCallback(() => {
    setStep('upload')
    setFiles([])
    setProgramName('')
    setLens('practitioner')
    setPhase('parsing')
    setCurrentLesson(0)
    setTotalLessons(0)
    setCurrentPhase('content')
    setErrors([])
    setParsedContent([])
    setProgram(null)
    setSavedProgramId(null)
    setErrorMessage('')
  }, [])

  const handleClose = useCallback(() => {
    resetModal()
    onClose()
  }, [resetModal, onClose])

  // ─── Process Files ──────────────────────────────────────────────────────────

  const processFiles = useCallback(async () => {
    if (files.length === 0 || !programName.trim()) return

    setStep('processing')
    setPhase('parsing')
    setErrors([])
    setErrorMessage('')

    try {
      // Step 1: Parse files
      const formData = new FormData()
      files.forEach((f) => formData.append('files', f))

      const parseRes = await fetch('/api/super-admin/training/parse-files', {
        method: 'POST',
        body: formData,
      })
      if (!parseRes.ok) {
        const err = await parseRes.json()
        throw new Error(err.error || 'Failed to parse files')
      }
      const parseData = await parseRes.json()
      const parsed: ParsedFile[] = parseData.files
      setParsedContent(parsed)

      // Step 2: Generate outline
      setPhase('outline')
      const outlineRes = await fetch('/api/super-admin/training/generate-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parsedContent: parsed,
          mode,
          lens: mode === 'generate' ? lens : undefined,
          programName: programName.trim(),
        }),
      })
      if (!outlineRes.ok) {
        const err = await outlineRes.json()
        throw new Error(err.error || 'Failed to generate outline')
      }
      const outline: GeneratedOutline = await outlineRes.json()

      // Count total lessons
      const total = outline.modules.reduce((sum, m) => sum + m.lessons.length, 0)
      setTotalLessons(total)

      // Step 3: Generate content (SSE stream)
      setPhase('content')
      const contentRes = await fetch('/api/super-admin/training/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outline,
          parsedContent: parsed,
          mode,
          lens: mode === 'generate' ? lens : undefined,
        }),
      })

      if (!contentRes.ok) {
        const err = await contentRes.json()
        throw new Error(err.error || 'Failed to generate content')
      }

      // Read SSE stream
      const reader = contentRes.body?.getReader()
      const decoder = new TextDecoder()
      const collectedErrors: string[] = []

      if (reader) {
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const jsonStr = line.slice(6).trim()
            if (!jsonStr) continue

            try {
              const event: SSEEvent = JSON.parse(jsonStr)

              switch (event.type) {
                case 'progress':
                  setCurrentLesson(event.lesson)
                  setCurrentPhase(event.phase)
                  break
                case 'lesson-error':
                  collectedErrors.push(
                    `Module ${event.moduleIndex + 1}, Lesson ${event.lessonIndex + 1}: ${event.error}`
                  )
                  setErrors([...collectedErrors])
                  break
                case 'complete':
                  setProgram(event.program)
                  break
              }
            } catch {
              // Skip malformed events
            }
          }
        }
      }

      setPhase('complete')
      setStep('preview')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred')
      setPhase('error')
    }
  }, [files, programName, mode, lens])

  // ─── Save Program ───────────────────────────────────────────────────────────

  const saveProgram = useCallback(async () => {
    if (!program) return

    setStep('saving')
    setErrorMessage('')

    try {
      const res = await fetch('/api/super-admin/training/save-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(program),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save program')
      }

      const data = await res.json()
      setSavedProgramId(data.programId)
      setStep('done')
      onComplete()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save')
      setStep('preview') // Go back to preview so they can retry
    }
  }, [program, onComplete])

  // ─── Retry Lesson ───────────────────────────────────────────────────────────

  const retryLesson = useCallback(
    async (moduleIndex: number, lessonIndex: number) => {
      if (!program || !parsedContent.length) return

      // Re-run content generation for this single lesson via parse-and-regenerate
      const formData = new FormData()
      formData.append(
        'metadata',
        JSON.stringify({
          existingParsedContent: parsedContent,
          program,
          failedLessons: [{ moduleIndex, lessonIndex }],
          mode,
          lens: mode === 'generate' ? lens : undefined,
        })
      )

      try {
        const res = await fetch('/api/super-admin/training/parse-and-regenerate', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) return

        const reader = res.body?.getReader()
        const decoder = new TextDecoder()

        if (reader) {
          let buffer = ''
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() ?? ''

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const jsonStr = line.slice(6).trim()
              if (!jsonStr) continue

              try {
                const event: SSEEvent = JSON.parse(jsonStr)

                if (event.type === 'lesson-complete' && program) {
                  const updated = { ...program }
                  const updatedModules = [...updated.modules]
                  const updatedLessons = [...updatedModules[event.moduleIndex].lessons]
                  updatedLessons[event.lessonIndex] = {
                    ...updatedLessons[event.lessonIndex],
                    content: event.content,
                    error: undefined,
                  }
                  updatedModules[event.moduleIndex] = {
                    ...updatedModules[event.moduleIndex],
                    lessons: updatedLessons,
                  }
                  updated.modules = updatedModules
                  setProgram(updated)
                }

                if (event.type === 'quiz-complete' && program) {
                  const updated = { ...program }
                  const updatedModules = [...updated.modules]
                  const updatedLessons = [...updatedModules[event.moduleIndex].lessons]
                  updatedLessons[event.lessonIndex] = {
                    ...updatedLessons[event.lessonIndex],
                    quizQuestions: event.questions,
                  }
                  updatedModules[event.moduleIndex] = {
                    ...updatedModules[event.moduleIndex],
                    lessons: updatedLessons,
                  }
                  updated.modules = updatedModules
                  setProgram(updated)
                }
              } catch {
                // Skip
              }
            }
          }
        }
      } catch {
        // Retry failed silently — user can try again
      }
    },
    [program, parsedContent, mode, lens]
  )

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            {mode === 'structure' ? (
              <Upload className="h-5 w-5 text-purple-500" />
            ) : (
              <Sparkles className="h-5 w-5 text-purple-500" />
            )}
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {mode === 'structure' ? 'Import from Files' : 'Generate from Files'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <FileDropZone files={files} onFilesChange={setFiles} />

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Program Name
                </label>
                <input
                  type="text"
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  placeholder="e.g., Safeguarding Level 2"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                />
              </div>

              {mode === 'generate' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Content Lens
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setLens('autism')}
                      className={clsx(
                        'flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors',
                        lens === 'autism'
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-purple-300'
                      )}
                    >
                      <div className="font-semibold">Autism Lens</div>
                      <div className="text-xs mt-1 opacity-75">
                        Clear, literal language for autistic learners
                      </div>
                    </button>
                    <button
                      onClick={() => setLens('practitioner')}
                      className={clsx(
                        'flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors',
                        lens === 'practitioner'
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-purple-300'
                      )}
                    >
                      <div className="font-semibold">Practitioner Lens</div>
                      <div className="text-xs mt-1 opacity-75">
                        Professional content for caregivers
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                  {errorMessage}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Processing */}
          {step === 'processing' && (
            <GenerationProgress
              phase={phase}
              currentLesson={currentLesson}
              totalLessons={totalLessons}
              currentPhase={currentPhase}
              errors={errors}
            />
          )}

          {/* Step 3: Preview */}
          {(step === 'preview' || step === 'saving') && program && (
            <ProgramPreview
              program={program}
              onProgramChange={setProgram}
              onRetryLesson={retryLesson}
              onUploadMore={() => {
                // Reset to upload step, keeping existing program in state
                // so additional files can be parsed and used to regenerate failed lessons
                setStep('upload')
              }}
            />
          )}

          {/* Step 4: Done */}
          {step === 'done' && (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Program Created!
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Your new program has been saved as a draft. Activate modules and lessons when ready.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          {step === 'upload' && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={processFiles}
                disabled={files.length === 0 || !programName.trim()}
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2 text-sm font-bold transition-colors"
              >
                {mode === 'structure' ? (
                  <Upload className="h-4 w-4" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Process Files
              </button>
            </>
          )}

          {step === 'processing' && phase === 'error' && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setStep('upload')
                  setPhase('parsing')
                  setErrorMessage('')
                }}
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-4 py-2 text-sm font-bold transition-colors"
              >
                Try Again
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400"
              >
                Discard
              </button>
              <button
                onClick={saveProgram}
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-2 text-sm font-bold transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                Save Program
              </button>
            </>
          )}

          {step === 'saving' && (
            <button
              disabled
              className="inline-flex items-center gap-2 bg-green-600 opacity-50 text-white rounded-xl px-4 py-2 text-sm font-bold"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </button>
          )}

          {step === 'done' && (
            <button
              onClick={handleClose}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-4 py-2 text-sm font-bold transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/Simon/OneDrive/Documents/asd-training-app && git add components/super-admin/content-generation-modal.tsx && git commit -m "feat: add content generation modal orchestrating upload, progress, preview, save"
```

---

## Task 14: Integrate into Training Content Page

**Files:**
- Modify: `app/(super-admin)/super-admin/training/page.tsx`

- [ ] **Step 1: Add imports at the top of the file**

At the top of `app/(super-admin)/super-admin/training/page.tsx`, add the following imports after the existing imports (after line 9, the `clsx` import):

```typescript
import ContentGenerationModal from '@/components/super-admin/content-generation-modal'
import type { GenerationMode } from '@/lib/content-generator-types'
import { Upload, Sparkles } from 'lucide-react'
```

Note: `Upload` and `Sparkles` need to be added to the existing lucide-react import on line 4. Update line 4 to:

```typescript
import {
  BookOpen, Plus, ChevronUp, ChevronDown, ChevronRight,
  Loader2, Eye, Edit3, X, Trash2, Upload, Sparkles,
} from 'lucide-react'
```

And add the `ContentGenerationModal` and type imports as separate lines after the lucide import.

- [ ] **Step 2: Add state for the modal**

Inside the component function, add these state variables alongside the existing state (after the existing `useState` declarations, around line 68):

```typescript
const [generationModalOpen, setGenerationModalOpen] = useState(false)
const [generationMode, setGenerationMode] = useState<GenerationMode>('structure')
```

- [ ] **Step 3: Add the two buttons to the header**

In the header section (around line 227–241), replace the single "New Training Program" button with a button group that includes all three actions. Replace the current `<div className="flex items-center justify-between">` block:

Find (lines 227–241):
```tsx
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Training Content</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage training programs, modules, and lessons.
          </p>
        </div>
        <button
          onClick={() => setShowNewProgram(!showNewProgram)}
          className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-4 py-2 text-sm font-bold transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Training Program
        </button>
      </div>
```

Replace with:
```tsx
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Training Content</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage training programs, modules, and lessons.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setGenerationMode('structure')
              setGenerationModalOpen(true)
            }}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-bold transition-colors"
          >
            <Upload className="h-4 w-4" />
            Import from Files
          </button>
          <button
            onClick={() => {
              setGenerationMode('generate')
              setGenerationModalOpen(true)
            }}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2 text-sm font-bold transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Generate from Files
          </button>
          <button
            onClick={() => setShowNewProgram(!showNewProgram)}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-4 py-2 text-sm font-bold transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Program
          </button>
        </div>
      </div>
```

- [ ] **Step 4: Mount the modal**

At the very end of the component's JSX, just before the closing `</div>` of the outer container, add:

```tsx
      <ContentGenerationModal
        mode={generationMode}
        isOpen={generationModalOpen}
        onClose={() => setGenerationModalOpen(false)}
        onComplete={() => fetchPrograms()}
      />
```

- [ ] **Step 5: Verify the build compiles**

```bash
cd C:/Users/Simon/OneDrive/Documents/asd-training-app && npx tsc --noEmit 2>&1 | tail -20
```

Expected: No new errors introduced.

- [ ] **Step 6: Commit**

```bash
cd C:/Users/Simon/OneDrive/Documents/asd-training-app && git add app/(super-admin)/super-admin/training/page.tsx && git commit -m "feat: add Import/Generate from Files buttons to Training Content page"
```

---

## Task 15: Manual Testing & Smoke Test

**Files:** None (testing only)

- [ ] **Step 1: Start the dev server**

```bash
cd C:/Users/Simon/OneDrive/Documents/asd-training-app && npm run dev
```

- [ ] **Step 2: Verify the Training Content page loads**

Navigate to `http://localhost:3000/super-admin/training` (logged in as super admin). Verify:
- Three buttons appear in the header: "Import from Files" (blue), "Generate from Files" (green), "New Program" (purple)
- Clicking "Import from Files" opens a modal with a file drop zone, program name field, and no lens toggle
- Clicking "Generate from Files" opens a modal with a file drop zone, program name field, and lens toggle (Autism Lens / Practitioner Lens)
- Closing the modal resets all state

- [ ] **Step 3: Test file upload with a sample PDF**

Create a small test PDF or use an existing one. Upload it via the Import from Files modal:
- Verify the file appears in the file list with name, size, and an icon
- Verify you can remove the file
- Verify the "Process Files" button is disabled until both a file and program name are provided

- [ ] **Step 4: Test the full generation flow**

With a test PDF uploaded and a program name entered, click "Process Files". Verify:
- Progress indicator shows: "Parsing files..." → "Creating outline..." → "Generating lesson X of Y..."
- Preview step appears with editable modules, lessons, and quiz questions
- The program can be saved successfully
- The saved program appears in the training content list as a DRAFT

- [ ] **Step 5: Commit any fixes**

```bash
cd C:/Users/Simon/OneDrive/Documents/asd-training-app && git add -A && git commit -m "fix: address issues found during manual testing"
```

---

## Task 16: Next.js Config for Large File Uploads

**Files:**
- Modify: `next.config.js` (or `next.config.mjs`)

- [ ] **Step 1: Check the current Next.js config**

```bash
cd C:/Users/Simon/OneDrive/Documents/asd-training-app && ls next.config.* 2>/dev/null
```

- [ ] **Step 2: Add body size limit for the parse-files route**

The file upload API routes need a larger body size limit than the default 1MB. In the relevant API route files, add the Next.js route segment config. Add this to the top of `app/api/super-admin/training/parse-files/route.ts` (after imports):

```typescript
export const config = {
  api: {
    bodyParser: false, // We use formData, not JSON body parser
  },
}
```

Note: Next.js App Router uses `request.formData()` which handles multipart uploads without the body size limit issue. If uploads are rejected for large files, add this to `next.config.js`:

```javascript
// In next.config.js, inside the config object:
experimental: {
  serverActions: {
    bodySizeLimit: '50mb',
  },
},
```

Test with a large file to confirm. Only apply if needed.

- [ ] **Step 3: Commit if changes were needed**

```bash
cd C:/Users/Simon/OneDrive/Documents/asd-training-app && git add -A && git commit -m "feat: configure body size limits for file uploads"
```

---

## Summary

| Task | Description | Est. Time |
|------|-------------|-----------|
| 1 | Install dependencies | 2 min |
| 2 | Shared TypeScript types | 3 min |
| 3 | File parser (PDF, DOCX, PPTX) | 5 min |
| 4 | Content generator (Gemini orchestration) | 5 min |
| 5 | API: parse-files | 3 min |
| 6 | API: generate-outline | 3 min |
| 7 | API: generate-content (SSE) | 5 min |
| 8 | API: save-program | 4 min |
| 9 | API: parse-and-regenerate | 4 min |
| 10 | File drop zone component | 4 min |
| 11 | Generation progress component | 3 min |
| 12 | Program preview component | 5 min |
| 13 | Content generation modal | 5 min |
| 14 | Integrate into training page | 4 min |
| 15 | Manual testing | 10 min |
| 16 | Large file upload config | 2 min |
| **Total** | | **~67 min** |
