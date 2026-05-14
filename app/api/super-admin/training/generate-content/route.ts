import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { createRateLimiter } from '@/lib/rate-limit'
import { generateLessonContent, generateQuizForLesson } from '@/lib/content-generator'
import type {
  ParsedFile,
  GenerationMode,
  GenerationLens,
  GeneratedOutline,
  GeneratedProgram,
  GeneratedModule,
  GeneratedLesson,
  SSEEvent,
  OutlineLesson,
} from '@/lib/content-generator-types'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

// Max parallel lesson generations. Higher = faster but more gateway pressure.
const CONCURRENCY = 3

// Belt-and-braces rate limiting on top of the MANAGE_TRAINING role gate.
// One full program generation fans out into many AI calls (per-lesson + quiz),
// so even a single accidental retry storm can cost real money. 10 program
// generations per 5 minutes covers any sane batch run; 20 per day caps the
// worst case (compromised admin / runaway script).
const trainingGenLimiter = createRateLimiter('training-gen', 5 * 60 * 1000, 10)
const trainingGenDailyLimiter = createRateLimiter('training-gen-daily', 24 * 60 * 60 * 1000, 20)

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_TRAINING)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  }

  if (!process.env.AI_GATEWAY_API_KEY) {
    return new Response(JSON.stringify({ error: 'AI_GATEWAY_API_KEY is not configured' }), { status: 500 })
  }

  const daily = await trainingGenDailyLimiter.check(session.user.id)
  if (!daily.success) {
    return new Response(
      JSON.stringify({
        error: 'You have reached today’s AI generation limit. Please try again tomorrow.',
        code: 'DAILY_LIMIT',
      }),
      { status: 429, headers: { 'Retry-After': String(Math.ceil(daily.retryAfterMs / 1000)) } },
    )
  }
  const rate = await trainingGenLimiter.check(session.user.id)
  if (!rate.success) {
    return new Response(
      JSON.stringify({ error: 'Too many generation requests. Please wait a few minutes before trying again.' }),
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) } },
    )
  }

  let body: {
    outline?: GeneratedOutline
    parsedContent?: ParsedFile[]
    mode?: GenerationMode
    lens?: GenerationLens
  }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 })
  }

  const { outline, parsedContent, mode, lens } = body

  if (!outline || !outline.modules || !Array.isArray(outline.modules)) {
    return new Response(JSON.stringify({ error: 'outline is required' }), { status: 400 })
  }
  if (!parsedContent || !Array.isArray(parsedContent) || parsedContent.length === 0) {
    return new Response(JSON.stringify({ error: 'parsedContent is required and must be a non-empty array' }), { status: 400 })
  }
  if (!mode || (mode !== 'structure' && mode !== 'generate')) {
    return new Response(JSON.stringify({ error: 'mode is required and must be "structure" or "generate"' }), { status: 400 })
  }

  // Capture into typed locals — TS narrowing does not propagate into the
  // nested worker() closure inside the ReadableStream below.
  const validatedOutline: GeneratedOutline = outline
  const validatedParsedContent: ParsedFile[] = parsedContent
  const validatedMode: GenerationMode = mode
  const validatedLens: GenerationLens | undefined = lens

  const totalLessons = validatedOutline.modules.reduce((sum, mod) => sum + (mod.lessons?.length ?? 0), 0)

  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(event: SSEEvent) {
        const data = `data: ${JSON.stringify(event)}\n\n`
        controller.enqueue(new TextEncoder().encode(data))
      }

      try {
        // Flatten all lessons into tasks with pre-assigned lesson numbers so
        // progress events are meaningful even when processed concurrently.
        interface LessonTask {
          modIndex: number
          lesIndex: number
          outlineLesson: OutlineLesson
          lessonNumber: number
        }

        const tasks: LessonTask[] = []
        let lessonNumber = 0
        for (let modIndex = 0; modIndex < validatedOutline.modules.length; modIndex++) {
          const mod = validatedOutline.modules[modIndex]
          for (let lesIndex = 0; lesIndex < (mod.lessons?.length ?? 0); lesIndex++) {
            tasks.push({ modIndex, lesIndex, outlineLesson: mod.lessons[lesIndex], lessonNumber: ++lessonNumber })
          }
        }

        // Pre-allocate result arrays so index-addressed writes from concurrent
        // workers land in the correct positions regardless of completion order.
        const generatedModules: GeneratedModule[] = validatedOutline.modules.map((mod, modIndex) => ({
          title: mod.title,
          description: mod.description,
          order: modIndex + 1,
          lessons: new Array<GeneratedLesson>(mod.lessons?.length ?? 0),
        }))

        // Concurrency-limited worker: each worker pulls the next task from the
        // shared queue until it is empty, then terminates.
        const queue = [...tasks]
        async function worker(): Promise<void> {
          while (true) {
            const task = queue.shift()
            if (!task) break
            const { modIndex, lesIndex, outlineLesson, lessonNumber: lesNum } = task

            sendEvent({ type: 'progress', lesson: lesNum, total: totalLessons, phase: 'content' })

            let lessonContent = ''
            let lessonError: string | undefined

            try {
              lessonContent = await generateLessonContent(
                validatedParsedContent,
                outlineLesson.title,
                outlineLesson.sourceRefs,
                validatedMode,
                validatedLens,
              )
              sendEvent({ type: 'lesson-complete', moduleIndex: modIndex, lessonIndex: lesIndex, content: lessonContent })
            } catch (err) {
              lessonError = err instanceof Error ? err.message : 'Failed to generate lesson content'
              sendEvent({ type: 'lesson-error', moduleIndex: modIndex, lessonIndex: lesIndex, error: lessonError })
            }

            let quizQuestions: GeneratedLesson['quizQuestions'] = []
            if (lessonContent) {
              sendEvent({ type: 'progress', lesson: lesNum, total: totalLessons, phase: 'quiz' })
              try {
                quizQuestions = await generateQuizForLesson(lessonContent, validatedMode, validatedLens)
                sendEvent({ type: 'quiz-complete', moduleIndex: modIndex, lessonIndex: lesIndex, questions: quizQuestions })
              } catch (err) {
                const quizError = err instanceof Error ? err.message : 'Failed to generate quiz'
                sendEvent({ type: 'lesson-error', moduleIndex: modIndex, lessonIndex: lesIndex, error: `Quiz generation failed: ${quizError}` })
              }
            }

            generatedModules[modIndex].lessons[lesIndex] = {
              title: outlineLesson.title,
              content: lessonContent,
              order: lesIndex + 1,
              quizQuestions,
              ...(lessonError ? { error: lessonError } : {}),
            }
          }
        }

        // Spawn CONCURRENCY workers; they drain the shared queue cooperatively.
        await Promise.all(
          Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, () => worker()),
        )

        const program: GeneratedProgram = {
          programName: validatedOutline.programName,
          modules: generatedModules,
        }

        sendEvent({ type: 'complete', program })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Generation failed unexpectedly'
        console.error('generate-content stream error:', err)
        sendEvent({ type: 'error', error: message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
