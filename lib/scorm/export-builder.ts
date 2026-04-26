/**
 * Build a SCORM 1.2 zip from a Module + its Lessons.
 *
 * Pipeline:
 *   1. For each TEXT/VIDEO lesson, sanitise the prose, find every <img src=…>
 *      and <a href=…pdf|doc|…>, fetch the absolute Blob URLs, rewrite to
 *      relative `assets/…` paths, and bundle them into the SCO folder.
 *   2. Render `lessons/<id>/index.html` per lesson via export-templates.
 *   3. Drop shared CSS + SCORM API JS into `shared/`.
 *   4. Build `imsmanifest.xml` via export-manifest.
 *   5. Zip everything with JSZip and return a Buffer.
 *
 * SCORM-typed lessons (where the lesson IS already a SCORM package) are
 * skipped — the original .zip is in Blob storage and re-shipping it as a
 * lesson inside another package isn't a meaningful operation.
 *
 * Asset fetcher is injected so unit tests can stub it.
 */

import JSZip from 'jszip'
import { buildScorm12Manifest, type ExportLessonItem } from './export-manifest'
import {
  renderLessonHtml,
  renderIndexHtml,
  getSharedCss,
  getSharedScormApiJs,
  type LessonAttachmentForExport,
  type QuizQuestionForExport,
} from './export-templates'

export interface ExportLesson {
  id: string
  title: string
  type: 'TEXT' | 'VIDEO' | 'SCORM'
  content: string
  videoUrl?: string | null
  transcript?: string | null
  interactiveBlocks?: unknown
  attachments: Array<{ id: string; fileName: string; url: string }>
  quizQuestions: Array<{
    id: string
    question: string
    options: string
    correctAnswer: string
    explanation: string
  }>
}

export interface ExportModuleArgs {
  moduleId: string
  moduleTitle: string
  lessons: ExportLesson[]
  /** Optional pass mark (0–100). Defaults to 80. */
  passingScore?: number
  /** Fetches a remote URL and returns its bytes + content-type. Injectable. */
  fetchAsset?: (url: string) => Promise<{ buffer: Buffer; contentType: string }>
  /** Hard cap on bundle size (default 100MB). */
  maxBundleBytes?: number
}

export interface ExportResult {
  zip: Buffer
  /** Lessons that were skipped (e.g. SCORM-typed) and why. */
  skipped: Array<{ lessonId: string; lessonTitle: string; reason: string }>
}

const DEFAULT_MAX = 100 * 1024 * 1024
const ASSET_DIR = 'assets'

const EXT_FROM_CONTENT_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'audio/mpeg': 'mp3',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
}

function extFromUrl(url: string): string | null {
  const cleaned = url.split('?')[0].split('#')[0]
  const m = cleaned.match(/\.([A-Za-z0-9]{2,5})$/)
  return m ? m[1].toLowerCase() : null
}

function safeFilename(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 80)
}

async function defaultFetchAsset(
  url: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch asset (${res.status}): ${url}`)
  }
  const arrayBuffer = await res.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const contentType = res.headers.get('content-type')?.split(';')[0]?.trim() ?? 'application/octet-stream'
  return { buffer, contentType }
}

interface AssetRewriteResult {
  rewrittenHtml: string
  assets: Array<{ relativePath: string; buffer: Buffer; contentType: string }>
  totalBytes: number
}

/**
 * Find absolute http(s) URLs inside `<img src="…">` and `<a href="…">` tags,
 * download each unique URL, write to assets/, and rewrite the HTML to use
 * relative paths. Anything that fails to fetch is left alone — the LMS will
 * see a broken image, but the export still completes.
 */
async function downloadAndRewriteAssets(
  html: string,
  fetcher: (url: string) => Promise<{ buffer: Buffer; contentType: string }>,
  budgetRemaining: number,
): Promise<AssetRewriteResult> {
  const assets: Array<{ relativePath: string; buffer: Buffer; contentType: string }> = []
  const cache = new Map<string, string>() // absolute URL -> relative path
  let used = 0
  let counter = 0

  // Collect unique absolute URLs from src/href attributes
  const urlRegex = /\b(?:src|href)=["'](https?:\/\/[^"']+)["']/gi
  const urls = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = urlRegex.exec(html)) !== null) {
    urls.add(match[1])
  }

  for (const url of urls) {
    if (used >= budgetRemaining) break
    try {
      const { buffer, contentType } = await fetcher(url)
      if (used + buffer.length > budgetRemaining) continue
      counter++
      const ext =
        EXT_FROM_CONTENT_TYPE[contentType] ?? extFromUrl(url) ?? 'bin'
      const relativePath = `${ASSET_DIR}/asset-${counter}.${ext}`
      assets.push({ relativePath, buffer, contentType })
      cache.set(url, relativePath)
      used += buffer.length
    } catch {
      // Best-effort — if a single asset fails, leave the URL alone so the LMS
      // still sees the original (hot-link) version. The caller decides whether
      // to surface partial-export warnings.
    }
  }

  let rewrittenHtml = html
  for (const [absUrl, relPath] of cache.entries()) {
    // Replace every occurrence in src="" and href="" attributes only.
    const escaped = absUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    rewrittenHtml = rewrittenHtml.replace(
      new RegExp(`(src|href)=(["'])${escaped}\\2`, 'gi'),
      `$1=$2${relPath}$2`,
    )
  }

  return { rewrittenHtml, assets, totalBytes: used }
}

