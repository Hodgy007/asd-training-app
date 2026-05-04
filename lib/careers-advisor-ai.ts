import { runPromptStrict } from '@/lib/ai-runner'
import type { AdvisorAnswers, AdvisorReport } from '@/types'

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
  const formattedAnswers = formatAnswers(answers)
  // Strict — output is parsed JSON saved as the user's careers report.
  // AiUnavailableError bubbles up to the API route which translates to 503.
  const text = await runPromptStrict('careers.report', { formattedAnswers })

  if (!text) {
    throw new Error('Failed to generate a valid careers report. Please try again.')
  }

  // Extract the JSON object from wherever it appears in the response
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error('No JSON object found in AI response:', text.substring(0, 500))
    throw new Error('Failed to generate a valid careers report. Please try again.')
  }

  try {
    const report = JSON.parse(jsonMatch[0]) as AdvisorReport

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
