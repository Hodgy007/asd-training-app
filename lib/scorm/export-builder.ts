/**
 * Build a SCORM 1.2 zip from a Module + its Lessons.
 *
 * Pipeline (per lesson):
 *   1. Parse `lesson.interactiveBlocks` and split the prose at every
 *      `[INTERACTIVE:blockId]` marker into prose and block segments.
 *   2. Collect every absolute http(s) URL referenced — both in prose
 *      (img src / pdf href) and inside interactive blocks (hotspot images,
 *      carousel slides, scenario nodes, drag-drop items, video URLs).
 *   3. Download each unique URL once, write it to `lessons/<id>/assets/`,
 *      and build a `Map<absoluteUrl, relativePath>`.
 *   4. Re-stitch the body: each prose segment is sanitised + rewritten
 *      against the asset map; each block is rendered to static HTML by
 *      `renderInteractiveBlockHtml`, also against the asset map.
 *   5. Render the lesson page via `renderLessonHtml` (using the
 *      `prerenderedBodyHtml` slot so block data-attrs survive).
 *   6. Drop shared CSS, the SCORM 1.2 API JS, and the interactive-blocks
 *      JS into `shared/`. Build `imsmanifest.xml`. Zip it all.
 *
 * SCORM-typed lessons (where the lesson IS already a SCORM package) are
 * skipped — the original .zip is in Blob storage and re-shipping it as a
 * lesson inside another package isn't a meaningful operation.
 *
 * Asset fetcher is injected so unit tests can stub it.
 */

import JSZip from 'jszip'
import { sanitizeHtml } from '@/lib/sanitize'
import { validateInteractiveBlocks } from '@/lib/interactive-blocks'
import type { InteractiveBlock } from '@/types/interactive'
import { buildScorm12Manifest, type ExportLessonItem } from './export-manifest'
import {
  renderLessonHtml,
  renderIndexHtml,
  getSharedCss,
  getSharedScormApiJs,
  getSharedBlocksJs,
  type LessonAttachmentForExport,
  type QuizQuestionForExport,
  type SurveyForExport,
} from './export-templates'
import {
  extractInteractiveBlockUrls,
  renderInteractiveBlockHtml,
  type BlockAudioMap,
} from './export-blocks'
import {
  buildBlockTtsText,
  buildCarouselSlideTtsText,
  extractLessonProseTtsText,
} from '@/lib/tts-extract'
import { ttsHash, DEFAULT_VOICE_ID } from '@/lib/tts-blob'

/**
 * Resolve a TTS phrase to MP3 bytes. The export route wires this to a function
 * that hits the Blob cache (via `getCachedTtsUrl`) and falls back to
 * generating + caching via ElevenLabs when an API key is present. Tests inject
 * their own resolver — `null` means "no audio for this phrase".
 */
export type TtsResolver = (text: string) => Promise<Buffer | null>

export interface ExportLesson {
  id: string
  title: string
  type: 'TEXT' | 'VIDEO' | 'SCORM' | 'SURVEY'
  content: string
  videoUrl?: string | null
  transcript?: string | null
  interactiveBlocks?: unknown
  attachments: Array<{ id: string; fileName: string; url: string }>
  survey?: SurveyForExport | null
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
  /**
   * Optional TTS resolver — given a narration phrase, return MP3 bytes (or
   * null if not available). The export route wires this to the same Blob
   * cache + ElevenLabs flow used by `/api/tts`. When omitted, audio is
   * skipped entirely.
   */
  resolveTts?: TtsResolver
  /** Hard cap on bundle size (default 100MB). */
  maxBundleBytes?: number
}

