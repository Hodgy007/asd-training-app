import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { prisma } from '@/lib/prisma'
import { assemblePrompt } from '@/lib/ai-runner-assemble'
import { logger, errMeta } from '@/lib/logger'

export const AI_FEATURE_UNAVAILABLE =
  'This AI feature is temporarily unavailable. Please try again later.'

/**
 * Thrown by `runPromptStrict` (and is also detectable from `runPrompt`'s
 * sentinel return). Use this for paths whose output flows directly into
 * user-visible content — a CV personal statement, a careers report — where
 * silently substituting the literal "feature unavailable" string would
 * corrupt the user's saved record.
 */
export class AiUnavailableError extends Error {
  constructor(public readonly reason: 'missing_prompt' | 'disabled' | 'failed', cause?: unknown) {
    super(AI_FEATURE_UNAVAILABLE)
    this.name = 'AiUnavailableError'
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause
  }
}

export function isAiUnavailable(value: unknown): value is AiUnavailableError {
  return value instanceof AiUnavailableError
}

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
  const startedAt = Date.now()

  const row = await prisma.aiPrompt.findUnique({
    where: { key },
    include: {
      contextFiles: {
        select: { fileName: true, parsedText: true },
      },
    },
  })

  if (!row) {
    logger.error('ai.runner.prompt_missing', { promptKey: key })
    return AI_FEATURE_UNAVAILABLE
  }

  if (!row.enabled) {
    logger.warn('ai.runner.prompt_disabled', { promptKey: key })
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

  logger.info('ai.runner.invoke', {
    promptKey: key,
    model: row.model,
    contextFiles: row.contextFiles.length,
    inputVarCount: Object.keys(values).length,
  })

  try {
    const { text, usage } = await generateText({
      model: gateway(row.model),
      prompt,
      maxRetries: 3,
    })
    logger.info('ai.runner.success', {
      promptKey: key,
      model: row.model,
      durationMs: Date.now() - startedAt,
      inputTokens: usage?.inputTokens,
      outputTokens: usage?.outputTokens,
      totalTokens: usage?.totalTokens,
      responseLength: text.length,
    })
    return text
  } catch (error) {
    logger.error('ai.runner.failed', {
      promptKey: key,
      model: row.model,
      durationMs: Date.now() - startedAt,
      ...errMeta(error),
    })
    return AI_FEATURE_UNAVAILABLE
  }
}

/**
 * Strict variant of `runPrompt`: throws `AiUnavailableError` instead of
 * returning the human-readable sentinel string. Use in any code path whose
 * output lands directly in user-visible content (CVs, careers reports,
 * survey question generation) so a model failure can't end up being saved
 * verbatim as "This AI feature is temporarily unavailable…" in the user's
 * record.
 */
export async function runPromptStrict(
  key: string,
  values: Record<string, string>,
): Promise<string> {
  const text = await runPrompt(key, values)
  if (text === AI_FEATURE_UNAVAILABLE) {
    throw new AiUnavailableError('failed')
  }
  return text
}
