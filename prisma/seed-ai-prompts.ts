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

const SEEDS: PromptSeed[] = [
  // ─── CV Builder ──────────────────────────────────────────────────────────

  {
    key: 'cv.personalStatement',
    name: 'CV Builder — Personal Statement',
    purpose: "Write a UK CV personal statement from the user's experience and education.",
    category: 'cv',
    tone: 'Confident and clear; write in the first person. Strength-focused.',
    requirements: [
      'Write 3-4 sentences in the first person.',
      'Focus on strengths, skills, and what the person can offer.',
      'Use simple, clear language that is easy to understand.',
      'Use UK English spelling throughout (e.g. organised, recognised, specialised).',
      'Never mention disabilities, diagnoses, or health conditions.',
      'Do not include any headings, labels, or formatting — return ONLY the personal statement text.',
    ],
    inputVariables: ['name', 'roleContext', 'experience', 'education'],
    responseFormat: 'Return ONLY the personal statement text. No headings, no labels.',
  },
  {
    key: 'cv.rephraseBullet',
    name: 'CV Builder — Rephrase Bullet Point',
    purpose: 'Rephrase a CV work-experience bullet point to use a strong action verb and a concise sentence.',
    category: 'cv',
    tone: 'Professional and specific.',
    requirements: [
      'Start with a strong action verb (e.g. Managed, Delivered, Organised, Supported).',
      'Keep it to one concise sentence.',
      'Be specific and results-oriented where possible.',
      'Use simple, clear language that is easy to understand.',
      'Focus on strengths and achievements.',
      'Use UK English spelling throughout.',
      'Never mention disabilities, diagnoses, or health conditions.',
      'Return ONLY the rephrased bullet point, nothing else.',
    ],
    inputVariables: ['originalText', 'jobTitle', 'employer'],
    responseFormat: 'Return ONLY the rephrased bullet point.',
  },
  {
    key: 'cv.suggestSkills',
    name: 'CV Builder — Suggest Skills',
    purpose: 'Suggest 8-12 skills for a UK CV as a JSON array, grouped into categories.',
    category: 'cv',
    tone: 'Practical. Prefer transferable skills over jargon.',
    requirements: [
      'Each skill should belong to one of these categories: Technical, Communication, Teamwork, Personal, Organisation.',
      'Use simple, clear language that is easy to understand.',
      'Focus on strengths and transferable skills.',
      'Never mention disabilities, diagnoses, or health conditions.',
    ],
    inputVariables: ['experience', 'education'],
    responseFormat:
      'Return ONLY a valid JSON array with no additional text, markdown, or formatting. Format: [{"name":"Skill Name","category":"Category"}]. Example: [{"name":"Microsoft Office","category":"Technical"},{"name":"Active Listening","category":"Communication"}]',
  },
  {
    key: 'cv.improveDescription',
    name: 'CV Builder — Improve Work Description',
    purpose: 'Convert a rough description of job duties into 3-5 professional CV bullet points.',
    category: 'cv',
    tone: 'Professional, results-oriented.',
    requirements: [
      'Each bullet point must start with a strong action verb (e.g. Managed, Delivered, Organised, Supported, Coordinated).',
      'Be specific and results-oriented where possible.',
      'Use simple, clear language that is easy to understand.',
      'Focus on strengths and achievements.',
      'Use UK English spelling throughout.',
      'Never mention disabilities, diagnoses, or health conditions.',
      'Return each bullet point on its own line, starting with "• ".',
      'Return ONLY the bullet points, no headings or extra text.',
    ],
    inputVariables: ['description', 'jobTitle', 'employer'],
    responseFormat: 'Return each bullet point on its own line, starting with "• ". No headings or extra text.',
  },
  {
    key: 'cv.expandInterests',
    name: 'CV Builder — Expand Interests',
    purpose: 'Rewrite a short list of interests and hobbies into a brief natural-sounding CV paragraph.',
    category: 'cv',
    tone: 'Plain-English, first person. Describe what the person actually enjoys.',
    requirements: [
      'Write in the first person, 1-3 short sentences.',
      'Describe the actual activities listed. Keep every activity named (e.g. if they say "golf", the result must clearly be about playing golf — not abstract qualities like discipline or strategy).',
      'Do NOT turn the activities into action-verb bullet points.',
      'Do NOT invent transferable-skill spin (no "which demonstrates teamwork", "builds resilience", etc.).',
      'A light, plain detail is fine (e.g. "I play golf at weekends") but do not fabricate achievements, clubs, or competitions.',
      'If the input is vague, keep the output vague rather than inventing specifics.',
      'Use simple, clear language.',
      'Use UK English spelling throughout.',
      'Never mention disabilities, diagnoses, or health conditions.',
      'Return ONLY the paragraph text. No headings, no labels, no bullet points.',
    ],
    inputVariables: ['rawText'],
    responseFormat: 'Return ONLY the paragraph text. No headings, no labels, no bullet points.',
  },

  // ─── Careers Advisor ─────────────────────────────────────────────────────

  {
    key: 'careers.report',
    name: 'Careers Advisor — Report',
    purpose: 'Generate a personalised careers report JSON for a young person based on questionnaire answers.',
    category: 'careers',
    tone: 'Positive, practical, strength-focused. Written in second person ("You have...").',
    requirements: [
      'Suggest 3 to 5 career areas in the "careers" array.',
      'Include 3 to 5 items in the "nextSteps" array.',
      'Each career suggestion must be realistic and achievable, not aspirational fantasy.',
      "Ground every suggestion in the young person's specific answers — do not give generic advice.",
      'Next steps should be concrete actions (e.g. "Search for apprenticeships on gov.uk", "Ask your careers professional about work experience in X").',
      'Reference UK-specific resources: gov.uk, apprenticeships, Access to Work scheme, National Careers Service.',
      'NEVER mention autism, disability, diagnosis, or any health condition.',
      'Use strength-focused, positive language throughout.',
      'Use UK English spelling (e.g. organised, recognised, specialised).',
      'Reference workplace adjustments as normal good practice, not as accommodations for a condition.',
      'Return ONLY the JSON object. No markdown, no code fences, no explanation.',
    ],
    inputVariables: ['formattedAnswers'],
    responseFormat: `You MUST respond with valid JSON matching this exact structure:
{
  "strengths": "A short paragraph (3-5 sentences) summarising the young person's key strengths based on their answers. Written in second person. Be specific to their answers, not generic.",
  "careers": [{"name": "Career Name", "explanation": "2-3 sentences grounded in their specific answers."}],
  "nextSteps": ["A concrete, actionable next step"],
  "workplaceSupport": "A paragraph about workplace support suggestions based on their environment, sensory, and communication preferences. Reference UK-specific support like Access to Work, reasonable adjustments, flexible working arrangements."
}`,
  },

  // ─── Observations (ASD) ──────────────────────────────────────────────────

  {
    key: 'observations.summary',
    name: 'Observations — Summary',
    purpose: 'Summarise observational data for a child to help identify patterns for discussion with healthcare professionals.',
    category: 'observations',
    tone: 'Warm, accessible, non-clinical, practitioner-friendly.',
    requirements: [
      'Provide a brief summary (2-3 sentences) of the observed patterns in practitioner-friendly language.',
      'Focus only on what has been observed — do not speculate or diagnose.',
      'NEVER provide a diagnosis. NEVER suggest a child has autism.',
      'End with: "These observations are for discussion with your GP, health visitor, or SENCO. This is not a diagnosis."',
    ],
    inputVariables: ['childName', 'age', 'observationText'],
    responseFormat: 'Plain text, 2-3 sentences, ending with the disclaimer verbatim.',
  },
  {
    key: 'observations.patterns',
    name: 'Observations — Pattern Detection',
    purpose: 'Identify specific behaviour patterns in observational data.',
    category: 'observations',
    tone: 'Factual, carer-friendly.',
    requirements: [
      'Identify which domains (Social Communication, Behaviour and Play, Sensory Responses) show the most frequent patterns.',
      'List 2-4 specific behaviour patterns using carer-friendly language.',
      'Format as a brief bulleted list.',
      'Do not speculate beyond what the data shows.',
      'NEVER provide a diagnosis. NEVER suggest a child has autism.',
    ],
    inputVariables: ['observationText'],
    responseFormat: 'Bulleted list of 2-4 observed patterns.',
  },
  {
    key: 'observations.actions',
    name: 'Observations — Action Guidance',
    purpose: 'Suggest practical next steps for a practitioner based on observed behavioural patterns.',
    category: 'observations',
    tone: 'Warm, encouraging, non-alarming.',
    requirements: [
      'Provide 3-4 practical, actionable next steps for the practitioner.',
      'Include suggestions about who to speak to (GP, health visitor, SENCO, speech therapist etc.).',
      'Format as a bulleted list.',
      'NEVER provide a diagnosis. NEVER suggest a child has autism.',
      'End with: "These observations are for discussion with your GP, health visitor, or SENCO. This is not a diagnosis."',
    ],
    inputVariables: ['patterns'],
    responseFormat: 'Bulleted list of 3-4 actions, ending with the disclaimer verbatim.',
  },
  {
    key: 'observations.report',
    name: 'Observations — Full Insight Report',
    purpose: 'Produce a full three-section insight report (summary, patterns, recommendations) from observational data.',
    category: 'observations',
    tone: 'Warm, accessible, non-clinical.',
    requirements: [
      'Structure the response with three labelled sections: SUMMARY, PATTERNS, RECOMMENDATIONS.',
      'SUMMARY: 2-3 sentences of the overall observation picture.',
      'PATTERNS: bullet points of the main behavioural patterns observed across domains.',
      'RECOMMENDATIONS: 3-4 practical next steps including who to speak to.',
      'NEVER provide a diagnosis. NEVER suggest a child has autism.',
      'Always end the RECOMMENDATIONS section with: "These observations are for discussion with your GP, health visitor, or SENCO. This is not a diagnosis."',
    ],
    inputVariables: ['childName', 'age', 'practitionerNotes', 'observationCount', 'observationText'],
    responseFormat: `Format exactly:
SUMMARY:
[2-3 sentences]

PATTERNS:
[bullet points]

RECOMMENDATIONS:
[3-4 next steps ending with the disclaimer]`,
  },

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
