import { z } from 'zod'
import { sanitizeHtml } from './sanitize'

/**
 * Homepages are keyed by Role, and there is now exactly one leaf role — so this
 * is effectively "the default homepage" that every logged-in learner sees.
 * Per-organisation overrides layer on top of it separately.
 */
export const EDITABLE_HOMEPAGE_ROLES = ['LEARNER'] as const

export type EditableHomepageRole = (typeof EDITABLE_HOMEPAGE_ROLES)[number]

export function isEditableHomepageRole(role: string): role is EditableHomepageRole {
  return (EDITABLE_HOMEPAGE_ROLES as readonly string[]).includes(role)
}

const heroBlockSchema = z.object({
  id: z.string().min(1),
  kind: z.literal('hero'),
  title: z.string().max(200).default(''),
  subtitle: z.string().max(500).default(''),
  imageUrl: z.string().url().or(z.literal('')).default(''),
  ctaLabel: z.string().max(60).default(''),
  ctaHref: z.string().max(2000).default(''),
})

const tileSchema = z.object({
  id: z.string().min(1),
  title: z.string().max(120).default(''),
  description: z.string().max(400).default(''),
  iconKey: z.string().max(60).default(''),
  imageUrl: z.string().url().or(z.literal('')).default(''),
  href: z.string().max(2000).default(''),
})

const tilesBlockSchema = z.object({
  id: z.string().min(1),
  kind: z.literal('tiles'),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
  tiles: z.array(tileSchema).max(24).default([]),
})

const richTextBlockSchema = z.object({
  id: z.string().min(1),
  kind: z.literal('richText'),
  html: z.string().transform((raw) => sanitizeHtml(raw)),
})

const imageBlockSchema = z.object({
  id: z.string().min(1),
  kind: z.literal('image'),
  src: z.string().url().or(z.literal('')).default(''),
  alt: z.string().max(300).default(''),
  href: z.string().max(2000).default(''),
})

const videoBlockSchema = z.object({
  id: z.string().min(1),
  kind: z.literal('video'),
  src: z.string().url().or(z.literal('')).default(''),
  poster: z.string().url().or(z.literal('')).default(''),
})

export const homeBlockSchema = z.discriminatedUnion('kind', [
  heroBlockSchema,
  tilesBlockSchema,
  richTextBlockSchema,
  imageBlockSchema,
  videoBlockSchema,
])

export const homeBlocksSchema = z.array(homeBlockSchema).max(40)

export type HomeBlock = z.infer<typeof homeBlockSchema>
export type HeroBlock = z.infer<typeof heroBlockSchema>
export type TilesBlock = z.infer<typeof tilesBlockSchema>
export type Tile = z.infer<typeof tileSchema>
export type RichTextBlock = z.infer<typeof richTextBlockSchema>
export type ImageBlock = z.infer<typeof imageBlockSchema>
export type VideoBlock = z.infer<typeof videoBlockSchema>

export function newBlockId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `b_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`
}
