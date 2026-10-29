// Builds the generated programme on the client as lesson events stream in, so
// a run cut short (the 5-minute function limit, a dropped connection) still
// leaves the finished lessons for the admin, with the rest marked for retry.
// No server imports: the generator modal uses this.

import type { GeneratedProgram, SSEEvent } from '@/lib/content-generator-types'
import type { CourseBrief, Outline } from './schemas'

export const CUT_OFF_ERROR = 'Not written: generation stopped before reaching this lesson. Use Retry.'

export function startProgram(brief: CourseBrief, outline: Outline): GeneratedProgram {
  return {
    programName: outline.programName,
    brief,
    modules: outline.modules.map((mod, m) => ({
      title: mod.title,
      description: mod.description,
      order: m + 1,
      lessons: mod.lessons.map((lesson, l) => ({
        title: lesson.title,
        summary: lesson.summary,
        objectiveIds: lesson.objectiveIds,
        sourceRefs: lesson.sourceRefs,
        content: '',
        order: l + 1,
        quizQuestions: [],
        interactiveBlocks: [],
      })),
    })),
  }
}

function updateLesson(
  program: GeneratedProgram,
  moduleIndex: number,
  lessonIndex: number,
  update: (lesson: GeneratedProgram['modules'][number]['lessons'][number]) => GeneratedProgram['modules'][number]['lessons'][number],
): GeneratedProgram {
  return {
    ...program,
    modules: program.modules.map((mod, m) =>
      m !== moduleIndex ? mod : { ...mod, lessons: mod.lessons.map((les, l) => (l === lessonIndex ? update(les) : les)) },
    ),
  }
}

export function applyEvent(program: GeneratedProgram, event: SSEEvent): GeneratedProgram {
  switch (event.type) {
    case 'lesson-complete':
      return updateLesson(program, event.moduleIndex, event.lessonIndex, (l) => ({
        ...l,
        content: event.content,
        interactiveBlocks: event.interactiveBlocks,
        error: undefined,
      }))
    case 'quiz-complete':
      return updateLesson(program, event.moduleIndex, event.lessonIndex, (l) => ({ ...l, quizQuestions: event.questions }))
    case 'lesson-error':
      // A quiz failure leaves a usable lesson; only a missing lesson is an error.
      return updateLesson(program, event.moduleIndex, event.lessonIndex, (l) =>
        l.content ? l : { ...l, error: event.error },
      )
    default:
      return program
  }
}

export function finishCutOff(program: GeneratedProgram): GeneratedProgram {
  return {
    ...program,
    modules: program.modules.map((mod) => ({
      ...mod,
      lessons: mod.lessons.map((l) => (l.content || l.error ? l : { ...l, error: CUT_OFF_ERROR })),
    })),
  }
}

export function hasFinishedLessons(program: GeneratedProgram): boolean {
  return program.modules.some((m) => m.lessons.some((l) => l.content))
}
