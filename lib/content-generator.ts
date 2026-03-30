// lib/content-generator.ts
// Gemini orchestration layer for AI content generation

import { GoogleGenAI } from '@google/genai'
import type {
  ParsedFile,
  GenerationMode,
  GenerationLens,
  GeneratedOutline,
  GeneratedQuizQuestion,
  SourceRef,
} from './content-generator-types'

const MODEL = 'gemini-2.5-flash'

// ─── Private Helpers ─────────────────────────────────────────────────────────

function getAI(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured')
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
}

function extractJson(text: string): string {
  // Strip ```json ... ``` or ``` ... ``` code fences if present
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

/**
 * Formats all parsed files into a prompt-friendly string with numeric indices
 * so Gemini can reference them via fileIndex / sectionIndices.
 */
function formatParsedContentForPrompt(files: ParsedFile[]): string {
  return files
    .map((file, fileIndex) => {
      const sections = file.sections
        .map((section, sectionIndex) => {
          const heading = section.heading ? `[Section ${sectionIndex}: ${section.heading}]` : `[Section ${sectionIndex}]`
          return `${heading}\n${section.content}`
        })
        .join('\n\n')
      return `=== FILE ${fileIndex}: ${file.filename} ===\n${sections}`
    })
    .join('\n\n')
}

/**
 * Extracts specific sections from files using sourceRefs indices.
 */
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

// ─── Retry Helper ─────────────────────────────────────────────────────────────

/**
 * Generic retry helper with exponential backoff.
 */
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

/**
 * Generates a structured outline (modules + lessons) from parsed source files.
 *
 * Structure mode: organises existing material without inventing content.
 * Generate mode: designs pedagogically sound structure from the material.
 */
export async function generateOutline(
  files: ParsedFile[],
  mode: GenerationMode,
  programName: string
): Promise<GeneratedOutline> {
  const ai = getAI()
  const formattedContent = formatParsedContentForPrompt(files)

  const structurePrompt = `You are a training content organiser. Your task is to organise the provided source material into a structured training program.

RULES:
- Do NOT invent, add, or paraphrase any content.
- Only use material that exists in the source documents.
- Map every lesson to specific source sections using their numeric file and section indices.
- Propose a logical grouping of the existing material into modules and lessons.

Program name: "${programName}"

Source material (referenced by FILE index and Section index):
${formattedContent}

Return ONLY a valid JSON object matching this exact structure:
{
  "programName": "${programName}",
  "modules": [
    {
      "title": "Module title",
      "description": "Brief description of what this module covers",
      "lessons": [
        {
          "title": "Lesson title",
          "sourceRefs": [
            { "fileIndex": 0, "sectionIndices": [0, 1] }
          ]
        }
      ]
    }
  ]
}

Use numeric values for fileIndex and sectionIndices. Each lesson must reference at least one source section.`

  const generatePrompt = `You are an instructional designer. Your task is to design a pedagogically sound training program from the provided source material.

RULES:
- Design a clear, progressive learning structure (simple to complex).
- Map every lesson to the source sections that contain the relevant material.
- You may group and sequence material differently from how it appears in the source.
- Do NOT invent content — all lessons must be grounded in the source material.

Program name: "${programName}"

Source material (referenced by FILE index and Section index):
${formattedContent}

Return ONLY a valid JSON object matching this exact structure:
{
  "programName": "${programName}",
  "modules": [
    {
      "title": "Module title",
      "description": "Brief description of what this module covers",
      "lessons": [
        {
          "title": "Lesson title",
          "sourceRefs": [
            { "fileIndex": 0, "sectionIndices": [0, 1] }
          ]
        }
      ]
    }
  ]
}

Use numeric values for fileIndex and sectionIndices. Each lesson must reference at least one source section.`

  const prompt = mode === 'structure' ? structurePrompt : generatePrompt

  const response = await ai.models.generateContent({ model: MODEL, contents: prompt })
  const rawText = response.text ?? ''
  const jsonString = extractJson(rawText)

  const outline = JSON.parse(jsonString) as GeneratedOutline
  return outline
}

// ─── Lesson Content Generation ────────────────────────────────────────────────

/**
 * Generates HTML lesson content from source sections.
 *
 * Structure mode: preserves original wording, only adds HTML formatting.
 * Generate + Autism lens: clear, literal language with bullet points.
 * Generate + Practitioner lens: professional, practical strategies with reflection prompts.
 */
export async function generateLessonContent(
  files: ParsedFile[],
  lessonTitle: string,
  sourceRefs: SourceRef[],
  mode: GenerationMode,
  lens?: GenerationLens
): Promise<string> {
  const ai = getAI()
  const sourceSections = extractSourceSections(files, sourceRefs)

  let prompt: string

  if (mode === 'structure') {
    prompt = `You are a training content formatter. Your task is to format the provided source material as clean HTML for a lesson.

STRICT RULES:
- Use the original wording EXACTLY. Do NOT add, remove, or paraphrase any content.
- Only add HTML formatting (headings, paragraphs, lists, bold/italic).
- Do NOT add introductions, summaries, or any text not present in the source.
- Do NOT change the meaning or order of any sentences.

Lesson title: "${lessonTitle}"

Source material:
${sourceSections}

Return ONLY the HTML content for the lesson body (no <html>, <head>, or <body> tags).`
  } else if (lens === 'autism') {
    prompt = `You are an instructional writer creating training content for people learning to support individuals with autism.

WRITING STYLE:
- Use clear, literal, concrete language. Avoid idioms, metaphors, and ambiguous phrasing.
- Use short sentences. Use bullet points generously.
- Provide concrete, specific examples for every concept.
- Define any technical terms plainly.
- Structure content clearly with logical headings.

Lesson title: "${lessonTitle}"

Source material to base this lesson on:
${sourceSections}

Return ONLY valid HTML for the lesson body (no <html>, <head>, or <body> tags). Use appropriate headings (<h2>, <h3>), paragraphs (<p>), and lists (<ul>/<li>).`
  } else {
    // generate + practitioner lens (default for generate mode)
    prompt = `You are an instructional writer creating professional training content for caregivers and practitioners.

WRITING STYLE:
- Use professional but accessible language.
- Include practical strategies and real-world applications.
- Use case examples to illustrate key points.
- Include reflection prompts to encourage deeper thinking (e.g. "Consider a time when...").
- Structure content with clear headings and logical flow.

Lesson title: "${lessonTitle}"

Source material to base this lesson on:
${sourceSections}

Return ONLY valid HTML for the lesson body (no <html>, <head>, or <body> tags). Use appropriate headings (<h2>, <h3>), paragraphs (<p>), lists (<ul>/<li>), and blockquotes (<blockquote>) for reflection prompts.`
  }

  const response = await ai.models.generateContent({ model: MODEL, contents: prompt })
  return response.text ?? ''
}

// ─── Quiz Generation ──────────────────────────────────────────────────────────

/**
 * Generates multiple-choice quiz questions from lesson HTML content.
 * Reuses the prompt pattern from the existing generate-quiz route.
 */
export async function generateQuizForLesson(
  lessonContent: string,
  mode: GenerationMode,
  lens?: GenerationLens,
  questionCount = 5
): Promise<GeneratedQuizQuestion[]> {
  const ai = getAI()

  // Clamp questionCount to 1–10
  const count = Math.min(10, Math.max(1, questionCount))

  const plainText = stripHtml(lessonContent)

  let audienceContext: string
  if (mode === 'generate' && lens === 'autism') {
    audienceContext =
      'The audience is learning to support individuals with autism. Questions should use clear, literal language and test practical understanding.'
  } else if (mode === 'generate' && lens === 'practitioner') {
    audienceContext =
      'The audience is caregivers and practitioners. Questions should test professional understanding, practical application, and reflective practice.'
  } else {
    audienceContext =
      'The audience is training participants. Questions should test understanding of the key concepts covered.'
  }

  const prompt = `You are a training quiz generator. Based on the following lesson content, generate ${count} multiple-choice quiz questions.

${audienceContext}

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

  const questions = JSON.parse(jsonString) as GeneratedQuizQuestion[]
  return questions
}
