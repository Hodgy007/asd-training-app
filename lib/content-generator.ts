// lib/content-generator.ts
// AI Gateway orchestration layer for AI content generation

import { runPrompt, AI_FEATURE_UNAVAILABLE } from '@/lib/ai-runner'
import type {
  ParsedFile,
  GenerationMode,
  GenerationLens,
  GeneratedOutline,
  GeneratedQuizQuestion,
  SourceRef,
} from './content-generator-types'

// ─── Private Helpers ─────────────────────────────────────────────────────────

// Hard caps to keep prompts within the AI model's practical latency budget.
// Gemini 2.5 Flash has a 1M token window; these limits prevent multi-minute
// completions that exhaust Vercel's 300 s serverless ceiling.
const MAX_OUTLINE_CHARS = 200_000
const MAX_LESSON_SOURCE_CHARS = 30_000

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

function formatParsedContentForPrompt(files: ParsedFile[]): string {
  const full = files
    .map((file, fileIndex) => {
      const sections = file.sections
        .map((section, sectionIndex) => {
          const heading = section.heading
            ? `[Section ${sectionIndex}: ${section.heading}]`
            : `[Section ${sectionIndex}]`
          return `${heading}\n${section.content}`
        })
        .join('\n\n')
      return `=== FILE ${fileIndex}: ${file.filename} ===\n${sections}`
    })
    .join('\n\n')

  if (full.length <= MAX_OUTLINE_CHARS) return full
  return full.slice(0, MAX_OUTLINE_CHARS) + '\n\n[Content truncated — document exceeds size limit]'
}

function extractSourceSections(files: ParsedFile[], sourceRefs: SourceRef[]): string {
  const parts: string[] = []

  for (const ref of sourceRefs) {
    const file = files[ref.fileIndex]
    if (!file) continue

    for (const sectionIndex of ref.sectionIndices) {
      const section = file.sections[sectionIndex]
      if (!section) continue

      const heading = section.heading
        ? `[${file.filename} — Section ${sectionIndex}: ${section.heading}]`
        : `[${file.filename} — Section ${sectionIndex}]`

      let chunk = `${heading}\n${section.content}`

      if (section.images && section.images.length > 0) {
        chunk += `\n\nImages in this section:\n${section.images.map(u => `- ${u}`).join('\n')}`
      }

      parts.push(chunk)
    }
  }

  const joined = parts.join('\n\n')
  if (joined.length <= MAX_LESSON_SOURCE_CHARS) return joined
  return joined.slice(0, MAX_LESSON_SOURCE_CHARS) + '\n\n[Content truncated]'
}

function sourceRefsHaveImages(files: ParsedFile[], sourceRefs: SourceRef[]): boolean {
  return sourceRefs.some(ref => {
    const file = files[ref.fileIndex]
    if (!file) return false
    return ref.sectionIndices.some(idx => (file.sections[idx]?.images?.length ?? 0) > 0)
  })
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError
}

// ─── Outline Generation ───────────────────────────────────────────────────────

export async function generateOutline(
  files: ParsedFile[],
  mode: GenerationMode,
  programName: string
): Promise<GeneratedOutline> {
  const formattedContent = formatParsedContentForPrompt(files)
  const key = mode === 'structure' ? 'training.outlineStructure' : 'training.outlineGenerate'
  const text = await runPrompt(key, { programName, formattedContent })
  if (text === AI_FEATURE_UNAVAILABLE) throw new Error(AI_FEATURE_UNAVAILABLE)
  const jsonString = extractJson(text)
  return JSON.parse(jsonString) as GeneratedOutline
}

// ─── Lesson Content Generation ────────────────────────────────────────────────

export async function generateLessonContent(
  files: ParsedFile[],
  lessonTitle: string,
  sourceRefs: SourceRef[],
  mode: GenerationMode,
  lens?: GenerationLens
): Promise<string> {
  const sourceText = extractSourceSections(files, sourceRefs)

  let modeGuidance: string
  if (mode === 'structure') {
    modeGuidance =
      'STRUCTURE MODE: Use the original wording EXACTLY. Do NOT add, remove, or paraphrase content. Only add HTML formatting.'
  } else if (lens === 'autism') {
    modeGuidance =
      'AUTISM LENS: Use clear, literal, concrete language. Short sentences, bullet points, concrete examples. Define technical terms plainly.'
  } else {
    modeGuidance =
      'PRACTITIONER LENS: Professional but accessible. Include practical strategies, case examples, and reflection prompts (<blockquote>) to encourage deeper thinking.'
  }

  if (sourceRefsHaveImages(files, sourceRefs)) {
    modeGuidance +=
      '\n\nIMAGES: Where image URLs are listed in the source material, embed them in the HTML at the relevant point using <img src="URL" alt="Training image" style="max-width:100%;border-radius:8px;margin:16px 0"> tags.'
  }

  const text = await runPrompt('training.lessonContent', {
    lessonTitle,
    sourceText,
    modeGuidance,
  })
  if (text === AI_FEATURE_UNAVAILABLE) throw new Error(AI_FEATURE_UNAVAILABLE)
  return text
}

// ─── Quiz Generation ──────────────────────────────────────────────────────────

export async function generateQuizForLesson(
  lessonContent: string,
  mode: GenerationMode,
  lens?: GenerationLens,
  questionCount = 5
): Promise<GeneratedQuizQuestion[]> {
  const count = Math.min(10, Math.max(1, questionCount))
  const plainText = stripHtml(lessonContent)

  // lens unused here; the quiz prompt treats all audiences the same. Mode likewise.
  void mode
  void lens

  const text = await runPrompt('training.quizGenerate', {
    count: String(count),
    plainText,
  })
  if (text === AI_FEATURE_UNAVAILABLE) throw new Error(AI_FEATURE_UNAVAILABLE)
  const jsonString = extractJson(text)
  return JSON.parse(jsonString) as GeneratedQuizQuestion[]
}
