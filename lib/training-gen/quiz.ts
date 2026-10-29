// Quiz questions are drafted, checked by fixed rules, then checked again by a
// separate reviewing prompt. Failures get one rewrite; anything still failing
// is kept but flagged (needsReview) so a person looks at it before saving.

import { runPromptObject } from '@/lib/ai-runner'
import type { GeneratedQuizQuestion, GenerationLens } from '@/lib/content-generator-types'
import { lensGuidance } from './lesson'
import { quizDraftSchema, quizReviewSchema, LIMITS, type CourseBrief, type QuizDraft } from './schemas'

type DraftQuestion = QuizDraft['questions'][number]

const REVIEW_FAILED = 'Not checked: the checking step failed'

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** The first rule a question breaks, or null. */
export function ruleProblems(q: DraftQuestion, lens: GenerationLens): string | null {
  if (q.options.length !== LIMITS.quizOptions) return `Needs exactly ${LIMITS.quizOptions} options.`
  const normalised = q.options.map((o) => o.trim().toLowerCase())
  if (new Set(normalised).size !== normalised.length) return 'Two options are the same.'
  if (!Number.isInteger(q.correctIndex) || q.options[q.correctIndex] === undefined) return 'The correct answer is missing.'
  if (normalised.some((o) => /\b(all|none) of the above\b/.test(o))) return 'Uses "all of the above" or "none of the above".'
  // Upper-case NOT / EXCEPT is how negative questions are usually flagged; a
  // plain lower-case "not" inside a sentence is often natural, so it's allowed.
  if (lens === 'autism' && /\b(NOT|EXCEPT)\b/.test(q.question)) return 'Asks a negative ("NOT" / "EXCEPT") question, which is easy to misread.'
  return null
}

/** True when the question has 4 options and a correct one, so it can be saved at all. */
function storable(q: DraftQuestion): boolean {
  return q.options.length === LIMITS.quizOptions && q.options[q.correctIndex] !== undefined
}

export function toStoredQuestion(q: DraftQuestion, needsReview?: string): GeneratedQuizQuestion {
  return {
    question: q.question,
    options: q.options,
    correctAnswer: q.options[q.correctIndex] ?? '',
    explanation: q.explanation,
    ...(needsReview ? { needsReview } : {}),
  }
}

interface Checked {
  passed: DraftQuestion[]
  failed: { q: DraftQuestion; issue: string }[]
  reviewed: boolean
}

async function check(questions: DraftQuestion[], lessonText: string, lens: GenerationLens): Promise<Checked> {
  const failed: Checked['failed'] = []
  const clean: DraftQuestion[] = []
  for (const q of questions) {
    const problem = ruleProblems(q, lens)
    if (problem) failed.push({ q, issue: problem })
    else clean.push(q)
  }
  if (clean.length === 0) return { passed: [], failed, reviewed: true }

  let verdicts
  try {
    const review = await runPromptObject(
      'training.quizReview',
      {
        lessonText,
        questionsJson: JSON.stringify(clean.map((q, index) => ({ index, question: q.question, options: q.options, correctIndex: q.correctIndex }))),
      },
      quizReviewSchema,
    )
    verdicts = review.verdicts
  } catch {
    // The rule-clean questions are still usable; a person checks them instead.
    return { passed: [], failed: [...failed, ...clean.map((q) => ({ q, issue: REVIEW_FAILED }))], reviewed: false }
  }

  const passed: DraftQuestion[] = []
  clean.forEach((q, index) => {
    const v = verdicts.find((x) => x.index === index)
    if (v && v.answerableFromLesson && v.exactlyOneCorrect && v.clearWording) passed.push(q)
    else failed.push({ q, issue: v?.issue?.trim() || 'The checker could not confirm this question.' })
  })
  return { passed, failed, reviewed: true }
}

export async function generateCheckedQuiz(args: {
  lessonHtml: string
  objectives: CourseBrief['objectives']
  lens: GenerationLens
  count?: number
}): Promise<GeneratedQuizQuestion[]> {
  const count = Math.min(10, Math.max(1, Math.round(args.count ?? 5)))
  const lessonText = stripHtml(args.lessonHtml)

  const draft = async (n: number) =>
    (
      await runPromptObject(
        'training.quiz.v2',
        {
          count: String(n),
          lessonText,
          objectivesJson: JSON.stringify(args.objectives),
          lensGuidance: lensGuidance(args.lens),
        },
        quizDraftSchema,
      )
    ).questions.slice(0, n)

  // Questions with no usable answer are dropped rather than flagged: they
  // can't be stored, and save-program rejects a blank correct answer.
  const finish = (passed: DraftQuestion[], failed: Checked['failed']) =>
    [
      ...passed.map((q) => toStoredQuestion(q)),
      ...failed.filter(({ q }) => storable(q)).map(({ q, issue }) => toStoredQuestion(q, issue)),
    ].slice(0, count)

  const first = await check(await draft(count), lessonText, args.lens)

  // No second round when the checker is down: a rewrite couldn't be checked
  // either, so the first draft goes to the admin flagged instead.
  if (first.failed.length === 0 || !first.reviewed) return finish(first.passed, first.failed)

  let second: Checked
  try {
    second = await check(await draft(first.failed.length), lessonText, args.lens)
  } catch {
    // The rewrite failed; keep what the first round produced, flags and all.
    return finish(first.passed, first.failed)
  }
  return finish([...first.passed, ...second.passed], second.failed)
}
