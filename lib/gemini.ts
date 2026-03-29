import { GoogleGenAI } from '@google/genai'
import { differenceInYears, differenceInMonths } from 'date-fns'

const DISCLAIMER =
  'These observations are for discussion with your GP, health visitor, or SENCO. This is not a diagnosis.'

const MODEL = 'gemini-2.5-flash'

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
  dateOfBirth: Date
): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    return 'AI insights are not available. Please configure the GEMINI_API_KEY environment variable.'
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  const age = getAgeString(dateOfBirth)
  const observationText = formatObservationsForPrompt(observations)

  const prompt = `You are an assistant supporting carers and professionals who work with children.
Your role is to summarise observational data to help identify patterns.
You NEVER provide a diagnosis. You NEVER suggest a child has autism.
You help identify patterns for discussion with healthcare professionals.
Use warm, accessible, non-clinical language suitable for a practitioner.

Child: ${childName}, Age: ${age}
Observation period: Last 4 weeks
Observations:
${observationText}

Please provide a brief summary (2-3 sentences) of the observed patterns in practitioner-friendly language.
Focus only on what has been observed — do not speculate or diagnose.
End with: "${DISCLAIMER}"`

  const response = await ai.models.generateContent({ model: MODEL, contents: prompt })
  return response.text ?? ''
}

export async function detectPatterns(
  observations: Array<{
    date: Date
    behaviourType: string
    domain: string
    frequency: string
    context: string
    notes?: string | null
  }>
): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    return 'AI pattern detection is not available. Please configure the GEMINI_API_KEY environment variable.'
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  const observationText = formatObservationsForPrompt(observations)

  const prompt = `You are an assistant supporting carers and professionals who work with children.
Your role is to identify patterns in observational data.
You NEVER provide a diagnosis. You NEVER suggest a child has autism.

Observations:
${observationText}

Identify which domains (Social Communication, Behaviour and Play, Sensory Responses) show the most frequent patterns.
List 2-4 specific behaviour patterns you notice, using carer-friendly language.
Format as a brief bulleted list.
Do not speculate beyond what the data shows.`

  const response = await ai.models.generateContent({ model: MODEL, contents: prompt })
  return response.text ?? ''
}

export async function generateActionGuidance(patterns: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    return 'AI guidance is not available. Please configure the GEMINI_API_KEY environment variable.'
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

  const prompt = `You are an assistant supporting carers and professionals who work with children.
Your role is to suggest practical next steps based on observed patterns.
You NEVER provide a diagnosis. You NEVER suggest a child has autism.
You suggest supportive actions and professional consultations only.

Observed patterns:
${patterns}

Provide 3-4 practical, actionable next steps for the practitioner.
Include suggestions about who to speak to (GP, health visitor, SENCO, speech therapist etc.).
Use warm, encouraging, non-alarming language.
Format as a bulleted list.
End with: "${DISCLAIMER}"`

  const response = await ai.models.generateContent({ model: MODEL, contents: prompt })
  return response.text ?? ''
}

export async function generateInsightReport(
  child: {
    name: string
    dateOfBirth: Date
    notes?: string | null
  },
  observations: Array<{
    date: Date
    behaviourType: string
    domain: string
    frequency: string
    context: string
    notes?: string | null
  }>
): Promise<{ summary: string; patterns: string; recommendations: string }> {
  if (!process.env.GEMINI_API_KEY) {
    const fallback =
      'AI insights are not available. Please configure the GEMINI_API_KEY environment variable.'
    return { summary: fallback, patterns: fallback, recommendations: fallback }
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  const age = getAgeString(child.dateOfBirth)
  const observationText = formatObservationsForPrompt(observations)

  const prompt = `You are an assistant supporting carers and professionals who work with children.
Your role is to summarise observational data to help identify patterns.
You NEVER provide a diagnosis. You NEVER suggest a child has autism.
You help identify patterns for discussion with healthcare professionals.
Use warm, accessible, non-clinical language suitable for a practitioner.

Child: ${child.name}, Age: ${age}
${child.notes ? `Practitioner notes: ${child.notes}` : ''}
Observation period: Last 4 weeks
Total observations: ${observations.length}

Observations:
${observationText}

Please provide your response in exactly this format with these three sections:

SUMMARY:
[2-3 sentences summarising the overall observation picture in carer-friendly language. Focus on patterns, not diagnoses.]

PATTERNS:
[Bullet points identifying the main behavioural patterns observed across domains. Be specific and factual.]

RECOMMENDATIONS:
[3-4 practical next steps for the practitioner, including who to speak to. Be encouraging and supportive.]

Always end the RECOMMENDATIONS section with: "${DISCLAIMER}"`

  const response = await ai.models.generateContent({ model: MODEL, contents: prompt })
  const text = response.text ?? ''

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
