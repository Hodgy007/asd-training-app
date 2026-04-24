import { prisma } from '../lib/prisma'
import { DEFAULT_MODEL_ID } from '../lib/ai-models'

const SEED = {
  key: 'home.generate',
  name: 'Home Page — Generate From Brief',
  purpose:
    'Generate a polished, accessible HTML fragment for the platform Home page based on a short brief from the charity admin.',
  category: 'home',
  tone: 'Warm, inclusive, strengths-focused. Plain UK English.',
  requirements: [
    'Return a self-contained HTML fragment. Do NOT include <html>, <head>, <body>, <script>, or <style> tags.',
    'Use semantic elements (section, h1, h2, h3, p, ul, li, a, img).',
    'Use Tailwind-friendly utility classes on wrappers (e.g. max-w-5xl mx-auto, grid, gap-6, rounded-2xl, bg-white, shadow, p-6).',
    'Build a clear layout: a hero with heading + subheading, 2–4 feature/info cards in a responsive grid, and a simple closing call to action.',
    'Write for a mixed audience of charity staff, school staff, students, and practitioners. Never diagnose or mention autism as a condition to be fixed.',
    'Use UK English spelling throughout (e.g. organisation, recognised, specialised).',
    'Keep copy concise. No marketing superlatives. No emojis.',
    'Do not include external images, iframes, or <script> tags. Use simple inline SVGs or unicode icons if decoration is needed.',
    'Do not include inline event handlers (onclick etc.).',
  ],
  inputVariables: ['brief'],
  responseFormat:
    'Return ONLY the raw HTML fragment. No markdown, no code fences, no explanation. The fragment should start with a wrapper element (e.g. <section class="...">) and be ready to render inside a prose container.',
}

async function main() {
  const existing = await prisma.aiPrompt.findUnique({ where: { key: SEED.key } })
  if (existing) {
    console.log(`Prompt "${SEED.key}" already exists — skipping.`)
    return
  }

  const defaultFields = {
    tone: SEED.tone,
    requirements: SEED.requirements,
    exampleOutput: null,
    model: DEFAULT_MODEL_ID,
  }

  await prisma.aiPrompt.create({
    data: {
      key: SEED.key,
      name: SEED.name,
      purpose: SEED.purpose,
      category: SEED.category,
      tone: SEED.tone,
      requirements: SEED.requirements,
      inputVariables: SEED.inputVariables,
      responseFormat: SEED.responseFormat,
      model: DEFAULT_MODEL_ID,
      enabled: true,
      defaultFields,
    },
  })

  console.log(`Created AI prompt "${SEED.key}".`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
