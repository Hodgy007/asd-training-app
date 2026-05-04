import { runPrompt, runPromptStrict } from '@/lib/ai-runner'

// All text-returning helpers use the STRICT runner — output flows directly
// into the user's saved CV, so "This AI feature is temporarily unavailable…"
// must NEVER end up in their personal statement / job description.
// Callers (the CV-builder API route) catch AiUnavailableError and translate
// it to a 503 the UI can quietly recover from.

export async function generatePersonalStatement(context: {
  name: string
  targetRole?: string
  experience: string
  education: string
}): Promise<string> {
  const roleContext = context.targetRole
    ? `They are targeting a role as: ${context.targetRole}.`
    : ''
  return runPromptStrict('cv.personalStatement', {
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
  return runPromptStrict('cv.rephraseBullet', {
    originalText,
    jobTitle,
    employer,
  })
}

export async function suggestSkills(context: {
  experience: string
  education: string
}): Promise<Array<{ name: string; category: string }>> {
  // suggestSkills already gracefully degrades to [] on a malformed response,
  // and an empty array is harmless to the UI — so the lenient runPrompt is
  // fine here. The sentinel string just won't match the JSON regex.
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
  return runPromptStrict('cv.improveDescription', {
    description,
    jobTitle,
    employer,
  })
}

export async function expandInterests(rawText: string): Promise<string> {
  return runPromptStrict('cv.expandInterests', {
    rawText: rawText.trim() || 'No interests provided yet.',
  })
}
