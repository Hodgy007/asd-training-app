/**
 * Delete orphaned blobs from Vercel Blob storage.
 *
 * Keeps:
 *   - referenced blobs (live DB rows point at them)
 *   - tts/* (TTS cache — regenerates on demand but costs ElevenLabs credits)
 *   - carousel-images/*  (kept for future picker)
 *   - hotspot-images/*   (kept for future picker)
 *   - scorm/<lessonId>/* where the lesson still has scormBlobPrefix
 *
 * Deletes everything else (orphan home-banners, library docs/thumbnails/zips,
 * training-images, dead SCORM packages, etc.).
 *
 * Pass --dry-run to print what would be deleted without touching anything.
 *
 * Run on prod with:
 *   npx dotenv-cli -e .env.production -- npx tsx scripts/blob-cleanup.ts --dry-run
 *   npx dotenv-cli -e .env.production -- npx tsx scripts/blob-cleanup.ts
 */
import { list, del } from '@vercel/blob'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const dryRun = process.argv.includes('--dry-run')

const KEEP_PREFIXES = ['tts/', 'carousel-images/', 'hotspot-images/']

function isUrl(s: unknown): s is string {
  return typeof s === 'string' && /^https?:\/\//.test(s)
}

function walkForUrls(node: unknown, out: Set<string>): void {
  if (node === null || node === undefined) return
  if (typeof node === 'string') { if (isUrl(node)) out.add(node); return }
  if (Array.isArray(node)) { for (const x of node) walkForUrls(x, out); return }
  if (typeof node === 'object') for (const v of Object.values(node as Record<string, unknown>)) walkForUrls(v, out)
}

async function collectReferenced(): Promise<{ urls: Set<string>; scormLessonIds: Set<string> }> {
  const urls = new Set<string>()
  const scormLessonIds = new Set<string>()

  for (const o of await prisma.organisation.findMany({ select: { logoUrl: true } })) if (o.logoUrl) urls.add(o.logoUrl)

  const lessons = await prisma.lesson.findMany({
    select: { id: true, videoUrl: true, interactiveBlocks: true, scormBlobPrefix: true },
  })
  for (const l of lessons) {
    if (l.videoUrl) urls.add(l.videoUrl)
    if (l.interactiveBlocks) walkForUrls(l.interactiveBlocks, urls)
    if (l.scormBlobPrefix) scormLessonIds.add(l.id)
  }
  for (const a of await prisma.lessonAttachment.findMany({ select: { url: true } })) urls.add(a.url)
  for (const c of await prisma.libraryCollection.findMany({ select: { thumbnailUrl: true } })) if (c.thumbnailUrl) urls.add(c.thumbnailUrl)
  for (const d of await prisma.libraryDocument.findMany({ select: { fileUrl: true, thumbnailUrl: true } })) {
    urls.add(d.fileUrl); if (d.thumbnailUrl) urls.add(d.thumbnailUrl)
  }
  for (const j of await prisma.jobOpening.findMany({ select: { employerLogoUrl: true } })) if (j.employerLogoUrl) urls.add(j.employerLogoUrl)
  for (const j of await prisma.jobAttachment.findMany({ select: { url: true } })) urls.add(j.url)
  for (const f of await prisma.aiPromptContextFile.findMany({ select: { blobUrl: true } })) urls.add(f.blobUrl)
  for (const h of await prisma.homePage.findMany({ select: { blocks: true } })) walkForUrls(h.blocks, urls)

  return { urls, scormLessonIds }
}

function shouldKeep(blob: { url: string; pathname: string }, refs: Set<string>, scormLessonIds: Set<string>): boolean {
  if (refs.has(blob.url)) return true
  if (KEEP_PREFIXES.some((p) => blob.pathname.startsWith(p))) return true
  if (blob.pathname.startsWith('scorm/')) {
    const lid = blob.pathname.split('/')[1]
    return scormLessonIds.has(lid)
  }
  return false
}

function fmt(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

async function main() {
  const url = process.env.DATABASE_URL ?? ''
  const host = url.match(/@([^/:]+)/)?.[1] ?? '?'
  const safety = host.includes('blue-thunder') ? 'PROD' : host.includes('lucky-cherry') ? 'DEV' : 'UNKNOWN'
  console.log(`DB: ${host} (${safety})`)
  console.log(`Mode: ${dryRun ? 'DRY-RUN (no deletions)' : 'LIVE DELETE'}`)
  console.log()

  const blobs: { url: string; pathname: string; size: number }[] = []
  let cursor: string | undefined
  do {
    const res = await list({ cursor, limit: 1000, token: process.env.BLOB_READ_WRITE_TOKEN })
    blobs.push(...res.blobs)
    cursor = res.cursor
  } while (cursor)

  const { urls: refs, scormLessonIds } = await collectReferenced()

  const toDelete: { url: string; pathname: string; size: number }[] = []
  const toKeep: { url: string; pathname: string; size: number }[] = []
  for (const b of blobs) (shouldKeep(b, refs, scormLessonIds) ? toKeep : toDelete).push(b)

  const groupBy = (arr: typeof toDelete) => {
    const groups: Record<string, { count: number; size: number }> = {}
    for (const b of arr) {
      const top = b.pathname.split('/')[0] || '(root)'
      const key = b.pathname.startsWith('scorm/') ? 'scorm' : top
      if (!groups[key]) groups[key] = { count: 0, size: 0 }
      groups[key].count++
      groups[key].size += b.size
    }
    return groups
  }

  console.log(`KEEPING ${toKeep.length} blobs (${fmt(toKeep.reduce((a, b) => a + b.size, 0))})`)
  for (const [k, v] of Object.entries(groupBy(toKeep))) console.log(`  ${k.padEnd(20)} ${String(v.count).padStart(5)}  ${fmt(v.size)}`)
  console.log()
  console.log(`${dryRun ? 'WOULD DELETE' : 'DELETING'} ${toDelete.length} blobs (${fmt(toDelete.reduce((a, b) => a + b.size, 0))})`)
  for (const [k, v] of Object.entries(groupBy(toDelete))) console.log(`  ${k.padEnd(20)} ${String(v.count).padStart(5)}  ${fmt(v.size)}`)
  console.log()

  if (dryRun) { console.log('Dry-run complete. Re-run without --dry-run to delete.'); return }

  // del() can take an array (max 1000 per call per the SDK; we batch 100 to be safe)
  const BATCH = 100
  let deleted = 0
  for (let i = 0; i < toDelete.length; i += BATCH) {
    const batch = toDelete.slice(i, i + BATCH).map((b) => b.url)
    await del(batch, { token: process.env.BLOB_READ_WRITE_TOKEN })
    deleted += batch.length
    process.stdout.write(`\r  deleted ${deleted}/${toDelete.length}…`)
  }
  console.log()
  console.log(`Deleted ${deleted} blobs.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
