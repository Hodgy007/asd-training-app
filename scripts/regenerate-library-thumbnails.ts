/**
 * Regenerate missing AI thumbnails for Library collections and documents.
 *
 * Why this exists: library thumbnails live under `library/thumbnails/` on Vercel
 * Blob, which is NOT in blob-cleanup.ts's KEEP_PREFIXES. They survive a cleanup
 * run only by exact URL match against the DB. Any drift between the stored
 * `thumbnailUrl` and the blob listing and they get deleted, leaving rows pointing
 * at 404s.
 *
 * DEFAULTS TO DRY-RUN. Unlike blob-cleanup.ts (which opts into --dry-run), this
 * script opts into doing the work, because each image is a paid AI Gateway image
 * generation and a write to production Blob storage. Pass --apply to run for real.
 *
 * Regenerated images are NEW images. The originals are gone; these will match the
 * house style but will not be pixel-identical to what was there before.
 *
 * Usage:
 *   npx dotenv-cli -e .env.production -- npx tsx scripts/regenerate-library-thumbnails.ts
 *   npx dotenv-cli -e .env.production -- npx tsx scripts/regenerate-library-thumbnails.ts --apply
 *
 * Flags:
 *   --apply             Actually generate and save. Without it, reports only.
 *   --limit N           Process at most N items (use for a costed test run first).
 *   --collections-only  Skip documents.
 *   --documents-only    Skip collections.
 *   --force             Regenerate even where the existing thumbnail still loads.
 *                       Careful: this bills for every row, not just broken ones.
 */
import { generateText, experimental_generateImage as generateImage } from 'ai'
import { put } from '@vercel/blob'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const IMAGE_MODEL = 'google/gemini-3.1-flash-image-preview'
const IMAGEN_FALLBACK = 'google/imagen-4.0-generate-001'

const apply = process.argv.includes('--apply')
const force = process.argv.includes('--force')
const collectionsOnly = process.argv.includes('--collections-only')
const documentsOnly = process.argv.includes('--documents-only')

const limitArg = process.argv.indexOf('--limit')
const limit = limitArg !== -1 ? Number(process.argv[limitArg + 1]) : Infinity
if (Number.isNaN(limit)) {
  console.error('--limit needs a number')
  process.exit(1)
}

/** Delay between generations so we do not trip gateway rate limits. */
const THROTTLE_MS = 1200

type Target = {
  kind: 'collection' | 'document'
  id: string
  title: string
  description: string | null
  thumbnailUrl: string | null
}

/**
 * A thumbnail counts as broken when the column is null, or when the URL no
 * longer resolves. HEAD is enough — we only care whether the blob still exists.
 */
async function isThumbnailBroken(url: string | null): Promise<boolean> {
  if (!url) return true
  try {
    const res = await fetch(url, { method: 'HEAD' })
    return !res.ok
  } catch {
    return true
  }
}

function buildPrompt(target: Target): string {
  const subject = (target.description?.trim() || target.title).slice(0, 600)

  // Kept deliberately in step with app/api/super-admin/library/generate/route.ts
  // and generate-collection/route.ts so regenerated art matches what the admin UI
  // produces. Note: the UI additionally prepends a brand-store preamble when the
  // charity Brand Store is enabled for the collection — this script does not, so
  // expect a subtle style difference from brand-store-generated images.
  if (target.kind === 'collection') {
    return `Create a simple, friendly, colourful illustration that represents the following Library collection:\n\n${subject}\n\nUse a clean, modern flat illustration style with bright welcoming colours. No text in the image. Professional but approachable. Suitable as a tile cover for a young-person-friendly resource library.`
  }
  return `Create a simple, friendly, colourful illustration that represents the following training resource:\n\n${subject}\n\nUse a clean, modern flat illustration style with bright welcoming colours. No text in the image. Professional but approachable.`
}

async function uploadPng(buffer: Buffer, mimeType: string): Promise<string> {
  const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png'
  const blob = await put(`library/thumbnails/ai-generated-${Date.now()}.${ext}`, buffer, {
    access: 'public',
    addRandomSuffix: true,
    contentType: mimeType,
  })
  return blob.url
}

/**
 * Mirrors the route's two-stage strategy: multimodal Gemini first, Imagen 4 as
 * fallback. Returns null when both fail so the caller can carry on to the next row.
 */
