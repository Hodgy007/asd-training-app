/**
 * Aggregate per-question performance across many CMI snapshots.
 *
 * SCORM packages report individual quiz answers via the `cmi.interactions.N.*`
 * keys. We persist the full CMI snapshot per learner per lesson on
 * `TrainingProgress.interactionData.scorm`, which means every answer is
 * already in the database — this module just buckets them by question id and
 * computes per-question correctness rates.
 *
 * The output is **anonymised**: it groups by question, never by learner.
 *
 * SCORM 1.2 fields used:
 *   `cmi.interactions.N.id`       — question identifier (author-defined)
 *   `cmi.interactions.N.result`   — "correct" / "wrong" / numeric
 *   `cmi.interactions.N.latency`  — "HHHH:MM:SS.SS"
 *
 * SCORM 2004 fields used (additional):
 *   `cmi.interactions.N.description` — question text (1.2 doesn't carry this)
 *   `cmi.interactions.N.result`      — "correct" / "incorrect" / numeric
 *   `cmi.interactions.N.latency`     — ISO 8601 duration "PT[h]H[m]M[s]S"
 */

export interface QuestionAggregate {
  /** Author-defined question id, e.g. "Playing_Q1". */
  id: string
  /** SCORM 2004 only; SCORM 1.2 packages don't include question prose. */
  description?: string
  attempts: number
  correct: number
  pctCorrect: number
  /** Mean response time in seconds, or null if no learner reported one. */
  avgLatencySeconds: number | null
}

interface InteractionRow {
  id: string
  description?: string
  result?: string
  latency?: string
}

/**
 * Walk one CMI snapshot and collect every `cmi.interactions.N.*` key into
 * one record per index. Uses a Map keyed by the numeric index so the order
 * of insertion in the original Object.entries() doesn't matter.
 */
export function extractInteractions(
  cmi: Record<string, string>,
): InteractionRow[] {
  const byIndex = new Map<number, Partial<InteractionRow>>()
  for (const [key, value] of Object.entries(cmi)) {
    const m = key.match(/^cmi\.interactions\.(\d+)\.(.+)$/)
    if (!m) continue
    const idx = Number(m[1])
    const field = m[2]
    let row = byIndex.get(idx)
    if (!row) {
      row = {}
      byIndex.set(idx, row)
    }
    if (field === 'id') row.id = value
    else if (field === 'description') row.description = value
    else if (field === 'result') row.result = value
    else if (field === 'latency') row.latency = value
  }
  return [...byIndex.values()].filter(
    (r): r is InteractionRow => typeof r.id === 'string' && r.id.length > 0,
  )
}

/**
 * Parse SCORM 1.2 "HHHH:MM:SS.SS" or SCORM 2004 ISO 8601 ("PT1M23.45S")
 * latency strings into seconds. Returns null when the input is missing or
 * not in either format.
 */
export function parseLatencySeconds(latency: string | undefined): number | null {
  if (!latency) return null
  // SCORM 2004: ISO 8601 duration. We only support time component (PnTnHnMnS).
  const iso = latency.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?)?$/,
  )
  if (iso && (iso[1] || iso[2] || iso[3] || iso[4])) {
    const days = Number(iso[1] ?? 0)
    const hours = Number(iso[2] ?? 0)
    const mins = Number(iso[3] ?? 0)
    const secs = Number(iso[4] ?? 0)
    return days * 86400 + hours * 3600 + mins * 60 + secs
  }
  // SCORM 1.2: HHHH:MM:SS.SS
  const v12 = latency.match(/^(\d{1,4}):(\d{2}):(\d{2}(?:\.\d+)?)$/)
  if (v12) {
    return Number(v12[1]) * 3600 + Number(v12[2]) * 60 + Number(v12[3])
  }
  return null
}

const CORRECT_RESULTS = new Set(['correct'])

/**
 * Aggregate quiz performance across an array of CMI snapshots (one per
 * learner per attempt). Returns a list of question aggregates sorted by
 * `pctCorrect` ascending — worst-performing questions first, matching the
 * "what needs revisiting" use case.
 *
 * Question ids are author-defined and may be reused across unrelated lesson
 * packages; callers should scope `snapshots` to a single lesson before
 * calling this.
 */
export function aggregateQuizPerformance(
  snapshots: Array<Record<string, string>>,
): QuestionAggregate[] {
  const acc = new Map<
    string,
    {
      description?: string
      attempts: number
      correct: number
      latencyTotal: number
      latencyCount: number
    }
  >()

  for (const snapshot of snapshots) {
    const interactions = extractInteractions(snapshot)
    for (const i of interactions) {
      let row = acc.get(i.id)
      if (!row) {
        row = { attempts: 0, correct: 0, latencyTotal: 0, latencyCount: 0 }
        acc.set(i.id, row)
      }
      // Keep the most recent description seen — author may revise
      // question text and we'd rather show the latest.
      if (i.description) row.description = i.description
      row.attempts++
      const result = (i.result ?? '').toLowerCase().trim()
      if (CORRECT_RESULTS.has(result)) row.correct++
      const lat = parseLatencySeconds(i.latency)
      if (lat !== null && lat >= 0) {
        row.latencyTotal += lat
        row.latencyCount++
      }
    }
  }

  return [...acc.entries()]
    .map<QuestionAggregate>(([id, row]) => ({
      id,
      description: row.description,
      attempts: row.attempts,
      correct: row.correct,
      pctCorrect:
        row.attempts > 0 ? Math.round((row.correct / row.attempts) * 100) : 0,
      avgLatencySeconds:
        row.latencyCount > 0
          ? Math.round((row.latencyTotal / row.latencyCount) * 10) / 10
          : null,
    }))
    .sort((a, b) => a.pctCorrect - b.pctCorrect)
}
