export interface AiModel {
  id: string
  label: string
  description: string
  default?: boolean
}

export const AI_MODELS: AiModel[] = [
  {
    id: 'google/gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    description: 'Fast and cheap. Current default.',
    default: true,
  },
  {
    id: 'google/gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    description: 'Higher quality, slower, more expensive.',
  },
  {
    id: 'anthropic/claude-sonnet-4',
    label: 'Claude Sonnet 4',
    description: 'Balanced. Strong at following long instructions.',
  },
  {
    id: 'anthropic/claude-haiku-4',
    label: 'Claude Haiku 4',
    description: 'Fastest Claude; cheapest.',
  },
  {
    id: 'openai/gpt-4o-mini',
    label: 'GPT-4o mini',
    description: 'Cheap, fast, strong at structured output.',
  },
  {
    id: 'openai/gpt-4.1',
    label: 'GPT-4.1',
    description: 'High quality, slower, more expensive.',
  },
]

export const DEFAULT_MODEL_ID: string = AI_MODELS.find((m) => m.default)!.id

export function isValidModelId(id: string): boolean {
  return AI_MODELS.some((m) => m.id === id)
}
