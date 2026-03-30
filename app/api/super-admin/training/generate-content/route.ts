import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { generateLessonContent, generateQuizForLesson, withRetry } from '@/lib/content-generator'
import type {
  ParsedFile,
  GenerationMode,
  GenerationLens,
  GeneratedOutline,
  GeneratedProgram,
  GeneratedModule,
  GeneratedLesson,
  SSEEvent,
} from '@/lib/content-generator-types'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  }

  if (!process.env.GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not configured' }), { status: 500 })
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

  // Count total lessons for progress reporting
  const totalLessons = outline.modules.reduce((sum, mod) => sum + (mod.lessons?.length ?? 0), 0)

  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(event: SSEEvent) {
        const data = `data: ${JSON.stringify(event)}\n\n`
        controller.enqueue(new TextEncoder().encode(data))
      }

      const generatedModules: GeneratedModule[] = []
      let lessonCounter = 0

      for (let modIndex = 0; modIndex < outline.modules.length; modIndex++) {
        const outlineModule = outline.modules[modIndex]
        const generatedLessons: GeneratedLesson[] = []

        for (let lesIndex = 0; lesIndex < (outlineModule.lessons?.length ?? 0); lesIndex++) {
          const outlineLesson = outlineModule.lessons[lesIndex]
          lessonCounter++

          // Send content-phase progress event
          sendEvent({
            type: 'progress',
            lesson: lessonCounter,
            total: totalLessons,
            phase: 'content',
          })

          let lessonContent: string
          let lessonError: string | undefined

          try {
            lessonContent = await withRetry(() =>
              generateLessonContent(
                parsedContent,
                outlineLesson.title,
                outlineLesson.sourceRefs,
                mode,
                lens
              )
            )
            sendEvent({
              type: 'lesson-complete',
              moduleIndex: modIndex,
              lessonIndex: lesIndex,
              content: lessonContent,
            })
          } catch (err) {
            lessonError = err instanceof Error ? err.message : 'Failed to generate lesson content'
            lessonContent = ''
            sendEvent({
              type: 'lesson-error',
              moduleIndex: modIndex,
              lessonIndex: lesIndex,
              error: lessonError,
            })
          }

          // Attempt quiz generation (non-fatal)
          let quizQuestions: GeneratedLesson['quizQuestions'] = []
          if (lessonContent) {
            sendEvent({
              type: 'progress',
              lesson: lessonCounter,
              total: totalLessons,
              phase: 'quiz',
            })
            try {
              quizQuestions = await withRetry(() =>
                generateQuizForLesson(lessonContent, mode, lens)
              )
              sendEvent({
                type: 'quiz-complete',
                moduleIndex: modIndex,
                lessonIndex: lesIndex,
                questions: quizQuestions,
              })
            } catch (err) {
              const quizError = err instanceof Error ? err.message : 'Failed to generate quiz'
              // Quiz failure is non-fatal — report as lesson-error for quiz phase only
              sendEvent({
                type: 'lesson-error',
                moduleIndex: modIndex,
                lessonIndex: lesIndex,
                error: `Quiz generation failed: ${quizError}`,
              })
            }
          }

          generatedLessons.push({
            title: outlineLesson.title,
            content: lessonContent,
            order: lesIndex + 1,
            quizQuestions,
            ...(lessonError ? { error: lessonError } : {}),
          })
        }

        generatedModules.push({
          title: outlineModule.title,
          description: outlineModule.description,
          order: modIndex + 1,
          lessons: generatedLessons,
        })
      }

      const program: GeneratedProgram = {
        programName: outline.programName,
        modules: generatedModules,
      }

      sendEvent({ type: 'complete', program })
      controller.close()
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
