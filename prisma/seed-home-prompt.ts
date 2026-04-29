import { prisma } from '../lib/prisma'
import { DEFAULT_MODEL_ID } from '../lib/ai-models'

const HOME_PAGE_STYLE_REQUIREMENT =
  'Use only CSS classes that are guaranteed to be built by the app. For orange buttons, use bg-primary-500 text-white hover:bg-primary-600 or bg-warm-500 text-white hover:bg-warm-600. Do not invent arbitrary colour classes.'

const SHARED_REQUIREMENTS = [
  'Return a self-contained HTML fragment. Do NOT include <html>, <head>, <body>, <script>, or <style> tags.',
  'Use semantic elements (section, h1, h2, h3, p, ul, li, a, img).',
  'Use Tailwind-friendly utility classes on wrappers (e.g. max-w-5xl mx-auto, grid, gap-6, rounded-2xl, bg-white, shadow, p-6).',
  HOME_PAGE_STYLE_REQUIREMENT,
  'Write for a mixed audience of charity staff, school staff, students, and practitioners. Never diagnose or mention autism as a condition to be fixed.',
  'Use UK English spelling throughout (e.g. organisation, recognised, specialised).',
  'Keep copy concise. No marketing superlatives. No emojis.',
  'Do not include external images, iframes, or <script> tags. Use simple inline SVGs or unicode icons if decoration is needed.',
  'Do not include inline event handlers (onclick etc.).',
]

const SHARED_RESPONSE_FORMAT =
  'Return ONLY the raw HTML fragment. No markdown, no code fences, no explanation. The fragment should start with a wrapper element (e.g. <section class="...">) and be ready to render inside a prose container.'

const PROMPTS = [
  {
    key: 'home.generate',
    name: 'Home Page — Generate From Brief',
    purpose:
      'Generate a polished, accessible HTML fragment for the platform Home page based on a short brief from the charity admin.',
    category: 'home',
    tone: 'Warm, inclusive, strengths-focused. Plain UK English.',
    requirements: [
      ...SHARED_REQUIREMENTS,
      'Build a clear layout: a hero with heading + subheading, 2–4 feature/info cards in a responsive grid, and a simple closing call to action.',
    ],
    inputVariables: ['brief'],
    responseFormat: SHARED_RESPONSE_FORMAT,
  },
  {
    key: 'home.modify',
    name: 'Home Page — Modify Existing Layout',
    purpose:
      'Apply a focused tweak to the existing Home page HTML without rebuilding it from scratch. Preserve the overall structure and tone unless the instruction explicitly asks for a structural change.',
    category: 'home',
    tone: 'Warm, inclusive, strengths-focused. Plain UK English.',
    requirements: [
      ...SHARED_REQUIREMENTS,
      'You are given EXISTING HTML in {{currentHtml}} and an INSTRUCTION in {{instruction}}.',
      'Apply the instruction as a minimal targeted edit — change only what the instruction asks for. Keep the rest of the layout, copy, and classes intact.',
      'Return the FULL updated HTML fragment, not a diff.',
      'If the instruction is unclear or would break the page, make the smallest sensible interpretation rather than rewriting the layout.',
    ],
    inputVariables: ['instruction', 'currentHtml'],
    responseFormat: SHARED_RESPONSE_FORMAT,
  },
]

async function main() {
  for (const seed of PROMPTS) {
    const existing = await prisma.aiPrompt.findUnique({ where: { key: seed.key } })
    if (existing) {
      const missingRequirements = seed.requirements.filter(
        (requirement) => !existing.requirements.includes(requirement),
      )

      if (missingRequirements.length > 0) {
        await prisma.aiPrompt.update({
          where: { key: seed.key },
          data: { requirements: [...existing.requirements, ...missingRequirements] },
        })
        console.log(`Prompt "${seed.key}" already exists; added missing home styling requirements.`)
      } else {
        console.log(`Prompt "${seed.key}" already exists; no changes needed.`)
      }
      continue
    }

    const defaultFields = {
      tone: seed.tone,
      requirements: seed.requirements,
      exampleOutput: null,
      model: DEFAULT_MODEL_ID,
    }

    await prisma.aiPrompt.create({
      data: {
        key: seed.key,
        name: seed.name,
        purpose: seed.purpose,
        category: seed.category,
        tone: seed.tone,
        requirements: seed.requirements,
        inputVariables: seed.inputVariables,
        responseFormat: seed.responseFormat,
        model: DEFAULT_MODEL_ID,
        enabled: true,
        defaultFields,
      },
    })

    console.log(`Created AI prompt "${seed.key}".`)
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
