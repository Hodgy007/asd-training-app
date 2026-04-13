import { GoogleGenAI } from '@google/genai'
import type { AdvisorAnswers, AdvisorReport } from '@/types'

const MODEL = 'gemini-2.5-flash'

function getAI(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
}

function formatAnswers(answers: AdvisorAnswers): string {
  const lines: string[] = []

  if (answers.interests?.length) {
    lines.push(`Interests: ${answers.interests.join(', ')}`)
  }
  if (answers.strengths?.length) {
    lines.push(`Strengths: ${answers.strengths.join(', ')}`)
  }
  if (answers.environment?.length) {
    lines.push(`Preferred work environment: ${answers.environment.join(', ')}`)
  }
  if (answers.concerns?.length) {
    lines.push(`Concerns about work: ${answers.concerns.join(', ')}`)
  }
  if (answers.concernsOther) {
    lines.push(`Additional concerns: ${answers.concernsOther}`)
  }
  if (answers.experience) {
    lines.push(`Experience: ${answers.experience}`)
  }
  if (answers.stage) {
    lines.push(`Current stage: ${answers.stage}`)
  }
  if (answers.communication?.length) {
    lines.push(`Communication preferences: ${answers.communication.join(', ')}`)
  }
  if (answers.sensory?.length) {
    lines.push(`Sensory considerations: ${answers.sensory.join(', ')}`)
  }
  if (answers.values?.length) {
    lines.push(`Values in a job: ${answers.values.join(', ')}`)
  }
  if (answers.other) {
    lines.push(`Additional notes: ${answers.other}`)
  }

  return lines.join('\n')
}

export async function generateCareersReport(answers: AdvisorAnswers): Promise<AdvisorReport> {
  const ai = getAI()
  if (!ai) {
    throw new Error('AI report generation is not available. Please configure the GEMINI_API_KEY environment variable.')
  }

  const formattedAnswers = formatAnswers(answers)

  const prompt = `You are a careers advisor helping a young person explore career options. You are positive, practical, and strength-focused. You use UK English and reference UK-specific resources.

Here are the young person's questionnaire answers:

${formattedAnswers}

Based on these answers, generate a personalised careers report. You MUST respond with valid JSON matching this exact structure:

{
  "strengths": "A short paragraph (3-5 sentences) summarising the young person's key strengths based on their answers. Written in second person ('You have...'). Be specific to their answers, not generic.",
  "careers": [
    {
      "name": "Career Name",
      "explanation": "2-3 sentences explaining why this career suits them, grounded in their specific answers."
    }
  ],
  "nextSteps": [
    "A concrete, actionable next step"
  ],
  "workplaceSupport": "A paragraph about workplace support suggestions based on their environment, sensory, and communication preferences. Reference UK-specific support like Access to Work, reasonable adjustments, flexible working arrangements."
}

Requirements:
- Suggest 3 to 5 career areas in the "careers" array.
- Include 3 to 5 items in the "nextSteps" array.
- Each career suggestion must be realistic and achievable, not aspirational fantasy.
- Ground every suggestion in the young person's specific answers — do not give generic advice.
- Next steps should be concrete actions (e.g. "Search for apprenticeships on gov.uk", "Ask your careers professional about work experience in X").
- Reference UK-specific resources: gov.uk, apprenticeships, Access to Work scheme, National Careers Service.
- NEVER mention autism, disability, diagnosis, or any health condition.
- Use strength-focused, positive language throughout.
- Use UK English spelling (e.g. organised, recognised, specialised).
- Reference workplace adjustments as normal good practice, not as accommodations for a condition.
- Return ONLY the JSON object. No markdown, no code fences, no explanation.`

  let response
  try {
    response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    })
  } catch (apiErr) {
    console.error('Gemini API call failed:', apiErr)
    throw new Error('AI service unavailable. Please try again in a moment.')
  }

  const text = response.text?.trim() ?? ''
  console.log('Gemini raw response length:', text.length, 'preview:', text.substring(0, 100))

  if (!text) {
    console.error('Gemini returned empty response')
    throw new Error('Failed to generate a valid careers report. Please try again.')
  }

  // Extract the JSON object from wherever it appears in the response
  // This handles code fences, preamble text, and thinking tokens from Gemini
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error('No JSON object found in AI response:', text.substring(0, 500))
    throw new Error('Failed to generate a valid careers report. Please try again.')
  }

  try {
    const report = JSON.parse(jsonMatch[0]) as AdvisorReport

    // Validate structure
    if (!report.strengths || !Array.isArray(report.careers) || !Array.isArray(report.nextSteps) || !report.workplaceSupport) {
      console.error('Invalid report structure, keys present:', Object.keys(report))
      throw new Error('Invalid report structure')
    }

    return report
  } catch (parseErr) {
    console.error('Failed to parse AI response:', parseErr, jsonMatch[0].substring(0, 500))
    throw new Error('Failed to generate a valid careers report. Please try again.')
  }
}
