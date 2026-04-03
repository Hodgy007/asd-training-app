import { GoogleGenAI } from '@google/genai'

const MODEL = 'gemini-2.5-flash'

function getAI(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
}

export async function generatePersonalStatement(context: {
  name: string
  targetRole?: string
  experience: string
  education: string
}): Promise<string> {
  const ai = getAI()
  if (!ai) {
    return 'AI personal statement generation is not available. Please configure the GEMINI_API_KEY environment variable.'
  }

  const roleContext = context.targetRole
    ? `They are targeting a role as: ${context.targetRole}.`
    : ''

  const prompt = `Write a personal statement for a UK CV for a person named ${context.name}.
${roleContext}

Their experience: ${context.experience || 'Not yet provided'}
Their education: ${context.education || 'Not yet provided'}

Requirements:
- Write 3-4 sentences in the first person.
- Focus on strengths, skills, and what the person can offer.
- Use simple, clear language that is easy to understand.
- Use UK English spelling throughout (e.g. organised, recognised, specialised).
- Never mention disabilities, diagnoses, or health conditions.
- Do not include any headings, labels, or formatting — return ONLY the personal statement text.`

  try {
    const response = await ai.models.generateContent({ model: MODEL, contents: prompt })
    return response.text?.trim() ?? ''
  } catch (error) {
    console.error('generatePersonalStatement error:', error)
    return 'Unable to generate personal statement at this time. Please try again later.'
  }
}

export async function rephraseBulletPoint(
  originalText: string,
  jobTitle: string,
  employer: string
): Promise<string> {
  const ai = getAI()
  if (!ai) {
    return 'AI rephrasing is not available. Please configure the GEMINI_API_KEY environment variable.'
  }

  const prompt = `Rephrase this CV bullet point for a ${jobTitle} role at ${employer}:

"${originalText}"

Requirements:
- Start with a strong action verb (e.g. Managed, Delivered, Organised, Supported).
- Keep it to one concise sentence.
- Be specific and results-oriented where possible.
- Use simple, clear language that is easy to understand.
- Focus on strengths and achievements.
- Use UK English spelling throughout.
- Never mention disabilities, diagnoses, or health conditions.
- Return ONLY the rephrased bullet point, nothing else.`

  try {
    const response = await ai.models.generateContent({ model: MODEL, contents: prompt })
    return response.text?.trim() ?? ''
  } catch (error) {
    console.error('rephraseBulletPoint error:', error)
    return 'Unable to rephrase bullet point at this time. Please try again later.'
  }
}

export async function suggestSkills(context: {
  experience: string
  education: string
}): Promise<Array<{ name: string; category: string }>> {
  const ai = getAI()
  if (!ai) {
    return []
  }

  const prompt = `Suggest 8-12 skills for a UK CV based on the following background.

Experience: ${context.experience || 'Not yet provided'}
Education: ${context.education || 'Not yet provided'}

Requirements:
- Each skill should belong to one of these categories: Technical, Communication, Teamwork, Personal, Organisation.
- Use simple, clear language that is easy to understand.
- Focus on strengths and transferable skills.
- Never mention disabilities, diagnoses, or health conditions.
- Return ONLY a valid JSON array with no additional text, markdown, or formatting.
- Format: [{"name":"Skill Name","category":"Category"}]
- Example: [{"name":"Microsoft Office","category":"Technical"},{"name":"Active Listening","category":"Communication"}]`

  try {
    const response = await ai.models.generateContent({ model: MODEL, contents: prompt })
    const text = response.text?.trim() ?? '[]'

    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()

    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter(
        (item: unknown): item is { name: string; category: string } =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as Record<string, unknown>).name === 'string' &&
          typeof (item as Record<string, unknown>).category === 'string'
      )
      .slice(0, 12)
  } catch (error) {
    console.error('suggestSkills error:', error)
    return []
  }
}

export async function improveDescription(
  description: string,
  jobTitle: string,
  employer: string
): Promise<string> {
  const ai = getAI()
  if (!ai) {
    return 'AI description improvement is not available. Please configure the GEMINI_API_KEY environment variable.'
  }

  const prompt = `Convert this rough description of duties into 3-5 professional bullet points for a UK CV.
This is for a ${jobTitle} role at ${employer}.

Description: "${description}"

Requirements:
- Each bullet point must start with a strong action verb (e.g. Managed, Delivered, Organised, Supported, Coordinated).
- Be specific and results-oriented where possible.
- Use simple, clear language that is easy to understand.
- Focus on strengths and achievements.
- Use UK English spelling throughout.
- Never mention disabilities, diagnoses, or health conditions.
- Return each bullet point on its own line, starting with "• ".
- Return ONLY the bullet points, no headings or extra text.`

  try {
    const response = await ai.models.generateContent({ model: MODEL, contents: prompt })
    return response.text?.trim() ?? ''
  } catch (error) {
    console.error('improveDescription error:', error)
    return 'Unable to improve description at this time. Please try again later.'
  }
}