export async function buildScormExport(args: ExportModuleArgs): Promise<ExportResult> {
  const {
    moduleId,
    moduleTitle,
    lessons,
    passingScore = 80,
    fetchAsset = defaultFetchAsset,
    maxBundleBytes = DEFAULT_MAX,
  } = args

  const zip = new JSZip()
  const skipped: ExportResult['skipped'] = []
  let totalBytes = 0

  // Shared assets — referenced by every SCO via <dependency>.
  const cssBytes = Buffer.from(getSharedCss(), 'utf8')
  const apiJsBytes = Buffer.from(getSharedScormApiJs(), 'utf8')
  zip.file('shared/style.css', cssBytes)
  zip.file('shared/scorm-api.js', apiJsBytes)
  totalBytes += cssBytes.length + apiJsBytes.length

  const exportableLessons = lessons.filter((l) => {
    if (l.type === 'SCORM') {
      skipped.push({
        lessonId: l.id,
        lessonTitle: l.title,
        reason: 'Lesson is itself a SCORM package — already portable on its own.',
      })
      return false
    }
    return true
  })

  if (exportableLessons.length === 0) {
    throw new Error('Module has no exportable lessons (TEXT or VIDEO).')
  }

  const manifestLessons: ExportLessonItem[] = []

  for (const lesson of exportableLessons) {
    const lessonDir = `lessons/${lesson.id}`
    const lessonHref = `${lessonDir}/index.html`

    const filesForManifest: string[] = [lessonHref]

    // Download any embedded images / linked files in the prose, rewriting
    // the HTML to reference the local asset/ paths.
    const budget = Math.max(0, maxBundleBytes - totalBytes)
    const { rewrittenHtml, assets, totalBytes: assetBytes } =
      await downloadAndRewriteAssets(lesson.content ?? '', fetchAsset, budget)
    totalBytes += assetBytes
    for (const a of assets) {
      const path = `${lessonDir}/${a.relativePath}`
      zip.file(path, a.buffer)
      filesForManifest.push(path.slice(`${lessonDir}/`.length))
    }

    // Lesson attachments — bundled separately from prose-embedded images so
    // they appear in the "Resources" section regardless of whether the prose
    // mentions them. Their fileName is preserved (made path-safe).
    const attachmentExports: LessonAttachmentForExport[] = []
    for (const att of lesson.attachments) {
      if (totalBytes >= maxBundleBytes) break
      try {
        const { buffer } = await fetchAsset(att.url)
        if (totalBytes + buffer.length > maxBundleBytes) continue
        const relativePath = `${ASSET_DIR}/${safeFilename(att.fileName)}`
        const path = `${lessonDir}/${relativePath}`
        zip.file(path, buffer)
        attachmentExports.push({ fileName: att.fileName, relativePath })
        filesForManifest.push(relativePath)
        totalBytes += buffer.length
      } catch {
        // Skip individual attachments that fail to fetch — best-effort.
      }
    }

    // Convert quiz questions into the runtime shape — options come in as a
    // JSON string from Prisma; parse defensively.
    const quizQuestions: QuizQuestionForExport[] = lesson.quizQuestions.map((q) => {
      let options: string[] = []
      try {
        const parsed = JSON.parse(q.options)
        if (Array.isArray(parsed)) options = parsed.map((o) => String(o))
      } catch {
        // leave as []
      }
      return {
        id: q.id,
        question: q.question,
        options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      }
    })

    const hadStrippedInteractiveBlocks =
      Array.isArray(lesson.interactiveBlocks) && lesson.interactiveBlocks.length > 0

    const html = renderLessonHtml({
      moduleTitle,
      lessonTitle: lesson.title,
      contentHtml: rewrittenHtml,
      videoUrl: lesson.videoUrl,
      transcript: lesson.transcript,
      attachments: attachmentExports,
      quizQuestions,
      passingScore,
      hadStrippedInteractiveBlocks,
    })

    const htmlBuf = Buffer.from(html, 'utf8')
    zip.file(lessonHref, htmlBuf)
    totalBytes += htmlBuf.length

    manifestLessons.push({
      id: lesson.id,
      title: lesson.title,
      href: lessonHref,
      files: filesForManifest,
      masteryScore: quizQuestions.length > 0 ? passingScore : undefined,
    })
  }

  // Top-level index.html — not strictly required by SCORM, but a useful
  // fallback if the LMS just launches the package root.
  const indexHtml = renderIndexHtml(
    moduleTitle,
    manifestLessons.map((l) => ({ title: l.title, href: l.href })),
  )
  zip.file('index.html', Buffer.from(indexHtml, 'utf8'))

  const manifestXml = buildScorm12Manifest({
    moduleId,
    moduleTitle,
    sharedFiles: ['shared/style.css', 'shared/scorm-api.js'],
    lessons: manifestLessons,
  })
  zip.file('imsmanifest.xml', Buffer.from(manifestXml, 'utf8'))

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  return { zip: zipBuffer, skipped }
}
