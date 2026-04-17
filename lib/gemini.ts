import { runPrompt } from '@/lib/ai-runner'
import { differenceInYears, differenceInMonths } from 'date-fns'

const DISCLAIMER =
  'These observations are for discussion with your GP, health visitor, or SENCO. This is not a diagnosis.'

function getAgeString(dateOfBirth: Date): string {
  const years = differenceInYears(new Date(), dateOfBirth)
  const months = differenceInMonths(new Date(), dateOfBirth) % 12
  if (years === 0) return `${months} months`
  if (months === 0) return `${years} years`
  return `${years} years and ${months} months`
}

function formatObservationsForPrompt(
  observations: Array<{
    date: Date
    behaviourType: string
    domain: string
    frequency: string
    context: string
    notes?: string | null
  }>
): string {
  return observations
    .map((o) => {
      const date = new Date(o.date).toLocaleDateString('en-GB')
      const domain = o.domain
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (l) => l.toUpperCase())
      const frequency = o.frequency.charAt(0) + o.frequency.slice(1).toLowerCase()
      const context = o.context.charAt(0) + o.context.slice(1).toLowerCase()
      let entry = `- [${date}] ${o.behaviourType} (${domain} | ${frequency} | ${context})`
      if (o.notes) entry += `: ${o.notes}`
      return entry
    })
    .join('\n')
}

export async function generateObservationSummary(
  observations: Array<{
    date: Date
    behaviourType: string
    domain: string
    frequency: string
    context: string
    notes?: string | null
  }>,
  childName: string,
  dateOfBirth: Date,
): Promise<string> {
  const age = getAgeString(dateOfBirth)
  const observationText = formatObservationsForPrompt(observations)
  return runPrompt('observations.summary', { childName, age, observationText })
}

export async function detectPatterns(
  observations: Array<{
    date: Date
    behaviourType: string
    domain: string
    frequency: string
    context: string
    notes?: string | null
  }>,
): Promise<string> {
  const observationText = formatObservationsForPrompt(observations)
  return runPrompt('observations.patterns', { observationText })
}

export async function generateActionGuidance(patterns: string): Promise<string> {
  return runPrompt('observations.actions', { patterns })
}

export async function generateInsightReport(
  child: { name: string; dateOfBirth: Date; notes?: string | null },
  observations: Array<{
    date: Date
    behaviourType: string
    domain: string
    frequency: string
    context: string
    notes?: string | null
  }>,
): Promise<{ summary: string; patterns: string; recommendations: string }> {
  const age = getAgeString(child.dateOfBirth)
  const observationText = formatObservationsForPrompt(observations)

  const text = await runPrompt('observations.report', {
    childName: child.name,
    age,
    practitionerNotes: child.notes ? `Practitioner notes: ${child.notes}` : '',
    observationCount: String(observations.length),
    observationText,
  })

  const summaryMatch = text.match(/SUMMARY:\s*([\s\S]*?)(?=PATTERNS:|$)/i)
  const patternsMatch = text.match(/PATTERNS:\s*([\s\S]*?)(?=RECOMMENDATIONS:|$)/i)
  const recommendationsMatch = text.match(/RECOMMENDATIONS:\s*([\s\S]*?)$/i)

  return {
    summary: summaryMatch ? summaryMatch[1].trim() : text,
    patterns: patternsMatch ? patternsMatch[1].trim() : 'Patterns could not be extracted.',
    recommendations: recommendationsMatch
      ? recommendationsMatch[1].trim()
      : `Please discuss these observations with your GP or health visitor.\n\n${DISCLAIMER}`,
  }
}
