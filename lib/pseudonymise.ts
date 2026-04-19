/**
 * Pseudonymisation utilities for data sent to third-party AI processors (Gemini).
 *
 * The DPIA commits that no direct identifiers (child name, caregiver name/email,
 * org name, DOB, free-text identifying details) leave our systems when generating
 * AI insights. Callers must pass data through `pseudonymiseChildForAi` before
 * handing it to Gemini, and the AI response is a pattern report keyed only by
 * coded behaviour types — never by name.
 *
 * PR 1 ships this as a minimal, well-tested primitive. PR 3 wires it into
 * `lib/gemini.ts::generateInsightReport` and removes the real child name from
 * the prompt.
 */

export interface PseudonymisedChild {
  /** Coded reference, e.g. "child-abc123" — derived from child.id, not from name. */
  code: string
  /** Age bucket ("2y", "3y", "4–5y", "6y+") rather than DOB. */
  ageBucket: string
}

export interface PseudonymisedObservation {
  date: string
  behaviourType: string
  domain: string
  frequency: string
  context: string
}

export function deriveAgeBucket(dateOfBirth: Date, now: Date = new Date()): string {
  const ageMs = now.getTime() - dateOfBirth.getTime()
  const ageYears = ageMs / (365.25 * 24 * 60 * 60 * 1000)
  if (ageYears < 2) return 'under-2y'
  if (ageYears < 3) return '2y'
  if (ageYears < 4) return '3y'
  if (ageYears < 6) return '4–5y'
  return '6y+'
}

export function pseudonymiseChildForAi(child: {
  id: string
  dateOfBirth: Date
}): PseudonymisedChild {
  return {
    code: `child-${child.id.slice(0, 8)}`,
    ageBucket: deriveAgeBucket(child.dateOfBirth),
  }
}

export function pseudonymiseObservationForAi(observation: {
  date: Date
  behaviourType: string
  domain: string
  frequency: string
  context: string
}): PseudonymisedObservation {
  return {
    date: observation.date.toISOString().slice(0, 10),
    behaviourType: observation.behaviourType,
    domain: observation.domain,
    frequency: observation.frequency,
    context: observation.context,
  }
}
