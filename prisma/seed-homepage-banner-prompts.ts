import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SUGGEST_PROMPT_KEY = 'homepage.heroImage.suggestPrompt'
const GENERATE_KEY = 'homepage.heroImage.generate'

async function main() {
  await prisma.aiPrompt.upsert({
    where: { key: SUGGEST_PROMPT_KEY },
    update: {},
    create: {
      key: SUGGEST_PROMPT_KEY,
      name: 'Homepage hero banner — suggested prompt',
      purpose:
        "Suggest a starting image prompt for a decorative homepage banner based on the page's brief.",
      category: 'homepage',
      tone: 'Concise, descriptive, focused on visual atmosphere.',
      requirements: [
        'Return one paragraph describing the banner — colors, shapes, mood.',
        'Stay under 300 characters.',
        'Do not mention people, faces, or text in the image.',
        'Match the warm, optimistic, hand-drawn style of Ambitious about Autism.',
        'UK English.',
      ],
      exampleOutput:
        'Soft yellow and teal organic shapes flowing across the canvas, gentle gradients with cream highlights, hand-drawn illustrative quality, abstract and welcoming.',
      inputVariables: ['brief'],
      responseFormat: 'Plain text, single paragraph, ≤300 characters.',
      model: 'google/gemini-2.5-flash',
      enabled: true,
      defaultFields: {
        tone: 'Concise, descriptive, focused on visual atmosphere.',
        requirements: [
          'Return one paragraph describing the banner — colors, shapes, mood.',
          'Stay under 300 characters.',
          'Do not mention people, faces, or text in the image.',
          'Match the warm, optimistic, hand-drawn style of Ambitious about Autism.',
          'UK English.',
        ],
        exampleOutput:
          'Soft yellow and teal organic shapes flowing across the canvas, gentle gradients with cream highlights, hand-drawn illustrative quality, abstract and welcoming.',
        model: 'google/gemini-2.5-flash',
      },
    },
  })

  await prisma.aiPrompt.upsert({
    where: { key: GENERATE_KEY },
    update: {},
    create: {
      key: GENERATE_KEY,
      name: 'Homepage hero banner — image generation',
      purpose:
        'Generate a decorative banner illustration for the homepage in the AAA brand style.',
      category: 'homepage',
      tone: 'Warm, optimistic, hand-drawn illustrative.',
      requirements: [
        'Visual style: Ambitious about Autism education pages — hand-drawn illustrative quality, soft organic shapes, gentle gradients.',
        'Palette: warm yellows, teals, magentas with cream backgrounds. (Replace with extracted hex codes during Task 12 step 3.)',
        'Tone: friendly, approachable, never corporate or sterile.',
        'Strictly no people, no faces, no text, no logos.',
        'Aspect ratio: {{aspectRatio}}.',
      ],
      exampleOutput: null,
      inputVariables: ['prompt', 'aspectRatio'],
      responseFormat: 'PNG image.',
      model: 'google/gemini-2.5-flash-image-preview',
      enabled: true,
      defaultFields: {
        tone: 'Warm, optimistic, hand-drawn illustrative.',
        requirements: [
          'Visual style: Ambitious about Autism education pages — hand-drawn illustrative quality, soft organic shapes, gentle gradients.',
          'Palette: warm yellows, teals, magentas with cream backgrounds. (Replace with extracted hex codes during Task 12 step 3.)',
          'Tone: friendly, approachable, never corporate or sterile.',
          'Strictly no people, no faces, no text, no logos.',
          'Aspect ratio: {{aspectRatio}}.',
        ],
        exampleOutput: null,
        model: 'google/gemini-2.5-flash-image-preview',
      },
    },
  })

  console.log('Seeded homepage banner prompts.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
