import { describe, it, expect } from 'vitest'
import { AI_MODELS, DEFAULT_MODEL_ID, isValidModelId } from '../ai-models'

describe('AI_MODELS', () => {
  it('has at least four options', () => {
    expect(AI_MODELS.length).toBeGreaterThanOrEqual(4)
  })
  it('every entry has non-empty id, label, description', () => {
    for (const m of AI_MODELS) {
      expect(m.id).toBeTruthy()
      expect(m.label).toBeTruthy()
      expect(m.description).toBeTruthy()
    }
  })
  it('exactly one entry is default', () => {
    expect(AI_MODELS.filter((m) => m.default).length).toBe(1)
  })
  it('DEFAULT_MODEL_ID points at the default entry', () => {
    const def = AI_MODELS.find((m) => m.default)
    expect(def).toBeDefined()
    expect(DEFAULT_MODEL_ID).toBe(def!.id)
  })
  it('isValidModelId recognises curated ids and rejects others', () => {
    expect(isValidModelId('google/gemini-2.5-flash')).toBe(true)
    expect(isValidModelId('made-up/model')).toBe(false)
  })
})
