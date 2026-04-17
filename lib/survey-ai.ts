import { runPrompt } from '@/lib/ai-runner'
import type { ParsedFile } from './content-generator-types'

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) return fenced[1].trim()
  return text.trim()
}

export interface GeneratedSurvey {
  title: string
  description: string
  questions: Array<{
    type: 'MULTIPLE_CHOICE' | 'YES_NO' | 'FREE_TEXT' | 'RATING_SCALE' | 'MULTI_SELECT'
    question: string
    options?: string[]
    required: boolean
    order: number
  }>
}

export async function generateSurveyFromTopic(
  topic: string,
  audience?: string,
): Promise<GeneratedSurvey> {
  const text = await runPrompt('survey.fromTopic', { topic, audience: audience ?? '' })
  return JSON.parse(extractJson(text)) as GeneratedSurvey
}

export async function generateSurveyFromFiles(files: ParsedFile[]): Promise<GeneratedSurvey> {
  const fileContent = files
    .map((f) => {
      const sections = f.sections
        .map((s) => `### ${s.heading ?? ''}\n${s.content}`)
        .join('\n\n')
      return `## File: ${f.filename}\n${sections}`
    })
    .join('\n\n---\n\n')
  const text = await runPrompt('survey.fromFiles', { fileContent })
  return JSON.parse(extractJson(text)) as GeneratedSurvey
}

// ── Results Insights ──

interface ResultsData {
  surveyTitle: string
  totalResponses: number
  questions: Array<{
    question: string
    type: string
    responses: Array<{
      value: string
      role: string
      orgName: string | null
    }>
  }>
}

function buildQuestionSummaries(data: ResultsData): string {
  return data.questions
    .map((q) => {
      if (q.type === 'RATING_SCALE') {
        const values = q.responses.map((r) => parseInt(r.value)).filter((v) => !isNaN(v))
        const avg = values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : 'N/A'
        return `Q: "${q.question}" (Rating Scale) — Average: ${avg}/5, ${values.length} responses`
      }
      if (q.type === 'YES_NO') {
        const yes = q.responses.filter((r) => r.value === 'yes').length
        const no = q.responses.filter((r) => r.value === 'no').length
        return `Q: "${q.question}" (Yes/No) — Yes: ${yes}, No: ${no}`
      }
      if (q.type === 'MULTIPLE_CHOICE' || q.type === 'MULTI_SELECT') {
        const counts: Record<string, number> = {}
        for (const r of q.responses) {
          const values =
            q.type === 'MULTI_SELECT'
              ? (() => {
                  try { return JSON.parse(r.value) as string[] }
                  catch { return [r.value] }
                })()
              : [r.value]
          for (const v of values) counts[v] = (counts[v] || 0) + 1
        }
        const breakdown = Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(', ')
        return `Q: "${q.question}" (${q.type}) — ${breakdown}`
      }
      const sample = q.responses.slice(0, 10).map((r) => `"${r.value.slice(0, 200)}"`).join('; ')
      return `Q: "${q.question}" (Free Text) — ${q.responses.length} responses. Samples: ${sample}`
    })
    .join('\n')
}

function buildComparativeBreakdowns(data: ResultsData): string {
  return data.questions
    .map((q) => {
      const byRole: Record<string, string[]> = {}
      const byOrg: Record<string, string[]> = {}
      for (const r of q.responses) {
        if (!byRole[r.role]) byRole[r.role] = []
        byRole[r.role].push(r.value)
        if (r.orgName) {
          if (!byOrg[r.orgName]) byOrg[r.orgName] = []
          byOrg[r.orgName].push(r.value)
        }
      }

      let detail = `Q: "${q.question}" (${q.type})\n`
      if (q.type === 'RATING_SCALE') {
        for (const [role, vals] of Object.entries(byRole)) {
          const nums = vals.map(Number).filter((v) => !isNaN(v))
          const avg = nums.length > 0 ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1) : 'N/A'
          detail += `  Role ${role}: avg ${avg}/5 (${nums.length} responses)\n`
        }
        for (const [org, vals] of Object.entries(byOrg)) {
          const nums = vals.map(Number).filter((v) => !isNaN(v))
          const avg = nums.length > 0 ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1) : 'N/A'
          detail += `  Org "${org}": avg ${avg}/5 (${nums.length} responses)\n`
        }
      } else if (q.type === 'YES_NO') {
        for (const [role, vals] of Object.entries(byRole)) {
          const yes = vals.filter((v) => v === 'yes').length
          detail += `  Role ${role}: ${yes}/${vals.length} yes\n`
        }
      }
      return detail
    })
    .join('\n')
}

