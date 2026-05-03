import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { prisma } from '@/lib/prisma'
import { assemblePrompt } from '@/lib/ai-runner-assemble'
import { logger, errMeta } from '@/lib/logger'

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
