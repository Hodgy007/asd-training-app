import { prisma } from '../lib/prisma'
import { DEFAULT_MODEL_ID } from '../lib/ai-models'

interface PromptSeed {
  key: string
  name: string
  purpose: string
  category: string
  tone: string
  requirements: string[]
  exampleOutput?: string
  inputVariables: string[]
  responseFormat: string
}

// Rules every training-generator v2 prompt carries.
const TRAINING_RULES = [
  'Use UK English.',
  'Be strength-focused and respectful.',
  'Never diagnose anyone or suggest that a person is autistic.',
  'Use only facts, statistics and examples found in the source material provided. Never invent case studies, quotes or numbers.',
]

const STRUCTURED_FORMAT = 'Structured output is enforced by the app; fill every field.'

const SEEDS: PromptSeed[] = [
  // ─── Surveys ─────────────────────────────────────────────────────────────

  {
    key: 'survey.fromTopic',
    name: 'Surveys — Generate from Topic',
    purpose: 'Design a professional survey based on a topic.',
    category: 'survey',
    tone: 'Expert survey designer for training and education programmes.',
    requirements: [
      'Generate 8-12 questions using a good mix of MULTIPLE_CHOICE, YES_NO, FREE_TEXT, RATING_SCALE, MULTI_SELECT.',
      'MULTIPLE_CHOICE: single select, provide 3-5 options.',
      'YES_NO: yes or no question, do NOT provide options.',
      'FREE_TEXT: open-ended text response, do NOT provide options.',
      'RATING_SCALE: 1-5 rating, do NOT provide options.',
      'MULTI_SELECT: select all that apply, provide 3-6 options.',
      'Use a natural flow: start with easier questions, put sensitive/open-ended ones later.',
      'Include at least one FREE_TEXT question for qualitative feedback.',
      'Include at least one RATING_SCALE question.',
    ],
    inputVariables: ['topic', 'audience'],
    responseFormat: `Return ONLY valid JSON, no markdown:
{"title": "Survey title", "description": "Brief survey description", "questions": [{"type":"MULTIPLE_CHOICE","question":"...","options":["A","B"],"required":true,"order":1}]}`,
  },
  {
    key: 'survey.fromFiles',
    name: 'Surveys — Generate from Training Material',
    purpose: 'Design a survey that assesses understanding and gathers feedback on provided training material.',
    category: 'survey',
    tone: 'Expert survey designer for training programmes.',
    requirements: [
      'Generate 8-12 questions using a mix of MULTIPLE_CHOICE, YES_NO, FREE_TEXT, RATING_SCALE, MULTI_SELECT.',
      'Mix comprehension questions (testing understanding of the material) with feedback questions (how useful was it, what could improve).',
      'Start with comprehension, end with feedback.',
      'Include at least one FREE_TEXT and one RATING_SCALE question.',
      'MULTIPLE_CHOICE: 3-5 options. MULTI_SELECT: 3-6 options. YES_NO / RATING_SCALE / FREE_TEXT: no options.',
    ],
    inputVariables: ['fileContent'],
    responseFormat: `Return ONLY valid JSON, no markdown:
{"title": "...", "description": "...", "questions": [{"type":"MULTIPLE_CHOICE","question":"...","options":["A","B"],"required":true,"order":1}]}`,
  },
  {
    key: 'survey.summary',
    name: 'Surveys — Results Summary',
    purpose: 'Summarise overall survey results for a training programme.',
    category: 'survey',
    tone: 'Expert data analyst, professional.',
    requirements: [
      'Provide a clear, professional summary of the overall results in 3-5 paragraphs.',
      'Identify key trends, notable patterns, and any areas of concern.',
      'Use HTML formatting (<p>, <strong>, <ul>, <li>) for structure.',
      'Be factual and specific — reference actual numbers and percentages.',
    ],
    inputVariables: ['surveyTitle', 'totalResponses', 'questionSummaries', 'caveat'],
    responseFormat: 'HTML using <p>, <strong>, <ul>, <li>.',
  },
  {
    key: 'survey.comparative',
    name: 'Surveys — Comparative Analysis',
    purpose: 'Compare survey results across roles and organisations.',
    category: 'survey',
    tone: 'Expert data analyst.',
    requirements: [
      'Highlight meaningful differences between roles and organisations.',
      'Focus on questions where groups diverged significantly.',
      'Use HTML formatting (<p>, <strong>, <ul>, <li>, <table>, <tr>, <td>).',
      'Be specific — cite numbers and percentages.',
      'Note any patterns that suggest different needs or experiences across groups.',
    ],
    inputVariables: ['surveyTitle', 'totalResponses', 'roles', 'orgs', 'breakdowns', 'caveat'],
    responseFormat: 'HTML using <p>, <strong>, <ul>, <li>, <table>, <tr>, <td>.',
  },
  {
    key: 'survey.recommendations',
    name: 'Surveys — Recommendations',
    purpose: 'Produce a prioritised list of actionable recommendations from survey results.',
    category: 'survey',
    tone: 'Expert training programme advisor.',
    requirements: [
      'Produce a prioritised list of 5-7 actionable recommendations.',
      'Each recommendation must reference specific survey questions and data points.',
      'Each recommendation must be concrete and implementable.',
      'Indicate priority (High/Medium/Low).',
      'Focus on improvements that would have the most impact on training quality and learner satisfaction.',
      'Use HTML formatting (<p>, <strong>, <ol>, <li>).',
    ],
    inputVariables: ['surveyTitle', 'totalResponses', 'questionSummaries', 'caveat'],
    responseFormat: 'HTML ordered list using <p>, <strong>, <ol>, <li>.',
  },

  // ─── Training ────────────────────────────────────────────────────────────

  // ─── Training generator v2 (structured output, see lib/training-gen) ─────
  // runPromptObject enforces the shape, so responseFormat only asks the model
  // to fill every field. TRAINING_RULES applies to all five.

  {
    key: 'training.brief',
    name: 'Training — Course Brief',
    purpose: 'Read the source material and propose who the programme is for, how long it takes and what learners will be able to do by the end.',
    category: 'training',
    tone: 'Experienced instructional designer.',
    requirements: [
      ...TRAINING_RULES,
      'Write 3 to 6 learning objectives. Each starts with an observable verb (identify, explain, describe, use, plan, compare) and never with "understand" or "know".',
      'Give each objective an id of the form o1, o2, o3 in order.',
      'audience is one sentence describing who the programme is for, taken from the source.',
      'estimatedMinutes is the total learner time for the whole programme.',
    ],
    inputVariables: ['programName', 'formattedContent'],
    responseFormat: STRUCTURED_FORMAT,
  },
  {
    key: 'training.outline.v2',
    name: 'Training — Outline v2',
    purpose: 'Design modules and lessons that meet the brief, using only the provided source sections.',
    category: 'training',
    tone: 'Experienced instructional designer.',
    requirements: [
      ...TRAINING_RULES,
      'Progress from simple to complex.',
      'Every lesson cites at least one source section (fileIndex and sectionIndices exactly as labelled in the source) and at least one objective id from the brief.',
      'Every objective in the brief is covered by at least one lesson.',
      'summary is one sentence saying what the lesson covers and what it leaves to other lessons.',
      'Use no more than 12 modules and no more than 10 lessons per module.',
    ],
    inputVariables: ['programName', 'briefJson', 'formattedContent'],
    responseFormat: STRUCTURED_FORMAT,
  },
  {
    key: 'training.lesson.v2',
    name: 'Training — Lesson v2',
    purpose: 'Write one lesson of a programme from its source sections, as parts the app assembles into a fixed layout.',
    category: 'training',
    tone: 'Clear, warm and practical trainer. Follow the lens guidance.',
    requirements: [
      ...TRAINING_RULES,
      "Cover only what this lesson's summary describes. Do not repeat material that the outline context gives to other lessons.",
      'bodyHtml uses only <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote> and <img>. Never use <h1> or <h2>: the layout adds those.',
      'Place listed images where they belong in bodyHtml, and give every listed image a short descriptive alt text in imageAlts.',
      'whatYouWillLearn has 1 to 4 short items drawn from the lesson objectives.',
      'keyPoints has 3 to 5 short plain-text sentences summarising the lesson.',
      'checkIn is one question with exactly 3 options about the most important idea, with correctIndex and one sentence of feedback; use null when the source is too thin for a fair question.',
    ],
    inputVariables: ['lessonTitle', 'lessonSummary', 'lessonObjectives', 'outlineContext', 'sourceText', 'lensGuidance', 'imageList'],
    responseFormat: STRUCTURED_FORMAT,
  },
  {
    key: 'training.quiz.v2',
    name: 'Training — Quiz v2',
    purpose: 'Write multiple-choice questions that test the lesson objectives using only the lesson text.',
    category: 'training',
    tone: 'Fair, clear assessor. Follow the lens guidance.',
    requirements: [
      ...TRAINING_RULES,
      'Write exactly the requested number of questions, each with exactly 4 options and one correctIndex.',
      'Mix kinds: "recall" checks a fact from the lesson; "apply" describes a short realistic situation built only from the lesson and asks what to do.',
      'Wrong options are plausible misunderstandings of the lesson, never jokes or obviously silly answers.',
      'Never use "all of the above" or "none of the above".',
      'objectiveId names the objective the question tests.',
      'explanation says in one or two sentences why the correct option is right.',
    ],
    inputVariables: ['count', 'lessonText', 'objectivesJson', 'lensGuidance'],
    responseFormat: STRUCTURED_FORMAT,
  },
  {
    key: 'training.quizReview',
    name: 'Training — Quiz Checker',
    purpose: 'Check each quiz question strictly against the lesson text before a human sees it.',
    category: 'training',
    tone: 'Strict, careful reviewer.',
    requirements: [
      ...TRAINING_RULES,
      "Return one verdict per question, using the question's index from the input.",
      'answerableFromLesson is true only if the lesson text alone is enough to answer it.',
      'exactlyOneCorrect is true only if exactly one option is defensibly correct.',
      'clearWording is false for ambiguous, trick or double-negative wording.',
      'issue explains any failure in one sentence; use null when all three checks pass.',
    ],
    inputVariables: ['lessonText', 'questionsJson'],
    responseFormat: STRUCTURED_FORMAT,
  },

  {
    key: 'training.quizGenerate',
    name: 'Training — Quiz Generator',
    purpose: 'Generate multiple-choice quiz questions from lesson content.',
    category: 'training',
    tone: 'Training quiz generator.',
    requirements: [
      'Test understanding of a key concept from the lesson.',
      'Each question has exactly 4 options labelled A, B, C, D.',
      'Exactly one correct answer.',
      'Include a brief explanation of why the correct answer is right.',
    ],
    inputVariables: ['count', 'plainText'],
    responseFormat: `Return ONLY a valid JSON array:
[{"question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correctAnswer": "A) ...", "explanation": "..."}]`,
  },
  {
    key: 'training.outlineStructure',
    name: 'Training — Outline (Structure Mode)',
    purpose: 'Organise provided source material into a structured training programme without inventing content.',
    category: 'training',
    tone: 'Training content organiser.',
    requirements: [
      'Do NOT invent, add, or paraphrase any content.',
      'Only use material that exists in the source documents.',
      'Map every lesson to specific source sections using their numeric file and section indices.',
      'Propose a logical grouping of the existing material into modules and lessons.',
      'Each lesson must reference at least one source section.',
    ],
    inputVariables: ['programName', 'formattedContent'],
    responseFormat: `Return ONLY a valid JSON object:
{"programName": "...", "modules": [{"title": "...", "description": "...", "lessons": [{"title": "...", "sourceRefs": [{"fileIndex": 0, "sectionIndices": [0, 1]}]}]}]}
Use numeric values for fileIndex and sectionIndices.`,
  },
  {
    key: 'training.outlineGenerate',
    name: 'Training — Outline (Generate Mode)',
    purpose: 'Design a pedagogically sound training programme from provided source material.',
    category: 'training',
    tone: 'Instructional designer.',
    requirements: [
      'Design a clear, progressive learning structure (simple to complex).',
      'Map every lesson to the source sections that contain the relevant material.',
      'You may group and sequence material differently from how it appears in the source.',
      'Do NOT invent content — all lessons must be grounded in the source material.',
      'Each lesson must reference at least one source section.',
    ],
    inputVariables: ['programName', 'formattedContent'],
    responseFormat: `Return ONLY a valid JSON object:
{"programName": "...", "modules": [{"title": "...", "description": "...", "lessons": [{"title": "...", "sourceRefs": [{"fileIndex": 0, "sectionIndices": [0, 1]}]}]}]}
Use numeric values for fileIndex and sectionIndices.`,
  },
  {
    key: 'training.lessonContent',
    name: 'Training — Lesson Content',
    purpose: 'Generate HTML lesson body content from source sections.',
    category: 'training',
    tone: 'Varies by sub-mode (preserves wording in structure mode; clear literal in autism lens; professional practical in practitioner lens).',
    requirements: [
      'Output HTML (<p>, <h2>, <h3>, <ul>, <li>, <strong>, <em>).',
      'Ground every statement in the provided source sections.',
      'Do not invent facts or examples not present in source.',
      'Use clear, accessible language.',
    ],
    inputVariables: ['lessonTitle', 'sourceText', 'modeGuidance'],
    responseFormat: 'HTML content only (no <html> / <body> wrapper, no code fences).',
  },

  // ─── Library ─────────────────────────────────────────────────────────────

  {
    key: 'library.metadata',
    name: 'Library — Document Metadata',
    purpose: 'Generate a title and 2-3 sentence description for a document in the training library based on its filename.',
    category: 'library',
    tone: 'Clear, friendly, suitable for young people and training practitioners.',
    requirements: [
      'Title should be human-readable (not the raw filename).',
      'Description should summarise what the document likely contains based on its name.',
      'Description should be 2-3 sentences.',
    ],
    inputVariables: ['collectionContext', 'fileName'],
    responseFormat: 'Return ONLY valid JSON, no markdown: {"title": "...", "description": "..."}',
  },

  {
    key: 'library.collection.metadata',
    name: 'Library — Collection Metadata',
    purpose: 'Generate a coherent title and a 2-3 sentence description for a Library collection by synthesising the list of document filenames it contains. The description should explain what the collection is about and who it is for, in plain English.',
    category: 'library',
    tone: 'Clear, friendly, plain-English. Suitable for autistic young people, parents, carers, and training practitioners. Use UK English.',
    requirements: [
      'Title should be a short human-readable phrase (under 60 chars), not the raw filenames.',
      'Description should be 2-3 sentences describing what the collection covers and who it helps.',
      'If a topic seed is provided alongside the filenames, weight the seed heavily — the admin is steering the framing.',
      'Never diagnose or suggest autism. Strengths-focused. UK English.',
      'If no filenames and no seed are provided, return a generic but useful description rather than failing.',
    ],
    inputVariables: ['fileNames', 'topicSeed', 'currentTitle', 'currentDescription', 'brandContext'],
    responseFormat: 'Return ONLY valid JSON, no markdown: {"title": "...", "description": "..."}',
  },
]

async function main() {
  let created = 0
  let skipped = 0

  for (const seed of SEEDS) {
    const existing = await prisma.aiPrompt.findUnique({ where: { key: seed.key } })
    if (existing) {
      skipped++
      continue
    }

    const defaultFields = {
      tone: seed.tone,
      requirements: seed.requirements,
      exampleOutput: seed.exampleOutput ?? null,
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
        exampleOutput: seed.exampleOutput ?? null,
        inputVariables: seed.inputVariables,
        responseFormat: seed.responseFormat,
        model: DEFAULT_MODEL_ID,
        enabled: true,
        defaultFields,
      },
    })
    created++
  }

  console.log(`AI prompts seed: created ${created}, skipped ${skipped} (already present).`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
