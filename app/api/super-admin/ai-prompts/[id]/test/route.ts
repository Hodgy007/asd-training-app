import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { isValidModelId } from '@/lib/ai-models'
import { assemblePrompt } from '@/lib/ai-runner-assemble'
import { gateway } from '@/lib/ai-runner'
import { logger, errMeta } from '@/lib/logger'
import { createRateLimiter } from '@/lib/rate-limit'
import { generateText } from 'ai'
import { z } from 'zod'

const bodySchema = z.object({
  draft: z.object({
    tone: z.string(),
    requirements: z.array(z.string()),
    exampleOutput: z.string().nullable(),
    model: z.string().refine(isValidModelId, 'Model is not in the curated list'),
  }),
  values: z.record(z.string(), z.string()),
})

// 10 test runs per 5 minutes per user. Backed by Upstash when configured.
const promptTestLimiter = createRateLimiter('ai-prompt-test', 5 * 60 * 1000, 10)

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_AI_PROMPTS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rate = await promptTestLimiter.check(session.user.id)
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Too many test requests. Please wait a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) } },
    )
  }

  const parsed = bodySchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 })
  }

  const prompt = await prisma.aiPrompt.findUnique({
    where: { id: params.id },
    include: { contextFiles: { select: { fileName: true, parsedText: true } } },
  })
  if (!prompt) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const assembled = assemblePrompt(
    {
      purpose: prompt.purpose,
      tone: parsed.data.draft.tone,
      requirements: parsed.data.draft.requirements,
      exampleOutput: parsed.data.draft.exampleOutput,
      inputVariables: prompt.inputVariables,
      responseFormat: prompt.responseFormat,
      contextFiles: prompt.contextFiles,
    },
    parsed.data.values,
  )

  try {
    const { text } = await generateText({
      // Route through the Vercel AI Gateway like the production runner.
      // Calling generateText with a raw model string lets the AI SDK
      // auto-detect a provider from the prefix, which bypasses the
      // gateway's billing / observability.
      model: gateway(parsed.data.draft.model),
      prompt: assembled,
      maxRetries: 2,
    })
    return NextResponse.json({ response: text, assembledPrompt: assembled })
  } catch (error) {
    // Log the full error server-side, but don't echo provider error messages
    // (which can include stack frames or internal endpoint details) back to
    // the admin UI.
    logger.error('ai.prompt_test.failed', {
      promptId: params.id,
      model: parsed.data.draft.model,
      ...errMeta(error),
    })
    return NextResponse.json(
      { error: 'AI request failed. Check the server logs for details.', assembledPrompt: assembled },
      { status: 502 },
    )
  }
}