async function generateThumbnail(prompt: string): Promise<string | null> {
  try {
    const result = await generateText({ model: IMAGE_MODEL, prompt, maxRetries: 2 })
    const imageFiles = (result.files ?? []).filter((f) => f.mediaType?.startsWith('image/'))
    if (imageFiles.length > 0) {
      const imgFile = imageFiles[0]
      const mimeType = imgFile.mediaType ?? 'image/png'
      return await uploadPng(Buffer.from(imgFile.base64 ?? '', 'base64'), mimeType)
    }
  } catch {
    // fall through to Imagen
  }

  try {
    const { images } = await generateImage({ model: IMAGEN_FALLBACK, prompt, n: 1 })
    const generated = images[0]
    if (generated?.base64) {
      const mimeType = generated.mediaType ?? 'image/png'
      return await uploadPng(Buffer.from(generated.base64, 'base64'), mimeType)
    }
  } catch {
    // both paths failed
  }

  return null
}

async function collectTargets(): Promise<Target[]> {
  const targets: Target[] = []

  if (!documentsOnly) {
    const collections = await prisma.libraryCollection.findMany({
      select: { id: true, title: true, description: true, thumbnailUrl: true },
    })
    for (const c of collections) {
      targets.push({ kind: 'collection', ...c })
    }
  }

  if (!collectionsOnly) {
    const documents = await prisma.libraryDocument.findMany({
      select: { id: true, title: true, description: true, thumbnailUrl: true },
    })
    for (const d of documents) {
      targets.push({ kind: 'document', ...d })
    }
  }

  return targets
}

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? ''
  const host = dbUrl.match(/@([^/:]+)/)?.[1] ?? '?'
  const safety = host.includes('blue-thunder') ? 'PROD' : host.includes('lucky-cherry') ? 'DEV' : 'UNKNOWN'

  console.log(`DB:   ${host} (${safety})`)
  console.log(`Mode: ${apply ? 'APPLY — will generate images and bill for them' : 'DRY-RUN (no generation, no writes)'}`)
  if (force) console.log('      --force: regenerating even where the current thumbnail still loads')
  console.log()

  const all = await collectTargets()
  console.log(`Found ${all.length} library rows. Checking which thumbnails are broken…`)

  const broken: Target[] = []
  for (const t of all) {
    if (force || (await isThumbnailBroken(t.thumbnailUrl))) broken.push(t)
  }

  const nullCount = broken.filter((t) => !t.thumbnailUrl).length
  const deadCount = broken.length - nullCount

  console.log()
  console.log(`  ${String(broken.length).padStart(4)} need regeneration`)
  console.log(`  ${String(nullCount).padStart(4)}   no thumbnailUrl set`)
  console.log(`  ${String(deadCount).padStart(4)}   thumbnailUrl set but the blob is gone`)
  console.log(`  ${String(all.length - broken.length).padStart(4)} are fine`)
  console.log()

  const queue = broken.slice(0, limit === Infinity ? broken.length : limit)
  if (queue.length < broken.length) {
    console.log(`--limit ${limit}: processing the first ${queue.length} of ${broken.length}.`)
    console.log()
  }

  if (!apply) {
    for (const t of queue.slice(0, 20)) {
      console.log(`  [${t.kind}] ${t.title}${t.thumbnailUrl ? ' (dead URL)' : ' (null)'}`)
    }
    if (queue.length > 20) console.log(`  … and ${queue.length - 20} more`)
    console.log()
    console.log(`Dry-run complete. ${queue.length} image generations would be billed.`)
    console.log('Re-run with --apply to generate. Consider --limit 3 first to check the style.')
    return
  }

  let ok = 0
  let failed = 0

  for (const [i, t] of queue.entries()) {
    process.stdout.write(`  [${i + 1}/${queue.length}] ${t.kind} "${t.title}" … `)

    const url = await generateThumbnail(buildPrompt(t))
    if (!url) {
      console.log('FAILED (both models)')
      failed++
      continue
    }

    // Write straight away so an interrupted run keeps everything done so far.
    if (t.kind === 'collection') {
      await prisma.libraryCollection.update({ where: { id: t.id }, data: { thumbnailUrl: url } })
    } else {
      await prisma.libraryDocument.update({ where: { id: t.id }, data: { thumbnailUrl: url } })
    }

    console.log('done')
    ok++

    if (i < queue.length - 1) await new Promise((r) => setTimeout(r, THROTTLE_MS))
  }

  console.log()
  console.log(`Regenerated ${ok}. Failed ${failed}.`)
  if (failed > 0) console.log('Re-run to retry the failures — succeeded rows are skipped automatically.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
