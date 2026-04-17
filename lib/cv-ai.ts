import { runPrompt } from '@/lib/ai-runner'

export async function generatePersonalStatement(context: {
  name: string
  targetRole?: string
  experience: string
  education: string
}): Promise<string> {
  const roleContext = context.targetRole
    ? `They are targeting a role as: ${context.targetRole}.`
    : ''
  return runPrompt('cv.personalStatement', {
    name: context.name,
    roleContext,
    experience: context.experience || 'Not yet provided',
    education: context.education || 'Not yet provided',
  })
}

export async function rephraseBulletPoint(
  originalText: string,
  jobTitle: string,
  employer: string,
): Promise<string> {
  return runPrompt('cv.rephraseBullet', {
    originalText,
    jobTitle,
    employer,
  })
}

export async function suggestSkills(context: {
  experience: string
  education: string
}): Promise<Array<{ name: string; category: string }>> {
  const text = await runPrompt('cv.suggestSkills', {
    experience: context.experience || 'Not yet provided',
    education: context.education || 'Not yet provided',
  })

  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  try {
    const parsed = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (item: unknown): item is { name: string; category: string } =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as Record<string, unknown>).name === 'string' &&
          typeof (item as Record<string, unknown>).category === 'string',
      )
      .slice(0, 12)
  } catch {
    return []
  }
}

export async function improveDescription(
  description: string,
  jobTitle: string,
  employer: string,
): Promise<string> {
  return runPrompt('cv.improveDescription', {
    description,
    jobTitle,
    employer,
  })
}

export async function expandInterests(rawText: string): Promise<string> {
  return runPrompt('cv.expandInterests', {
    rawText: rawText.trim() || 'No interests provided yet.',
  })
}
