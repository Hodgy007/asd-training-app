import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    aiPrompt: { findUnique: vi.fn() },
  },
}))

vi.mock('ai', () => ({
  generateText: vi.fn(),
  Output: { object: vi.fn((o: unknown) => o) },
}))

import { prisma } from '@/lib/prisma'
import { generateText } from 'ai'
import { z } from 'zod'
import { runPrompt, runPromptObject, AiUnavailableError, AI_FEATURE_UNAVAILABLE } from '../ai-runner'

const basePrompt = {
  id: 'p1',
  key: 'cv.interests',
  name: 'CV Interests',
  purpose: 'Expand interests.',
  category: 'cv',
  tone: 'Plain-English.',
  requirements: ['UK English'],
  exampleOutput: null,
  inputVariables: ['rawText'],
  responseFormat: 'Plain text.',
  model: 'google/gemini-2.5-flash',
  enabled: true,
  contextFiles: [],
}

describe('runPrompt', () => {
  beforeEach(() => {
    vi.mocked(generateText).mockReset()
    vi.mocked(prisma.aiPrompt.findUnique).mockReset()
  })

  it('returns the static fallback when the prompt row is missing', async () => {
    vi.mocked(prisma.aiPrompt.findUnique).mockResolvedValue(null)
    const result = await runPrompt('does.not.exist', {})
    expect(result).toBe(AI_FEATURE_UNAVAILABLE)
    expect(generateText).not.toHaveBeenCalled()
  })

  it('returns the static fallback when the prompt is disabled', async () => {
    vi.mocked(prisma.aiPrompt.findUnique).mockResolvedValue({
      ...basePrompt,
      enabled: false,
    } as never)
    const result = await runPrompt('cv.interests', { rawText: 'golf' })
    expect(result).toBe(AI_FEATURE_UNAVAILABLE)
    expect(generateText).not.toHaveBeenCalled()
  })

  it('calls generateText with the model from the row and returns the text', async () => {
    vi.mocked(prisma.aiPrompt.findUnique).mockResolvedValue(basePrompt as never)
    vi.mocked(generateText).mockResolvedValue({ text: 'I play golf.' } as never)

    const result = await runPrompt('cv.interests', { rawText: 'golf' })
    expect(result).toBe('I play golf.')

    const callArgs = vi.mocked(generateText).mock.calls[0]![0]
    // model is now a wrapped LanguageModel object, not a raw string
    expect((callArgs.model as { modelId: string }).modelId).toBe('google/gemini-2.5-flash')
    expect(callArgs.prompt).toContain('golf')
  })

  it('returns the fallback when generateText rejects', async () => {
    vi.mocked(prisma.aiPrompt.findUnique).mockResolvedValue(basePrompt as never)
    vi.mocked(generateText).mockRejectedValue(new Error('network'))
    const result = await runPrompt('cv.interests', { rawText: 'golf' })
    expect(result).toBe(AI_FEATURE_UNAVAILABLE)
  })
})

describe('runPromptObject', () => {
  const schema = z.object({ ok: z.boolean() })

  beforeEach(() => {
    vi.mocked(generateText).mockReset()
    vi.mocked(prisma.aiPrompt.findUnique).mockReset()
  })

  it('runPromptObject returns the parsed output', async () => {
    vi.mocked(prisma.aiPrompt.findUnique).mockResolvedValue(basePrompt as never)
    vi.mocked(generateText).mockResolvedValue({ output: { ok: true } } as never)
    await expect(runPromptObject('cv.interests', { rawText: 'golf' }, schema)).resolves.toEqual({ ok: true })
    const call = vi.mocked(generateText).mock.calls[0][0] as unknown as { output: { schema: unknown } }
    expect(call.output.schema).toBe(schema)
  })

  it('runPromptObject throws AiUnavailableError when the prompt row is missing', async () => {
    vi.mocked(prisma.aiPrompt.findUnique).mockResolvedValue(null)
    const err = await runPromptObject('nope', {}, schema).catch((e) => e)
    expect(err).toBeInstanceOf(AiUnavailableError)
    expect(err.reason).toBe('missing_prompt')
    expect(generateText).not.toHaveBeenCalled()
  })

  it('runPromptObject wraps a generation failure', async () => {
    vi.mocked(prisma.aiPrompt.findUnique).mockResolvedValue(basePrompt as never)
    vi.mocked(generateText).mockRejectedValue(new Error('gateway down'))
    const err = await runPromptObject('cv.interests', { rawText: 'golf' }, schema).catch((e) => e)
    expect(err).toBeInstanceOf(AiUnavailableError)
    expect(err.reason).toBe('failed')
  })
})