function buildRecommendationSummaries(data: ResultsData): string {
  return data.questions
    .map((q) => {
      if (q.type === 'RATING_SCALE') {
        const values = q.responses.map((r) => parseInt(r.value)).filter((v) => !isNaN(v))
        const avg = values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : 'N/A'
        return `Q: "${q.question}" — Average rating: ${avg}/5`
      }
      if (q.type === 'FREE_TEXT') {
        const samples = q.responses.slice(0, 10).map((r) => `"${r.value.slice(0, 200)}"`).join('; ')
        return `Q: "${q.question}" — Responses: ${samples}`
      }
      return `Q: "${q.question}" (${q.type}) — ${q.responses.length} responses`
    })
    .join('\n')
}

export async function generateSurveySummary(data: ResultsData): Promise<string> {
  const questionSummaries = buildQuestionSummaries(data)
  const caveat =
    data.totalResponses < 5
      ? `\n\nNote: This survey has only ${data.totalResponses} response(s). Results may not be representative.`
      : ''
  return runPrompt('survey.summary', {
    surveyTitle: data.surveyTitle,
    totalResponses: String(data.totalResponses),
    questionSummaries,
    caveat,
  })
}

export async function generateSurveyComparative(data: ResultsData): Promise<string> {
  const roles = [...new Set(data.questions.flatMap((q) => q.responses.map((r) => r.role)))]
  const orgs = [...new Set(data.questions.flatMap((q) => q.responses.map((r) => r.orgName).filter(Boolean)))]
  const breakdowns = buildComparativeBreakdowns(data)
  const caveat =
    data.totalResponses < 5
      ? `\n\nNote: This survey has only ${data.totalResponses} response(s). Comparisons may not be statistically meaningful.`
      : ''
  return runPrompt('survey.comparative', {
    surveyTitle: data.surveyTitle,
    totalResponses: String(data.totalResponses),
    roles: roles.join(', '),
    orgs: orgs.join(', ') || 'N/A',
    breakdowns,
    caveat,
  })
}

export async function generateSurveyRecommendations(data: ResultsData): Promise<string> {
  const questionSummaries = buildRecommendationSummaries(data)
  const caveat =
    data.totalResponses < 5
      ? `\n\nNote: Based on limited responses (${data.totalResponses}). Recommendations should be treated as preliminary.`
      : ''
  return runPrompt('survey.recommendations', {
    surveyTitle: data.surveyTitle,
    totalResponses: String(data.totalResponses),
    questionSummaries,
    caveat,
  })
}

export function buildResultsData(survey: {
  title: string
  questions: Array<{
    id: string
    question: string
    type: string
  }>
  responses: Array<{
    answers: Array<{ questionId: string; value: string }>
    user: {
      role: string
      organisation: { name: string } | null
    }
  }>
}): ResultsData {
  return {
    surveyTitle: survey.title,
    totalResponses: survey.responses.length,
    questions: survey.questions.map((q) => ({
      question: q.question,
      type: q.type,
      responses: survey.responses
        .flatMap((r) =>
          r.answers
            .filter((a) => a.questionId === q.id)
            .map((a) => ({
              value: a.value,
              role: r.user.role,
              orgName: r.user.organisation?.name ?? null,
            }))
        ),
    })),
  }
}
