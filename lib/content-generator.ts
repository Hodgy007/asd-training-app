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
  return files
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

      parts.push(`${heading}\n${section.content}`)
    }
  }

  return parts.join('\n\n')
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
