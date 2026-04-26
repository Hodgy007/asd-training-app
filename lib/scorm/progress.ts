export type CmiState = Record<string, string>

export interface ScormProgressUpdate {
  completed: boolean
  score: number | null
  interactionData: { scorm: CmiState }
}

const COMPLETE_LESSON_STATUSES = new Set(['completed', 'passed'])

function parseNumber(value: string | undefined): number | null {
  if (value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/**
 * Map either a SCORM 1.2 or SCORM 2004 CMI snapshot onto our progress shape.
 *
 * SCORM 1.2 keys: `cmi.core.lesson_status`, `cmi.core.score.raw/max`.
 * SCORM 2004 keys: `cmi.completion_status`, `cmi.success_status`,
 *                  `cmi.score.raw/max/scaled`.
 *
 * We accept both shapes — packages occasionally emit a hybrid (e.g. when
 * authoring tools target 1.2 but their runtime shim adds 2004 keys).
 */
export function mapScormStateToProgress(cmi: CmiState): ScormProgressUpdate {
  // Status — prefer 2004 keys when present, fall back to 1.2.
  const lessonStatus = (cmi['cmi.core.lesson_status'] ?? '').toLowerCase().trim()
  const completionStatus = (cmi['cmi.completion_status'] ?? '').toLowerCase().trim()
  const successStatus = (cmi['cmi.success_status'] ?? '').toLowerCase().trim()

  const completed =
    COMPLETE_LESSON_STATUSES.has(lessonStatus) ||
    completionStatus === 'completed' ||
    successStatus === 'passed'

  // Score: prefer SCORM 2004 `cmi.score.scaled` (a 0–1 fraction) when present,
  // otherwise fall back to raw/max in either the 1.2 (`cmi.core.score.*`) or
  // 2004 (`cmi.score.*`) location.
  let score: number | null = null
  const scaled = parseNumber(cmi['cmi.score.scaled'])
  if (scaled !== null) {
    const clamped = Math.max(0, Math.min(1, scaled))
    score = Math.round(clamped * 100)
  } else {
    const raw =
      parseNumber(cmi['cmi.core.score.raw']) ?? parseNumber(cmi['cmi.score.raw'])
    const max =
      parseNumber(cmi['cmi.core.score.max']) ?? parseNumber(cmi['cmi.score.max'])
    if (raw !== null) {
      if (max !== null && max > 0 && max !== 100) {
        score = Math.round((raw / max) * 100)
      } else {
        score = Math.round(raw)
      }
    }
  }

  return {
    completed,
    score,
    interactionData: { scorm: cmi },
  }
}
