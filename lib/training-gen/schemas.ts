import { z } from 'zod'

// Schemas the model must fill via structured output (runPromptObject).
//
// They are deliberately loose: types, enums and required fields only. Gemini
// ignores or rejects many JSON Schema keywords (lengths, ranges, patterns), so
// those limits live in LIMITS and are enforced in code after parsing, where a
// breach is repaired or flagged instead of failing the whole generation.

export const LIMITS = {
  objectives: [3, 6],
  modules: [1, 12],
  lessonsPerModule: [1, 10],
  whatYouWillLearn: [1, 4],
  keyPoints: [3, 5],
  checkInOptions: 3,
  quizOptions: 4,
} as const

export const courseBriefSchema = z.object({
  audience: z.string(),
  estimatedMinutes: z.number(),
  objectives: z.array(z.object({ id: z.string(), text: z.string() })),
})
export type CourseBrief = z.infer<typeof courseBriefSchema>

export const sourceRefSchema = z.object({
  fileIndex: z.number(),
  sectionIndices: z.array(z.number()),
})

export const outlineSchema = z.object({
  programName: z.string(),
  modules: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      lessons: z.array(
        z.object({
          title: z.string(),
          summary: z.string(),
          objectiveIds: z.array(z.string()),
          sourceRefs: z.array(sourceRefSchema),
        }),
      ),
    }),
  ),
})
export type Outline = z.infer<typeof outlineSchema>

export const lessonDraftSchema = z.object({
  whatYouWillLearn: z.array(z.string()),
  bodyHtml: z.string(),
  keyPoints: z.array(z.string()),
  checkIn: z
    .object({
      question: z.string(),
      options: z.array(z.string()),
      correctIndex: z.number(),
      feedback: z.string(),
    })
    .nullable(),
  imageAlts: z.array(z.object({ url: z.string(), alt: z.string() })),
})
export type LessonDraft = z.infer<typeof lessonDraftSchema>

export const quizDraftSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
      correctIndex: z.number(),
      explanation: z.string(),
      objectiveId: z.string(),
      kind: z.enum(['recall', 'apply']),
    }),
  ),
})
export type QuizDraft = z.infer<typeof quizDraftSchema>

export const quizReviewSchema = z.object({
  verdicts: z.array(
    z.object({
      index: z.number(),
      answerableFromLesson: z.boolean(),
      exactlyOneCorrect: z.boolean(),
      clearWording: z.boolean(),
      issue: z.string().nullable(),
    }),
  ),
})
export type QuizReview = z.infer<typeof quizReviewSchema>