export interface ExportResult {
  zip: Buffer
  /** Lessons that were skipped (e.g. SCORM-typed packages or malformed survey lessons) and why. */
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

/** Pull http(s) URLs from `src=` and `href=` attributes in a chunk of HTML. */
function extractUrlsFromHtml(html: string): Set<string> {
  const out = new Set<string>()
  const re = /\b(?:src|href)=["'](https?:\/\/[^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) out.add(m[1])
  return out
}

/** Replace every absolute URL in `src=`/`href=` attrs with its mapped relative path. */
function rewriteUrlsInHtml(html: string, urlToPath: Map<string, string>): string {
  let out = html
  for (const [absUrl, relPath] of urlToPath.entries()) {
    const escaped = absUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    out = out.replace(
      new RegExp(`(src|href)=(["'])${escaped}\\2`, 'gi'),
      `$1=$2${relPath}$2`,
    )
  }
  return out
}

interface DownloadedAsset {
  absoluteUrl: string
  relativePath: string
  buffer: Buffer
  contentType: string
}

/**
 * Download a deduplicated list of URLs into `assets/` paths under the lesson
 * directory. Honours a per-call byte budget — once exceeded, remaining URLs
 * are skipped (their HTML/block references are left as the original URL).
 */
async function downloadAssetPool(
  urls: string[],
  fetcher: (url: string) => Promise<{ buffer: Buffer; contentType: string }>,
  budgetBytes: number,
): Promise<{ assets: DownloadedAsset[]; urlToPath: Map<string, string>; bytesUsed: number }> {
  const assets: DownloadedAsset[] = []
  const urlToPath = new Map<string, string>()
  let used = 0
  let counter = 0

  for (const absoluteUrl of urls) {
    if (used >= budgetBytes) break
    try {
      const { buffer, contentType } = await fetcher(absoluteUrl)
      if (used + buffer.length > budgetBytes) continue
      counter++
      const ext =
        EXT_FROM_CONTENT_TYPE[contentType] ?? extFromUrl(absoluteUrl) ?? 'bin'
      const relativePath = `${ASSET_DIR}/asset-${counter}.${ext}`
      assets.push({ absoluteUrl, relativePath, buffer, contentType })
      urlToPath.set(absoluteUrl, relativePath)
      used += buffer.length
    } catch {
      // Best-effort. Leaving URL un-rewritten means the LMS will see the
      // original (hot-link) reference.
    }
  }

  return { assets, urlToPath, bytesUsed: used }
}

interface LessonRenderResult {
  bodyHtml: string
  /** Path (relative to lesson dir) of the whole-prose narration MP3, if any. */
  proseAudioPath: string | null
  assets: DownloadedAsset[]
  /** MP3 buffers keyed by their lesson-dir-relative path. */
  audioFiles: Array<{ relativePath: string; buffer: Buffer }>
  attachments: LessonAttachmentForExport[]
  bytesUsed: number
}

/**
 * Build the per-lesson body HTML and pool of assets. Splits prose at
 * `[INTERACTIVE:…]` markers, downloads every referenced URL, then re-stitches
 * with rendered block HTML.
 */
async function renderLessonBodyAndAssets(
  lesson: ExportLesson,
  fetcher: (url: string) => Promise<{ buffer: Buffer; contentType: string }>,
  resolveTts: TtsResolver | undefined,
  budgetBytes: number,
): Promise<LessonRenderResult> {
  // 1. Parse interactive blocks (or treat as none if invalid/missing).
  const blocks: InteractiveBlock[] =
    validateInteractiveBlocks(lesson.interactiveBlocks) ?? []
  const blockById = new Map(blocks.map((b) => [b.id, b]))

  // 2. Split prose at block markers — even if blocks is empty this returns
  //    [{ type: 'html', content }] so the rest of the flow is uniform.
  //    Inline import of splitContentAtBlocks at call site to keep test stubs
  //    minimal — re-export under the existing alias.
  const { splitContentAtBlocks } = await import('@/lib/interactive-blocks')
  const segments = splitContentAtBlocks(lesson.content ?? '', blocks)

  // 3. Collect every absolute URL referenced.
  const allUrls = new Set<string>()
  for (const seg of segments) {
    if (seg.type === 'html') {
      for (const u of extractUrlsFromHtml(seg.content)) allUrls.add(u)
    }
  }
  for (const block of blocks) {
    for (const u of extractInteractiveBlockUrls(block)) allUrls.add(u)
  }

  // 4. Download into a single pool keyed by absolute URL.
  const { assets, urlToPath, bytesUsed: poolBytes } = await downloadAssetPool(
    Array.from(allUrls),
    fetcher,
    budgetBytes,
  )

  // 5. Lesson attachments — bundled separately under their original filename
  //    so they appear in the "Resources" section regardless of whether the
  //    prose mentions them. Each gets its own attachments-only download.
  const attachments: LessonAttachmentForExport[] = []
  let attachmentBytes = 0
  for (const att of lesson.attachments) {
    if (poolBytes + attachmentBytes >= budgetBytes) break
    try {
      const { buffer } = await fetcher(att.url)
      if (poolBytes + attachmentBytes + buffer.length > budgetBytes) continue
      const relativePath = `${ASSET_DIR}/${safeFilename(att.fileName)}`
      assets.push({
        absoluteUrl: att.url,
        relativePath,
        buffer,
        contentType: 'application/octet-stream',
      })
      attachments.push({ fileName: att.fileName, relativePath })
      attachmentBytes += buffer.length
    } catch {
      // skip
    }
  }

  // 6. Resolve TTS audio. Use the same hashing scheme as the live app so the
  //    Blob cache hits for any phrase already prewarmed during lesson save.
  //    Per-lesson dedupe — one MP3 per unique narration string.
  const audioFiles: Array<{ relativePath: string; buffer: Buffer }> = []
  const audioByText = new Map<string, string>() // phrase -> relative MP3 path
  const blockAudio: BlockAudioMap = new Map()
  let audioBytes = 0

  async function resolveAudioPath(text: string): Promise<string | null> {
    if (!resolveTts || !text || !text.trim()) return null
    const cached = audioByText.get(text)
    if (cached !== undefined) return cached || null
    if (poolBytes + attachmentBytes + audioBytes >= budgetBytes) return null
    let mp3: Buffer | null = null
    try {
      mp3 = await resolveTts(text)
    } catch {
      mp3 = null
    }
    if (!mp3 || mp3.length === 0) {
      audioByText.set(text, '') // negative cache
      return null
    }
    if (poolBytes + attachmentBytes + audioBytes + mp3.length > budgetBytes) {
      return null
    }
    const hash = ttsHash(text, DEFAULT_VOICE_ID)
    const relativePath = `audio/${hash}.mp3`
    audioFiles.push({ relativePath, buffer: mp3 })
    audioByText.set(text, relativePath)
    audioBytes += mp3.length
    return relativePath
  }

  // 6a. Whole-prose narration (matches the bottom-of-page player on the live app).
  const proseText = extractLessonProseTtsText(lesson.content ?? '', blocks)
  const proseAudioPath = await resolveAudioPath(proseText)

  // 6b. Per-block narration. Carousels skip block-level audio because each
  //     slide has its own — same pattern as the learner UI.
  for (const block of blocks) {
    if (block.type === 'carousel') {
      const slides = (block.data as { slides?: Array<{ id: string; title: string; imageUrl: string; body: string }> }).slides ?? []
      for (let i = 0; i < slides.length; i++) {
        const text = buildCarouselSlideTtsText(slides[i])
        const path = await resolveAudioPath(text)
        if (path) blockAudio.set(`slide-${block.id}-${i}`, path)
      }
    } else {
      const text = buildBlockTtsText(block)
      const path = await resolveAudioPath(text)
      if (path) blockAudio.set(`block-${block.id}`, path)
    }
  }

  // 7. Re-stitch the body. Prose is sanitised, block HTML is trusted (the
  //    builder is its source). Both pass through URL rewriting.
  const parts: string[] = []
  for (const seg of segments) {
    if (seg.type === 'html') {
      const sanitised = sanitizeHtml(seg.content)
      parts.push(rewriteUrlsInHtml(sanitised, urlToPath))
    } else {
      const block = blockById.get(seg.blockId)
      if (block) parts.push(renderInteractiveBlockHtml(block, urlToPath, blockAudio))
    }
  }

  return {
    bodyHtml: parts.join('\n'),
    proseAudioPath,
    assets,
    audioFiles,
    attachments,
    bytesUsed: poolBytes + attachmentBytes + audioBytes,
  }
}

export async function buildScormExport(args: ExportModuleArgs): Promise<ExportResult> {
  const {
    moduleId,
    moduleTitle,
    lessons,
    passingScore = 80,
    fetchAsset = defaultFetchAsset,
    resolveTts,
    maxBundleBytes = DEFAULT_MAX,
  } = args

  const zip = new JSZip()
  const skipped: ExportResult['skipped'] = []
  let totalBytes = 0

  // Shared assets — referenced by every SCO via <dependency>.
  const cssBytes = Buffer.from(getSharedCss(), 'utf8')
  const apiJsBytes = Buffer.from(getSharedScormApiJs(), 'utf8')
  const blocksJsBytes = Buffer.from(getSharedBlocksJs(), 'utf8')
  zip.file('shared/style.css', cssBytes)
  zip.file('shared/scorm-api.js', apiJsBytes)
  zip.file('shared/scorm-blocks.js', blocksJsBytes)
  totalBytes += cssBytes.length + apiJsBytes.length + blocksJsBytes.length

  const exportableLessons = lessons.filter((l) => {
    if (l.type === 'SCORM') {
      skipped.push({
        lessonId: l.id,
        lessonTitle: l.title,
        reason: 'Lesson is itself a SCORM package — already portable on its own.',
      })
      return false
    }
    if (l.type === 'SURVEY' && !l.survey) {
      skipped.push({
        lessonId: l.id,
        lessonTitle: l.title,
        reason: 'Survey lesson has no linked survey to package.',
      })
      return false
    }
    return true
  })

  if (exportableLessons.length === 0) {
    throw new Error('Module has no exportable lessons (TEXT, VIDEO, or linked SURVEY).')
  }

  const manifestLessons: ExportLessonItem[] = []

  for (const lesson of exportableLessons) {
    const lessonDir = `lessons/${lesson.id}`
    const lessonHref = `${lessonDir}/index.html`

    const filesForManifest: string[] = [lessonHref]

    const budget = Math.max(0, maxBundleBytes - totalBytes)
    const {
      bodyHtml,
      proseAudioPath,
      assets,
      audioFiles,
      attachments,
      bytesUsed,
    } = lesson.type === 'SURVEY'
      ? {
          bodyHtml: '',
          proseAudioPath: null,
          assets: [],
          audioFiles: [],
          attachments: [],
          bytesUsed: 0,
        }
      : await renderLessonBodyAndAssets(lesson, fetchAsset, resolveTts, budget)
    totalBytes += bytesUsed

    for (const a of assets) {
      const path = `${lessonDir}/${a.relativePath}`
      zip.file(path, a.buffer)
      filesForManifest.push(a.relativePath)
    }
    for (const a of audioFiles) {
      const path = `${lessonDir}/${a.relativePath}`
      zip.file(path, a.buffer)
      filesForManifest.push(a.relativePath)
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

    const html = renderLessonHtml({
      moduleTitle,
      lessonTitle: lesson.title,
      contentHtml: '', // ignored when prerenderedBodyHtml is set
      prerenderedBodyHtml: bodyHtml,
      lessonAudioPath: proseAudioPath ?? undefined,
      videoUrl: lesson.videoUrl,
      transcript: lesson.transcript,
      attachments,
      survey: lesson.type === 'SURVEY' ? lesson.survey ?? null : null,
      quizQuestions,
      passingScore,
      hadStrippedInteractiveBlocks: false,
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
    sharedFiles: ['shared/style.css', 'shared/scorm-api.js', 'shared/scorm-blocks.js'],
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
