import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { parseFiles, getSupportedExtensions } from '@/lib/file-parser'
import { generateLessonContent, generateQuizForLesson, withRetry } from '@/lib/content-generator'
import type {
  ParsedFile,
  GenerationMode,
  GenerationLens,
  GeneratedProgram,
  SourceRef,
  SSEEvent,
} from '@/lib/content-generator-types'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

interface RegenerateMetadata {
  existingParsedContent: ParsedFile[]
  program: GeneratedProgram
  failedLessons: Array<{ moduleIndex: number; lessonIndex: number }>
  mode: GenerationMode
  lens?: GenerationLens
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_TRAINING)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  }

  if (!process.env.AI_GATEWAY_API_KEY) {
    return new Response(JSON.stringify({ error: 'AI_GATEWAY_API_KEY is not configured' }), { status: 500 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid form data' }), { status: 400 })
  }

  // Parse metadata JSON
  const metadataRaw = formData.get('metadata')
  if (!metadataRaw || typeof metadataRaw !== 'string') {
    return new Response(JSON.stringify({ error: 'metadata field is required' }), { status: 400 })
  }

  let metadata: RegenerateMetadata
  try {
    metadata = JSON.parse(metadataRaw) as RegenerateMetadata
  } catch {
    return new Response(JSON.stringify({ error: 'metadata must be valid JSON' }), { status: 400 })
  }

  const { existingParsedContent, program, failedLessons, mode, lens } = metadata

  if (!existingParsedContent || !Array.isArray(existingParsedContent)) {
    return new Response(JSON.stringify({ error: 'existingParsedContent is required' }), { status: 400 })
  }
  if (!program || !program.modules) {
    return new Response(JSON.stringify({ error: 'program is required' }), { status: 400 })
  }
  if (!failedLessons || !Array.isArray(failedLessons) || failedLessons.length === 0) {
    return new Response(JSON.stringify({ error: 'failedLessons must be a non-empty array' }), { status: 400 })
  }
  if (!mode || (mode !== 'structure' && mode !== 'generate')) {
    return new Response(JSON.stringify({ error: 'mode is required and must be "structure" or "generate"' }), { status: 400 })
  }

  // Parse any new files from the form
  const fileEntries = formData.getAll('files')
  const supportedExtensions = getSupportedExtensions()
  const newFiles: File[] = []

  for (const entry of fileEntries) {
    if (!(entry instanceof File)) continue
    const filename = entry.name
    const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase()
    if (!supportedExtensions.includes(ext)) {
      return new Response(
        JSON.stringify({ error: `Unsupported file format "${ext}". Supported: ${supportedExtensions.join(', ')}` }),
        { status: 400 }
      )
    }
    newFiles.push(entry)
  }

  let combinedParsedContent: ParsedFile[] = [...existingParsedContent]
  if (newFiles.length > 0) {
    try {
      const newParsed = await parseFiles(newFiles)
      combinedParsedContent = [...existingParsedContent, ...newParsed]
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse new files'
      return new Response(JSON.stringify({ error: message }), { status: 400 })
    }
  }

  // Build all-encompassing sourceRefs covering every file and section
  const allSourceRefs: SourceRef[] = combinedParsedContent.map((file, fileIndex) => ({
    fileIndex,
    sectionIndices: file.sections.map((_, sIndex) => sIndex),
  }))

  const totalLessons = failedLessons.length

  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(event: SSEEvent) {
        const data = `data: ${JSON.stringify(event)}\n\n`
        controller.enqueue(new TextEncoder().encode(data))
      }

      // Deep-clone the program so we can update the failed lessons in place
      const updatedProgram: GeneratedProgram = JSON.parse(JSON.stringify(program))

      for (let i = 0; i < failedLessons.length; i++) {
        const { moduleIndex, lessonIndex } = failedLessons[i]
        const lessonCounter = i + 1

        const targetModule = updatedProgram.modules[moduleIndex]
        if (!targetModule) {
          sendEvent({
            type: 'lesson-error',
            moduleIndex,
            lessonIndex,
            error: `Module at index ${moduleIndex} not found in program`,
          })
          continue
        }

        const targetLesson = targetModule.lessons[lessonIndex]
        if (!targetLesson) {
          sendEvent({
            type: 'lesson-error',
            moduleIndex,
            lessonIndex,
            error: `Lesson at index ${lessonIndex} not found in module ${moduleIndex}`,
          })
          continue
        }

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
              combinedParsedContent,
              targetLesson.title,
              allSourceRefs,
              mode,
              lens
            )
          )
          targetLesson.content = lessonContent
          delete targetLesson.error
          sendEvent({
            type: 'lesson-complete',
            moduleIndex,
            lessonIndex,
            content: lessonContent,
          })
        } catch (err) {
          lessonError = err instanceof Error ? err.message : 'Failed to regenerate lesson content'
          lessonContent = ''
          targetLesson.error = lessonError
          sendEvent({
            type: 'lesson-error',
            moduleIndex,
            lessonIndex,
            error: lessonError,
          })
        }

        // Attempt quiz regeneration (non-fatal)
        if (lessonContent) {
          sendEvent({
            type: 'progress',
            lesson: lessonCounter,
            total: totalLessons,
            phase: 'quiz',
          })
          try {
            const quizQuestions = await withRetry(() =>
              generateQuizForLesson(lessonContent, mode, lens)
            )
            targetLesson.quizQuestions = quizQuestions
            sendEvent({
              type: 'quiz-complete',
              moduleIndex,
              lessonIndex,
              questions: quizQuestions,
            })
          } catch (err) {
            const quizError = err instanceof Error ? err.message : 'Failed to regenerate quiz'
            sendEvent({
              type: 'lesson-error',
              moduleIndex,
              lessonIndex,
              error: `Quiz regeneration failed: ${quizError}`,
            })
          }
        }
      }

      sendEvent({ type: 'complete', program: updatedProgram })
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
