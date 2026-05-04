export type CmiState = Record<string, string>
export type CmiInput = Record<string, unknown>

export interface ScormProgressUpdate {
  completed: boolean
  score: number | null
  /**
   * `navLocation` is the LMS-level TOC position (which leaf the learner
   * was viewing). Stored alongside the SCO's CMI so it can be restored on
   * resume without conflicting with anything the SCO writes to its own
   * `cmi.core.lesson_location` / `cmi.location` fields.
   */
  interactionData: { scorm: CmiState; navLocation?: string }
}

const COMPLETE_LESSON_STATUSES = new Set(['completed', 'passed'])

function parseNumber(value: string | undefined): number | null {
  if (value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function writeFlattenedCmi(
  out: CmiState,
  prefix: string,
  value: unknown,
): void {
  if (value === undefined || value === null) return
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    out[prefix] = String(value)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => writeFlattenedCmi(out, `${prefix}.${index}`, item))
    return
  }
  if (isPlainRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      writeFlattenedCmi(out, prefix ? `${prefix}.${key}` : key, child)
    }
  }
}

function setIfPresent(out: CmiState, key: string, value: unknown): void {
  if (value === undefined || value === null) return
  out[key] = String(value)
}

export function normaliseCmiState(input: CmiInput): CmiState {
  const flattened: CmiState = {}
  writeFlattenedCmi(flattened, '', input)

  const out: CmiState = {}
  for (const [key, value] of Object.entries(flattened)) {
    if (key.startsWith('runtimeData.cmi.')) {
      out[key.replace(/^runtimeData\./, '')] = value
    } else if (key.startsWith('runtimeData.adl.')) {
      out[key.replace(/^runtimeData\./, '')] = value
    } else if (key.startsWith('cmi.') || key.startsWith('adl.')) {
      out[key] = value
    }
  }

  setIfPresent(out, 'cmi.completion_status', out['cmi.completion_status'] ?? input.completionStatus)
  setIfPresent(out, 'cmi.success_status', out['cmi.success_status'] ?? input.successStatus)

  if (isPlainRecord(input.score)) {
    setIfPresent(out, 'cmi.score.scaled', out['cmi.score.scaled'] ?? input.score.scaled)
    setIfPresent(out, 'cmi.score.raw', out['cmi.score.raw'] ?? input.score.raw)
    setIfPresent(out, 'cmi.score.max', out['cmi.score.max'] ?? input.score.max)
  } else {
    setIfPresent(out, 'cmi.score.raw', out['cmi.score.raw'] ?? input.score)
  }

  return out
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
export function mapScormStateToProgress(
  cmi: CmiState,
  navLocation?: string | null,
): ScormProgressUpdate {
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
  // Clamp percentage to [0, 100] so a misbehaving SCO that reports raw=120
  // doesn't end up with a 120% score on reports.
  if (score !== null) {
    score = Math.max(0, Math.min(100, score))
  }

  const trimmedNav = typeof navLocation === 'string' ? navLocation.trim() : ''
  return {
    completed,
    score,
    interactionData: {
      scorm: cmi,
      ...(trimmedNav.length > 0 ? { navLocation: trimmedNav } : {}),
    },
  }
}
