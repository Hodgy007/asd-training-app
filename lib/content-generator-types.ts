// lib/content-generator-types.ts

import type { InteractiveBlock } from '@/types/interactive'
import type { CourseBrief } from '@/lib/training-gen/schemas'

// ─── File Parsing Types ─────────────────────────────────────────────────────

export interface ParsedSection {
  heading?: string
  content: string
  images?: string[] // Vercel Blob URLs of images found in this section
}

export interface ParsedFile {
  filename: string
  format: 'pdf' | 'docx' | 'pptx'
  sections: ParsedSection[]
}

// ─── Generation Lens ───────────────────────────────────────────────────────

export type GenerationLens = 'autism' | 'practitioner'

// ─── Outline Types ──────────────────────────────────────────────────────────

export interface SourceRef {
  fileIndex: number
  sectionIndices: number[]
}

export interface OutlineLesson {
  title: string
  summary: string
  objectiveIds: string[]
  sourceRefs: SourceRef[]
}

export interface OutlineModule {
  title: string
  description: string
  lessons: OutlineLesson[]
}

export interface GeneratedOutline {
  programName: string
  modules: OutlineModule[]
}

// ─── Generated Content Types ────────────────────────────────────────────────

export interface GeneratedQuizQuestion {
  question: string
  options: string[]
  correctAnswer: string
  explanation: string
  /** Set when the automatic quiz check could not clear this question. */
  needsReview?: string
}

export interface GeneratedLesson {
  title: string
  content: string
  order: number
  quizQuestions: GeneratedQuizQuestion[]
  interactiveBlocks: InteractiveBlock[]
  sourceRefs: SourceRef[]
  /** From the outline; a retry needs them to rewrite this lesson in context. */
  summary?: string
  objectiveIds?: string[]
  error?: string
}

export interface GeneratedModule {
  title: string
  description: string
  order: number
  lessons: GeneratedLesson[]
}

export interface GeneratedProgram {
  programName: string
  brief: CourseBrief
  modules: GeneratedModule[]
}

// ─── SSE Event Types ────────────────────────────────────────────────────────

export type SSEEvent =
  | { type: 'progress'; lesson: number; total: number; phase: 'content' | 'quiz' }
  | { type: 'lesson-complete'; moduleIndex: number; lessonIndex: number; content: string; interactiveBlocks: InteractiveBlock[] }
  | { type: 'quiz-complete'; moduleIndex: number; lessonIndex: number; questions: GeneratedQuizQuestion[] }
  | { type: 'lesson-error'; moduleIndex: number; lessonIndex: number; error: string }
  | { type: 'complete'; program: GeneratedProgram }
  | { type: 'error'; error: string }
