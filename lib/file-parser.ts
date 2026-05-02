// lib/file-parser.ts
// Server-side file parser for PDF, DOCX, and PPTX files.

import AdmZip from 'adm-zip'
import { parseStringPromise } from 'xml2js'
import type { ParsedFile, ParsedSection } from './content-generator-types'

// ─── Constants ───────────────────────────────────────────────────────────────

const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.pptx'] as const

// Web-safe image extensions we'll upload to Blob; EMF/WMF can't render in browsers
const WEB_IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'])

// ─── Blob Upload Helper ───────────────────────────────────────────────────────

async function uploadImageToBlob(buf: Buffer, ext: string): Promise<string | null> {
  if (!WEB_IMAGE_EXTS.has(ext)) return null
  try {
    const { put } = await import('@vercel/blob')
    const contentType = ext === 'jpg' || ext === 'jpeg'
      ? 'image/jpeg'
      : ext === 'svg'
      ? 'image/svg+xml'
      : `image/${ext}`
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    const { url } = await put(`training-images/${unique}.${ext}`, buf, {
      access: 'public',
      contentType,
    })
    return url
  } catch {
    return null
  }
}

// ─── PDF Parsing ─────────────────────────────────────────────────────────────

/**
 * Returns true when a line looks like a heading:
 *   – short line (≤ 80 chars) that is ALL CAPS, or
 *   – any line that ends with a colon
 */
function isHeadingLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false
  if (trimmed.endsWith(':')) return true
  if (trimmed.length <= 80 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) return true
  return false
}

async function parsePdf(buffer: Buffer): Promise<ParsedSection[]> {
  const pdfParseModule = await import('pdf-parse')
  const pdfParse = (pdfParseModule as unknown as { default: (b: Buffer) => Promise<{ text: string }> }).default
    ?? (pdfParseModule as unknown as (b: Buffer) => Promise<{ text: string }>)
  const result = await pdfParse(buffer)

  const fullText = result.text
  const rawSections = fullText.split(/\n\n+/)

  const sections: ParsedSection[] = []

  for (const raw of rawSections) {
    const trimmed = raw.trim()
    if (!trimmed) continue

    const lines = trimmed.split('\n')
    const firstLine = lines[0].trim()

    if (lines.length === 1) {
      if (isHeadingLine(firstLine)) {
        sections.push({ heading: firstLine, content: '' })
      } else {
        sections.push({ content: firstLine })
      }
    } else {
      if (isHeadingLine(firstLine)) {
        const bodyLines = lines.slice(1).map(l => l.trim()).filter(Boolean)
        sections.push({ heading: firstLine, content: bodyLines.join('\n') })
      } else {
        sections.push({ content: trimmed })
      }
    }
  }

  return sections.filter(s => s.heading || s.content)
}

// ─── DOCX Parsing ────────────────────────────────────────────────────────────

/** Extract img src URLs from an HTML chunk, returning clean HTML with img tags removed. */
function extractImgsFromHtml(html: string): { html: string; images: string[] } {
  const images: string[] = []
  const cleaned = html.replace(/<img[^>]+src="([^"]+)"[^>]*\/?>/gi, (_, src: string) => {
    if (src.startsWith('http')) images.push(src)
    return ''
  })
  return { html: cleaned, images }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

async function parseDocx(buffer: Buffer, includeImages: boolean): Promise<ParsedSection[]> {
  const mammoth = await import('mammoth')

  let html: string

  if (includeImages) {
    // mammoth's TS types omit convertImage from Input but it is a valid runtime option
    const opts = {
      buffer,
      convertImage: mammoth.images.imgElement(
        async (image: { read: () => Promise<Buffer>; contentType?: string }) => {
          try {
            const buf = await image.read()
            const mime = image.contentType ?? 'image/png'
            const ext = mime.split('/')[1]?.split('+')[0]?.toLowerCase() ?? 'png'
            const url = await uploadImageToBlob(buf, ext)
            if (!url) return { src: '', alt: '' }
            return { src: url, alt: '' }
          } catch {
            return { src: '', alt: '' }
          }
        }
      ),
    } as Parameters<typeof mammoth.convertToHtml>[0]
    const result = await mammoth.convertToHtml(opts)
    html = result.value
  } else {
    const result = await mammoth.convertToHtml({ buffer })
    html = result.value
  }

  const headingPattern = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi
  const sections: ParsedSection[] = []
  const matches: Array<{ heading: string; index: number; fullMatchLength: number }> = []

  let match: RegExpExecArray | null
  while ((match = headingPattern.exec(html)) !== null) {
    const rawHeading = match[1].replace(/<[^>]+>/g, '').trim()
    matches.push({ heading: rawHeading, index: match.index, fullMatchLength: match[0].length })
  }

  if (matches.length === 0) {
    const { html: cleanHtml, images } = extractImgsFromHtml(html)
    const text = stripHtml(cleanHtml)
    if (text) sections.push({ content: text, ...(images.length ? { images } : {}) })
    return sections
  }

  // Preamble before first heading
  const preambleHtml = html.slice(0, matches[0].index)
  const { html: cleanPreamble, images: preambleImgs } = extractImgsFromHtml(preambleHtml)
  const preambleText = stripHtml(cleanPreamble)
  if (preambleText) sections.push({ content: preambleText, ...(preambleImgs.length ? { images: preambleImgs } : {}) })

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]
    const contentStart = current.index + current.fullMatchLength
    const contentEnd = i + 1 < matches.length ? matches[i + 1].index : html.length
    const bodyHtml = html.slice(contentStart, contentEnd)
    const { html: cleanBody, images } = extractImgsFromHtml(bodyHtml)
    const bodyText = stripHtml(cleanBody)
    sections.push({
      heading: current.heading,
      content: bodyText,
      ...(images.length ? { images } : {}),
    })
  }

  return sections.filter(s => s.heading || s.content)
}

