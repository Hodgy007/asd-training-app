// The Plan step's data: a course brief (audience, length, objectives) and an
// outline whose lessons are tied to objectives and source sections. Both come
// from the model and are then checked here, so a bad reference is repaired or
// reported rather than reaching lesson generation.

import { runPromptObject } from '@/lib/ai-runner'
import type { ParsedFile } from '@/lib/content-generator-types'
import { courseBriefSchema, outlineSchema, LIMITS, type CourseBrief, type Outline } from './schemas'
import { pruneOutline, uncoveredObjectives } from './outline'

export { pruneOutline }

// Gemini 2.5 Flash has a 1M token window; this keeps the outline call well
// inside Vercel's 300 s function ceiling.
export const MAX_OUTLINE_CHARS = 200_000

export function formatParsedContentForPrompt(files: ParsedFile[]): { text: string; truncated: boolean } {
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

  if (full.length <= MAX_OUTLINE_CHARS) return { text: full, truncated: false }
  return {
    text: full.slice(0, MAX_OUTLINE_CHARS) + '\n\n[Content truncated — document exceeds size limit]',
    truncated: true,
  }
}

/** Keeps at most 6 objectives and gives them stable ids o1…oN. */
export function normaliseBrief(brief: CourseBrief): { brief: CourseBrief; warnings: string[] } {
  const [min, max] = LIMITS.objectives
  const warnings: string[] = []
  const objectives = brief.objectives
    .filter((o) => o.text.trim())
    .slice(0, max)
    .map((o, i) => ({ id: `o${i + 1}`, text: o.text.trim() }))
  if (objectives.length < min) {
    warnings.push(`Only ${objectives.length} learning objective(s) were found. Add more on the Plan step if the material supports them.`)
  }
  return {
    brief: {
      audience: brief.audience.trim(),
      estimatedMinutes: Math.max(5, Math.round(brief.estimatedMinutes) || 0),
      objectives,
    },
    warnings,
  }
}

export function validateOutline(
  outline: Outline,
  files: ParsedFile[],
  brief: CourseBrief,
): { outline: Outline; warnings: string[] } {
  const warnings: string[] = []
  const objectiveIds = new Set(brief.objectives.map((o) => o.id))

  const modules = outline.modules.slice(0, LIMITS.modules[1]).map((mod) => {
    const lessons = mod.lessons.slice(0, LIMITS.lessonsPerModule[1]).flatMap((lesson) => {
      const sourceRefs = lesson.sourceRefs
        .map((ref) => {
          const file = files[ref.fileIndex]
          if (!file) return null
          const sectionIndices = ref.sectionIndices.filter((i) => Number.isInteger(i) && i >= 0 && i < file.sections.length)
          return sectionIndices.length > 0 ? { fileIndex: ref.fileIndex, sectionIndices } : null
        })
        .filter((ref): ref is NonNullable<typeof ref> => ref !== null)

      if (sourceRefs.length === 0) {
        warnings.push(`"${lesson.title}" was left out because it pointed at parts of the files that don't exist.`)
        return []
      }

      const ids = lesson.objectiveIds.filter((id) => objectiveIds.has(id))
      return [{ ...lesson, objectiveIds: ids, sourceRefs }]
    })
    return { ...mod, lessons }
  })

  const result = pruneOutline({ ...outline, modules })
  for (const objective of uncoveredObjectives(brief.objectives, result)) {
    warnings.push(`No lesson covers the objective "${objective.text}".`)
  }

  return { outline: result, warnings }
}

export async function generatePlan(
  files: ParsedFile[],
  programName: string,
): Promise<{ brief: CourseBrief; outline: Outline; warnings: string[]; truncated: boolean }> {
  const { text: formattedContent, truncated } = formatParsedContentForPrompt(files)

  const rawBrief = await runPromptObject('training.brief', { programName, formattedContent }, courseBriefSchema)
  const { brief, warnings: briefWarnings } = normaliseBrief(rawBrief)

  const rawOutline = await runPromptObject(
    'training.outline.v2',
    { programName, briefJson: JSON.stringify(brief), formattedContent },
    outlineSchema,
  )
  const { outline, warnings } = validateOutline({ ...rawOutline, programName }, files, brief)

  return { brief, outline, warnings: [...briefWarnings, ...warnings], truncated }
}
