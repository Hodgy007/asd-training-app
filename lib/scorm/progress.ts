export type CmiState = Record<string, string>

export interface ScormProgressUpdate {
  completed: boolean
  score: number | null
  interactionData: { scorm: CmiState }
}

const COMPLETE_STATUSES = new Set(['completed', 'passed'])

function parseNumber(value: string | undefined): number | null {
  if (value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function mapScormStateToProgress(cmi: CmiState): ScormProgressUpdate {
  const status = (cmi['cmi.core.lesson_status'] ?? '').toLowerCase().trim()
  const completed = COMPLETE_STATUSES.has(status)

  const raw = parseNumber(cmi['cmi.core.score.raw'])
  const max = parseNumber(cmi['cmi.core.score.max'])
  let score: number | null = null
  if (raw !== null) {
    if (max !== null && max > 0 && max !== 100) {
      score = Math.round((raw / max) * 100)
    } else {
      score = Math.round(raw)
    }
  }

  return {
    completed,
    score,
    interactionData: { scorm: cmi },
  }
}
