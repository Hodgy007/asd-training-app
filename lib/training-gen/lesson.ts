// One lesson at a time: the model returns the lesson as parts (lessonDraftSchema)
// and assembleLesson() lays them out in the same order every time, so learners
// always know where to find what they'll learn and the key points.

import { runPromptObject } from '@/lib/ai-runner'
import { generateBlockPlaceholder } from '@/lib/interactive-blocks'
import type { InteractiveBlock } from '@/types/interactive'
import type { GenerationLens, ParsedFile, SourceRef } from '@/lib/content-generator-types'
import { lessonDraftSchema, LIMITS, type CourseBrief, type LessonDraft, type Outline } from './schemas'

export const MAX_LESSON_SOURCE_CHARS = 30_000
const FALLBACK_ALT = 'Image from the source material'

export function lensGuidance(lens: GenerationLens): string {
  return lens === 'autism'
    ? 'Use clear, literal, concrete language. Short sentences. One idea per paragraph. Explain any technical term the first time it appears. No idioms, sarcasm or rhetorical questions.'
    : 'Professional but accessible. Focus on practical strategies drawn from the source. Where the source supports it, end a section with a short reflection question in a <blockquote>. Never invent case examples.'
}

export function outlineContext(outline: Outline, moduleIndex: number, lessonIndex: number): string {
  return outline.modules
    .flatMap((mod, m) =>
      mod.lessons.map((lesson, l) => {
        const line = `Module ${m + 1} › Lesson ${l + 1}: ${lesson.title} — ${lesson.summary}`
        return m === moduleIndex && l === lessonIndex ? `${line} (THIS LESSON)` : line
      }),
    )
    .join('\n')
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function list(items: string[]): string {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
}

/** Sets every <img>'s alt from imageAlts (by src), or the neutral fallback. */
function applyImageAlts(html: string, imageAlts: LessonDraft['imageAlts']): string {
  const bySrc = new Map(imageAlts.map((a) => [a.url, a.alt.trim()]))
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = tag.match(/\bsrc\s*=\s*"([^"]*)"/i)?.[1] ?? ''
    const alt = escapeHtml(bySrc.get(src) || FALLBACK_ALT)
    const withoutAlt = tag.replace(/\s+alt\s*=\s*"[^"]*"/i, '')
    return withoutAlt.replace(/^<img\b/i, `<img alt="${alt}"`)
  })
}

function checkInBlock(draft: LessonDraft, blockId: string): InteractiveBlock | null {
  const checkIn = draft.checkIn
  if (!checkIn) return null
  const options = checkIn.options.map((o) => o.trim()).filter(Boolean).slice(0, LIMITS.checkInOptions)
  if (options.length < LIMITS.checkInOptions) return null
  const correctAnswer = options[checkIn.correctIndex]
  if (correctAnswer === undefined) return null
  return {
    id: blockId,
    type: 'knowledge-check',
    title: 'Check your understanding',
    instructions: 'Choose the answer you think is right.',
    order: 0,
    data: {
      questions: [{ id: `${blockId}-q1`, question: checkIn.question, options, correctAnswer, feedback: checkIn.feedback }],
    },
  }
}

export function assembleLesson(
  draft: LessonDraft,
  opts: { includeCheckIn: boolean; blockId: string },
): { content: string; interactiveBlocks: InteractiveBlock[] } {
  const learn = draft.whatYouWillLearn.filter((s) => s.trim()).slice(0, LIMITS.whatYouWillLearn[1])
  const keyPoints = draft.keyPoints.filter((s) => s.trim()).slice(0, LIMITS.keyPoints[1])
  const block = opts.includeCheckIn ? checkInBlock(draft, opts.blockId) : null

  const parts = [
    `<h2>What you'll learn</h2>${list(learn)}`,
    applyImageAlts(draft.bodyHtml, draft.imageAlts),
    block ? generateBlockPlaceholder(block.id, block.title) : '',
    `<h2>Key points</h2>${list(keyPoints)}`,
  ]
  return { content: parts.filter(Boolean).join('\n'), interactiveBlocks: block ? [block] : [] }
}

function extractSourceSections(files: ParsedFile[], sourceRefs: SourceRef[]): { text: string; images: string[] } {
  const parts: string[] = []
  const images: string[] = []
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
      images.push(...(section.images ?? []))
    }
  }
  const joined = parts.join('\n\n')
  const text = joined.length <= MAX_LESSON_SOURCE_CHARS
    ? joined
    : joined.slice(0, MAX_LESSON_SOURCE_CHARS) + '\n\n[Content truncated]'
  return { text, images }
}

export async function generateLesson(args: {
  files: ParsedFile[]
  outline: Outline
  brief: CourseBrief
  moduleIndex: number
  lessonIndex: number
  lens: GenerationLens
  includeCheckIn: boolean
  blockId?: string
}): Promise<{ content: string; interactiveBlocks: InteractiveBlock[] }> {
  const lesson = args.outline.modules[args.moduleIndex]?.lessons[args.lessonIndex]
  if (!lesson) throw new Error('Lesson not found in outline')

  const { text: sourceText, images } = extractSourceSections(args.files, lesson.sourceRefs)
  const objectives = args.brief.objectives.filter((o) => lesson.objectiveIds.includes(o.id))

  const draft = await runPromptObject(
    'training.lesson.v2',
    {
      lessonTitle: lesson.title,
      lessonSummary: lesson.summary,
      lessonObjectives: objectives.map((o) => `- ${o.text}`).join('\n') || '(none)',
      outlineContext: outlineContext(args.outline, args.moduleIndex, args.lessonIndex),
      sourceText,
      lensGuidance: lensGuidance(args.lens),
      imageList: images.length ? images.map((u) => `- ${u}`).join('\n') : '(no images)',
    },
    lessonDraftSchema,
  )

  return assembleLesson(draft, {
    includeCheckIn: args.includeCheckIn,
    blockId: args.blockId ?? crypto.randomUUID(),
  })
}
