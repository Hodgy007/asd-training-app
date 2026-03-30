// lib/file-parser.ts
// Server-side file parser for PDF, DOCX, and PPTX files.

import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'
import AdmZip from 'adm-zip'
import { parseStringPromise } from 'xml2js'
import type { ParsedFile, ParsedSection } from './content-generator-types'

// ─── Constants ───────────────────────────────────────────────────────────────

const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.pptx'] as const

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
  const parser = new PDFParse({ data: buffer })
  const result = await parser.getText({ pageJoiner: '\n\n' })
  await parser.destroy()

  const fullText = result.text
  const rawSections = fullText.split(/\n\n+/)

  const sections: ParsedSection[] = []

  for (const raw of rawSections) {
    const trimmed = raw.trim()
    if (!trimmed) continue

    const lines = trimmed.split('\n')
    const firstLine = lines[0].trim()

    if (lines.length === 1) {
      // Single-line block — treat as standalone content (possibly a heading)
      if (isHeadingLine(firstLine)) {
        sections.push({ heading: firstLine, content: '' })
      } else {
        sections.push({ content: firstLine })
      }
    } else {
      if (isHeadingLine(firstLine)) {
        const bodyLines = lines.slice(1).map(l => l.trim()).filter(Boolean)
        sections.push({
          heading: firstLine,
          content: bodyLines.join('\n'),
        })
      } else {
        sections.push({ content: trimmed })
      }
    }
  }

  return sections.filter(s => s.heading || s.content)
}

// ─── DOCX Parsing ────────────────────────────────────────────────────────────

async function parseDocx(buffer: Buffer): Promise<ParsedSection[]> {
  const result = await mammoth.convertToHtml({ buffer })
  const html = result.value

  // Split on heading tags; each heading starts a new section.
  // Regex captures the heading text and everything up to the next heading.
  const headingPattern = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi
  const sections: ParsedSection[] = []

  let lastIndex = 0
  let pendingHeading: string | undefined

  // Collect preamble text before the first heading
  const firstHeadingMatch = headingPattern.exec(html)
  headingPattern.lastIndex = 0 // reset after the probe

  const matches: Array<{ heading: string; index: number; fullMatchLength: number }> = []

  let match: RegExpExecArray | null
  while ((match = headingPattern.exec(html)) !== null) {
    const rawHeading = match[1].replace(/<[^>]+>/g, '').trim()
    matches.push({
      heading: rawHeading,
      index: match.index,
      fullMatchLength: match[0].length,
    })
  }

  if (matches.length === 0) {
    // No headings — treat the entire document as one section
    const text = stripHtml(html)
    if (text) sections.push({ content: text })
    return sections
  }

  // Text before the first heading
  const preamble = stripHtml(html.slice(0, matches[0].index))
  if (preamble) sections.push({ content: preamble })

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]
    const contentStart = current.index + current.fullMatchLength
    const contentEnd = i + 1 < matches.length ? matches[i + 1].index : html.length
    const bodyHtml = html.slice(contentStart, contentEnd)
    const bodyText = stripHtml(bodyHtml)

    sections.push({
      heading: current.heading,
      content: bodyText,
    })
  }

  return sections.filter(s => s.heading || s.content)
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

// ─── PPTX Parsing ────────────────────────────────────────────────────────────

/**
 * Recursively collect all `a:t` text node values from a parsed XML object.
 */
function collectTextNodes(node: unknown): string[] {
  if (typeof node === 'string') return [node]
  if (Array.isArray(node)) return node.flatMap(collectTextNodes)
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>
    const results: string[] = []
    for (const key of Object.keys(obj)) {
      if (key === 'a:t') {
        results.push(...collectTextNodes(obj[key]))
      } else {
        results.push(...collectTextNodes(obj[key]))
      }
    }
    return results
  }
  return []
}

async function parsePptx(buffer: Buffer): Promise<ParsedSection[]> {
  const zip = new AdmZip(buffer)
  const entries = zip.getEntries()

  // Find all slide XML files and sort by slide number
  const slideEntries = entries
    .filter(e => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
    .sort((a, b) => {
      const numA = parseInt(a.entryName.replace(/\D/g, ''), 10)
      const numB = parseInt(b.entryName.replace(/\D/g, ''), 10)
      return numA - numB
    })

  const sections: ParsedSection[] = []

  for (const entry of slideEntries) {
    const xmlContent = entry.getData().toString('utf8')
    let parsed: unknown

    try {
      parsed = await parseStringPromise(xmlContent, { explicitArray: true })
    } catch {
      // Skip malformed slide XML
      continue
    }

    const allTexts = collectTextNodes(parsed)
      .map(t => t.trim())
      .filter(Boolean)

    if (allTexts.length === 0) continue

    const heading = allTexts[0]
    const content = allTexts.slice(1).join('\n')

    sections.push({ heading, content })
  }

  return sections
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Parse a single File object and return a structured ParsedFile.
 */
export async function parseFile(file: File): Promise<ParsedFile> {
  const filename = file.name
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase()

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  if (ext === '.pdf') {
    const sections = await parsePdf(buffer)
    return { filename, format: 'pdf', sections }
  }

  if (ext === '.docx') {
    const sections = await parseDocx(buffer)
    return { filename, format: 'docx', sections }
  }

  if (ext === '.pptx') {
    const sections = await parsePptx(buffer)
    return { filename, format: 'pptx', sections }
  }

  throw new Error(
    `Unsupported file format "${ext}". Supported formats: ${SUPPORTED_EXTENSIONS.join(', ')}`
  )
}

/**
 * Parse multiple File objects in order and return an array of ParsedFile results.
 */
export async function parseFiles(files: File[]): Promise<ParsedFile[]> {
  const results: ParsedFile[] = []
  for (const file of files) {
    results.push(await parseFile(file))
  }
  return results
}

/**
 * Returns the list of supported file extensions.
 */
export function getSupportedExtensions(): string[] {
  return [...SUPPORTED_EXTENSIONS]
}
