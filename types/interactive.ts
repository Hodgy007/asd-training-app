import { z } from 'zod'

// ─── Block type union ─────────────────────────────────────────────────────────

export type InteractiveBlockType = 'scenario' | 'drag-drop' | 'hotspot'

export interface InteractiveBlock {
  id: string
  type: InteractiveBlockType
  title: string
  instructions: string
  order: number
  data: ScenarioData | DragDropData | HotspotData
}

// ─── Scenario (branching decision tree) ───────────────────────────────────────

export interface ScenarioChoice {
  id: string
  label: string
  nextNodeId: string
}

export interface ScenarioNode {
  id: string
  text: string
  imageUrl?: string
  choices?: ScenarioChoice[]
  isEnding?: boolean
  endingType?: 'positive' | 'neutral' | 'negative'
  feedback?: string
}

export interface ScenarioData {
  startNodeId: string
  nodes: ScenarioNode[]
}

// ─── Drag-and-drop ────────────────────────────────────────────────────────────

export type DragDropVariant = 'match' | 'categorize' | 'order'

export interface DragItem {
  id: string
  label: string
  imageUrl?: string
}

export interface DragCategory {
  id: string
  label: string
  color?: string
}

export interface DragDropData {
  variant: DragDropVariant
  items: DragItem[]
  categories?: DragCategory[]
  correctOrder?: string[]
  correctMatches?: Record<string, string>
}

// ─── Hotspot / click-to-reveal ────────────────────────────────────────────────

export type HotspotVariant = 'image-hotspot' | 'card-reveal'

export interface Hotspot {
  id: string
  x: number
  y: number
  radius: number
  title: string
  content: string
}

export interface RevealCard {
  id: string
  frontLabel: string
  frontIcon?: string
  backContent: string
  color?: string
}

export interface HotspotData {
  variant: HotspotVariant
  imageUrl?: string
  hotspots?: Hotspot[]
  cards?: RevealCard[]
}

// ─── Interaction progress tracking ────────────────────────────────────────────

export interface BlockInteraction {
  completed: boolean
  attempts: number
}

export type InteractionData = Record<string, BlockInteraction>

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const scenarioChoiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  nextNodeId: z.string().min(1),
})

const scenarioNodeSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  imageUrl: z.string().optional(),
  choices: z.array(scenarioChoiceSchema).optional(),
  isEnding: z.boolean().optional(),
  endingType: z.enum(['positive', 'neutral', 'negative']).optional(),
  feedback: z.string().optional(),
})

const scenarioDataSchema = z.object({
  startNodeId: z.string().min(1),
  nodes: z.array(scenarioNodeSchema).min(1),
})

const dragItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  imageUrl: z.string().optional(),
})

const dragCategorySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  color: z.string().optional(),
})

const dragDropDataSchema = z.object({
  variant: z.enum(['match', 'categorize', 'order']),
  items: z.array(dragItemSchema).min(1),
  categories: z.array(dragCategorySchema).optional(),
  correctOrder: z.array(z.string()).optional(),
  correctMatches: z.record(z.string()).optional(),
})

const hotspotSchema = z.object({
  id: z.string().min(1),
  x: z.number(),
  y: z.number(),
  radius: z.number(),
  title: z.string().min(1),
  content: z.string().min(1),
})

const revealCardSchema = z.object({
  id: z.string().min(1),
  frontLabel: z.string().min(1),
  frontIcon: z.string().optional(),
  backContent: z.string().min(1),
  color: z.string().optional(),
})

const hotspotDataSchema = z.object({
  variant: z.enum(['image-hotspot', 'card-reveal']),
  imageUrl: z.string().optional(),
  hotspots: z.array(hotspotSchema).optional(),
  cards: z.array(revealCardSchema).optional(),
})

export const interactiveBlockSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['scenario', 'drag-drop', 'hotspot']),
  title: z.string().min(1),
  instructions: z.string(),
  order: z.number().int().min(0),
  data: z.union([scenarioDataSchema, dragDropDataSchema, hotspotDataSchema]),
})

export const interactiveBlocksSchema = z.array(interactiveBlockSchema)
