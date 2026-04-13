import { generateText } from 'ai'
import type { ParsedFile } from './content-generator-types'

const MODEL = 'google/gemini-2.5-flash'

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
  audience?: string
): Promise<GeneratedSurvey> {
  const prompt = `You are an expert survey designer for training and education programmes.
Create a professional survey based on this topic: "${topic}"
${audience ? `Target audience: ${audience}` : ''}

Generate a survey with 8-12 questions using a good mix of these question types:
- MULTIPLE_CHOICE: single select from options (provide 3-5 options)
- YES_NO: yes or no question
- FREE_TEXT: open-ended text response
- RATING_SCALE: 1-5 rating (do NOT provide options, the scale is always 1-5)
- MULTI_SELECT: select all that apply (provide 3-6 options)

Use a natural flow: start with easier questions, put sensitive/open-ended ones later.
Include at least one FREE_TEXT question for qualitative feedback.
Include at least one RATING_SCALE question.

Return ONLY valid JSON in this exact format:
{
  "title": "Survey title",
  "description": "Brief survey description",
  "questions": [
    {
      "type": "MULTIPLE_CHOICE",
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C"],
      "required": true,
      "order": 1
    },
    {
      "type": "RATING_SCALE",
      "question": "How would you rate...?",
      "required": true,
      "order": 2
    },
    {
      "type": "FREE_TEXT",
      "question": "What suggestions do you have?",
      "required": false,
      "order": 3
    }
  ]
}

Do NOT include options for YES_NO or RATING_SCALE types.
Do NOT include markdown formatting or explanation — ONLY the JSON object.`

  const { text } = await generateText({ model: MODEL, prompt, maxRetries: 3 })
  return JSON.parse(extractJson(text)) as GeneratedSurvey
}

export async function generateSurveyFromFiles(
  files: ParsedFile[]
): Promise<GeneratedSurvey> {
  const fileContent = files
    .map((f) => {
      const sections = f.sections
        .map((s) => `### ${s.heading ?? ''}\n${s.content}`)
        .join('\n\n')
      return `## File: ${f.filename}\n${sections}`
    })
    .join('\n\n---\n\n')

  const prompt = `You are an expert survey designer for training and education programmes.
Based on the following training material, create a survey that assesses understanding and gathers feedback.

Training Material:
${fileContent}

Generate a survey with 8-12 questions using a good mix of these question types:
- MULTIPLE_CHOICE: single select from options (provide 3-5 options)
- YES_NO: yes or no question
- FREE_TEXT: open-ended text response
- RATING_SCALE: 1-5 rating (do NOT provide options, the scale is always 1-5)
- MULTI_SELECT: select all that apply (provide 3-6 options)

Mix comprehension questions (testing understanding of the material) with feedback questions (how useful was it, what could improve).
Start with comprehension, end with feedback.
Include at least one FREE_TEXT and one RATING_SCALE question.

Return ONLY valid JSON in this exact format:
{
  "title": "Survey title",
  "description": "Brief survey description",
  "questions": [
    {
      "type": "MULTIPLE_CHOICE",
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C"],
      "required": true,
      "order": 1
    }
  ]
}

Do NOT include options for YES_NO or RATING_SCALE types.
Do NOT include markdown formatting or explanation — ONLY the JSON object.`

  const { text } = await generateText({ model: MODEL, prompt, maxRetries: 3 })
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

export async function generateSurveySummary(data: ResultsData): Promise<string> {
  const questionSummaries = data.questions.map((q) => {
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
        const values = q.type === 'MULTI_SELECT' ? (() => { try { return JSON.parse(r.value) as string[] } catch { return [r.value] } })() : [r.value]
        for (const v of values) {
          counts[v] = (counts[v] || 0) + 1
        }
      }
      const breakdown = Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(', ')
      return `Q: "${q.question}" (${q.type}) — ${breakdown}`
    }
    const sampleResponses = q.responses.slice(0, 10).map((r) => `"${r.value.slice(0, 200)}"`).join('; ')
    return `Q: "${q.question}" (Free Text) — ${q.responses.length} responses. Samples: ${sampleResponses}`
  }).join('\n')

  const caveat = data.totalResponses < 5
    ? `\n\nNote: This survey has only ${data.totalResponses} response(s). Results may not be representative.`
    : ''

  const prompt = `You are an expert data analyst reviewing survey results for a training programme.

Survey: "${data.surveyTitle}"
Total responses: ${data.totalResponses}${caveat}

Results:
${questionSummaries}

Provide a clear, professional summary of the overall results in 3-5 paragraphs.
Identify key trends, notable patterns, and any areas of concern.
Use HTML formatting (<p>, <strong>, <ul>, <li>) for structure.
Be factual and specific — reference actual numbers and percentages.`

  const { text } = await generateText({ model: MODEL, prompt, maxRetries: 3 })
  return text
}

export async function generateSurveyComparative(data: ResultsData): Promise<string> {
  const roles = [...new Set(data.questions.flatMap((q) => q.responses.map((r) => r.role)))]
  const orgs = [...new Set(data.questions.flatMap((q) => q.responses.map((r) => r.orgName).filter(Boolean)))]

  const breakdowns = data.questions.map((q) => {
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
  }).join('\n')

  const caveat = data.totalResponses < 5
    ? `\n\nNote: This survey has only ${data.totalResponses} response(s). Comparisons may not be statistically meaningful.`
    : ''

  const prompt = `You are an expert data analyst comparing survey results across different user groups.

Survey: "${data.surveyTitle}"
Total responses: ${data.totalResponses}
Roles represented: ${roles.join(', ')}
Organisations represented: ${orgs.join(', ') || 'N/A'}${caveat}

Breakdowns:
${breakdowns}

Provide a comparative analysis highlighting meaningful differences between roles and organisations.
Focus on questions where groups diverged significantly.
Use HTML formatting (<p>, <strong>, <ul>, <li>, <table>, <tr>, <td>) for structure.
Be specific — cite numbers and percentages. Note any patterns that suggest different needs or experiences across groups.`

  const { text } = await generateText({ model: MODEL, prompt, maxRetries: 3 })
  return text
}

export async function generateSurveyRecommendations(data: ResultsData): Promise<string> {
  const questionSummaries = data.questions.map((q) => {
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
  }).join('\n')

  const caveat = data.totalResponses < 5
    ? `\n\nNote: Based on limited responses (${data.totalResponses}). Recommendations should be treated as preliminary.`
    : ''

  const prompt = `You are an expert training programme advisor analysing survey results.

Survey: "${data.surveyTitle}"
Total responses: ${data.totalResponses}${caveat}

Results Summary:
${questionSummaries}

Based on these results, provide a prioritised list of 5-7 actionable recommendations.
Each recommendation should:
- Reference specific survey questions and data points
- Be concrete and implementable
- Indicate priority (High/Medium/Low)

Use HTML formatting (<p>, <strong>, <ol>, <li>) for structure.
Focus on improvements that would have the most impact on training quality and learner satisfaction.`

  const { text } = await generateText({ model: MODEL, prompt, maxRetries: 3 })
  return text
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