// ─── PPTX Parsing ────────────────────────────────────────────────────────────

function collectTextNodes(node: unknown): string[] {
  if (typeof node === 'string') return [node]
  if (Array.isArray(node)) return node.flatMap(collectTextNodes)
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>
    const results: string[] = []
    for (const key of Object.keys(obj)) {
      if (key === 'a:t') {
        const vals = Array.isArray(obj[key]) ? obj[key] : [obj[key]]
        for (const v of vals as unknown[]) {
          if (typeof v === 'string') results.push(v)
          else if (v && typeof v === 'object' && '_' in v) results.push(String((v as Record<string, unknown>)._))
        }
      } else {
        results.push(...collectTextNodes(obj[key]))
      }
    }
    return results
  }
  return []
}

async function parsePptx(buffer: Buffer, includeImages: boolean): Promise<ParsedSection[]> {
  const zip = new AdmZip(buffer)
  const entries = zip.getEntries()

  const slideEntries = entries
    .filter(e => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
    .sort((a, b) => {
      const numA = parseInt(a.entryName.replace(/\D/g, ''), 10)
      const numB = parseInt(b.entryName.replace(/\D/g, ''), 10)
      return numA - numB
    })

  const sections: ParsedSection[] = []
  // Deduplicate media uploads across slides: mediaPath → blobUrl
  const uploadedMedia = new Map<string, string>()

  for (const entry of slideEntries) {
    const xmlContent = entry.getData().toString('utf8')
    let parsed: unknown

    try {
      parsed = await parseStringPromise(xmlContent, { explicitArray: true })
    } catch {
      continue
    }

    const allTexts = collectTextNodes(parsed).map(t => t.trim()).filter(Boolean)
    if (allTexts.length === 0) continue

    const heading = allTexts[0]
    const content = allTexts.slice(1).join('\n')
    const slideImages: string[] = []

    if (includeImages) {
      const slideNum = parseInt(entry.entryName.replace(/\D/g, ''), 10)
      const relsPath = `ppt/slides/_rels/slide${slideNum}.xml.rels`
      const relsEntry = zip.getEntry(relsPath)

      if (relsEntry) {
        try {
          const relsData = await parseStringPromise(relsEntry.getData().toString('utf8'), { explicitArray: true })
          const rels = (relsData?.Relationships?.Relationship ?? []) as Array<{ $?: { Type?: string; Target?: string } }>

          for (const rel of rels) {
            const type = rel.$?.Type ?? ''
            const target = rel.$?.Target ?? ''
            if (!type.endsWith('/image')) continue

            const filename = target.split('/').pop() ?? ''
            const ext = filename.split('.').pop()?.toLowerCase() ?? ''
            if (!WEB_IMAGE_EXTS.has(ext)) continue

            const mediaPath = `ppt/media/${filename}`

            if (uploadedMedia.has(mediaPath)) {
              slideImages.push(uploadedMedia.get(mediaPath)!)
              continue
            }

            const mediaEntry = zip.getEntry(mediaPath)
            if (!mediaEntry) continue

            const url = await uploadImageToBlob(mediaEntry.getData(), ext)
            if (url) {
              uploadedMedia.set(mediaPath, url)
              slideImages.push(url)
            }
          }
        } catch {
          // Skip on rels parse error
        }
      }
    }

    sections.push({ heading, content, ...(slideImages.length ? { images: slideImages } : {}) })
  }

  return sections
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface ParseOptions {
  includeImages?: boolean
}

export async function parseFile(file: File, options: ParseOptions = {}): Promise<ParsedFile> {
  const filename = file.name
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase()
  const includeImages = options.includeImages ?? false

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  if (ext === '.pdf') {
    const sections = await parsePdf(buffer)
    return { filename, format: 'pdf', sections }
  }

  if (ext === '.docx') {
    const sections = await parseDocx(buffer, includeImages)
    return { filename, format: 'docx', sections }
  }

  if (ext === '.pptx') {
    const sections = await parsePptx(buffer, includeImages)
    return { filename, format: 'pptx', sections }
  }

  throw new Error(
    `Unsupported file format "${ext}". Supported formats: ${SUPPORTED_EXTENSIONS.join(', ')}`
  )
}

export async function parseFiles(files: File[], options: ParseOptions = {}): Promise<ParsedFile[]> {
  const results: ParsedFile[] = []
  for (const file of files) {
    results.push(await parseFile(file, options))
  }
  return results
}

export function getSupportedExtensions(): string[] {
  return [...SUPPORTED_EXTENSIONS]
}
