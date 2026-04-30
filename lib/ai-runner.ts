import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { prisma } from '@/lib/prisma'
import { assemblePrompt } from '@/lib/ai-runner-assemble'

export const AI_FEATURE_UNAVAILABLE =
  'This AI feature is temporarily unavailable. Please try again later.'

// Vercel AI Gateway is OpenAI-compatible. Wrap model strings like
// "google/gemini-2.5-flash" through this client so generateText receives
// a proper LanguageModel object instead of a raw string.
const gateway = createOpenAI({
  baseURL: 'https://ai-gateway.vercel.sh/v1',
  apiKey: process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_OIDC_TOKEN ?? '',
})

/**
 * Load an AI prompt from the DB, assemble it with the provided values,
 * and run it against the configured model. Returns the raw response text.
 *
 * Callers handle their own response parsing (JSON extract, regex split, etc.).
 */
export async function runPrompt(
  key: string,
  values: Record<string, string>,
): Promise<string> {
  const row = await prisma.aiPrompt.findUnique({
    where: { key },
    include: {
      contextFiles: {
        select: { fileName: true, parsedText: true },
      },
    },
  })

  if (!row) {
    console.error(`runPrompt: missing prompt row for key "${key}"`)
    return AI_FEATURE_UNAVAILABLE
  }

  if (!row.enabled) {
    console.warn(`runPrompt: prompt "${key}" is disabled`)
    return AI_FEATURE_UNAVAILABLE
  }

  const prompt = assemblePrompt(
    {
      purpose: row.purpose,
      tone: row.tone,
      requirements: row.requirements,
      exampleOutput: row.exampleOutput,
      inputVariables: row.inputVariables,
      responseFormat: row.responseFormat,
      contextFiles: row.contextFiles,
    },
    values,
  )

  try {
    const { text } = await generateText({
      model: gateway(row.model),
      prompt,
      maxRetries: 3,
    })
    return text
  } catch (error) {
    console.error(`runPrompt: generateText failed for "${key}":`, error)
    return AI_FEATURE_UNAVAILABLE
  }
}
