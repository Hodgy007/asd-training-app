/**
 * Read-only audit of Vercel Blob storage vs DB references.
 *
 * Diffs every blob in the store against every URL the database references,
 * then prints three lists:
 *   1. Orphaned blobs — in the store, no DB reference (candidates for cleanup)
 *   2. Broken refs    — DB column points to a URL that no longer exists in blob
 *   3. Cache pool     — TTS files (intentional content-addressed cache)
 *   4. SCORM lookup   — files under scorm/<lessonId>/ where the lessonId is gone
 *
 * Nothing is deleted. Run against prod with:
 *   npx dotenv-cli -e .env.production -- npx tsx scripts/blob-orphan-scan.ts
 */
import { list } from '@vercel/blob'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface Blob {
  url: string
  pathname: string
  size: number
  uploadedAt: Date
}

function isUrl(s: unknown): s is string {
  return typeof s === 'string' && /^https?:\/\//.test(s)
}

function walkForUrls(node: unknown, out: Set<string>): void {
  if (node === null || node === undefined) return
  if (typeof node === 'string') {
    if (isUrl(node)) out.add(node)
    return
  }
  if (Array.isArray(node)) {
    for (const x of node) walkForUrls(x, out)
    return
  }
  if (typeof node === 'object') {
    for (const v of Object.values(node as Record<string, unknown>)) walkForUrls(v, out)
  }
}

async function listAllBlobs(): Promise<Blob[]> {
  const blobs: Blob[] = []
  let cursor: string | undefined
  do {
    const res = await list({ cursor, limit: 1000, token: process.env.BLOB_READ_WRITE_TOKEN })
    blobs.push(...res.blobs)
    cursor = res.cursor
  } while (cursor)
  return blobs
}

async function collectReferencedUrls(): Promise<{ urls: Set<string>; scormLessonIds: Set<string> }> {
  const urls = new Set<string>()
  const scormLessonIds = new Set<string>()

  const orgs = await prisma.organisation.findMany({ select: { logoUrl: true } })
  for (const o of orgs) if (o.logoUrl) urls.add(o.logoUrl)

  const lessons = await prisma.lesson.findMany({
    select: { id: true, videoUrl: true, interactiveBlocks: true, scormBlobPrefix: true },
  })
  for (const l of lessons) {
    if (l.videoUrl) urls.add(l.videoUrl)
    if (l.interactiveBlocks) walkForUrls(l.interactiveBlocks, urls)
    if (l.scormBlobPrefix) scormLessonIds.add(l.id)
  }

  const lessonAtt = await prisma.lessonAttachment.findMany({ select: { url: true } })
  for (const a of lessonAtt) if (a.url) urls.add(a.url)

  const collections = await prisma.libraryCollection.findMany({ select: { thumbnailUrl: true } })
  for (const c of collections) if (c.thumbnailUrl) urls.add(c.thumbnailUrl)

  const docs = await prisma.libraryDocument.findMany({ select: { fileUrl: true, thumbnailUrl: true } })
  for (const d of docs) {
    if (d.fileUrl) urls.add(d.fileUrl)
    if (d.thumbnailUrl) urls.add(d.thumbnailUrl)
  }

  const jobs = await prisma.jobOpening.findMany({ select: { employerLogoUrl: true } })
  for (const j of jobs) if (j.employerLogoUrl) urls.add(j.employerLogoUrl)

  const jobAtt = await prisma.jobAttachment.findMany({ select: { url: true } })
  for (const j of jobAtt) if (j.url) urls.add(j.url)

  const promptFiles = await prisma.aiPromptContextFile.findMany({ select: { blobUrl: true } })
  for (const f of promptFiles) if (f.blobUrl) urls.add(f.blobUrl)

  // HomePage.blocks may contain banner image URLs from the AI banner feature
  const homepages = await prisma.homePage.findMany({ select: { blocks: true } })
  for (const h of homepages) walkForUrls(h.blocks, urls)

  return { urls, scormLessonIds }
}

function classifyBlob(blob: Blob, referenced: Set<string>, scormLessonIds: Set<string>): string {
  if (referenced.has(blob.url)) return 'referenced'
  if (blob.pathname.startsWith('tts/')) return 'tts-cache'
  if (blob.pathname.startsWith('scorm/')) {
    // scorm/<lessonId>/...  — keep if lesson still has scormBlobPrefix
    const parts = blob.pathname.split('/')
    if (parts.length >= 2 && scormLessonIds.has(parts[1])) return 'scorm-active'
    return 'scorm-orphan'
  }
  return 'orphan'
}

function fmtBytes(n: number): string {
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
  console.log(`Token prefix: ${process.env.BLOB_READ_WRITE_TOKEN?.slice(0, 24) ?? '(missing)'}…`)
  console.log()

  console.log('Listing blobs…')
  const blobs = await listAllBlobs()
  console.log(`  ${blobs.length} blobs found, total ${fmtBytes(blobs.reduce((a, b) => a + b.size, 0))}`)
  console.log()

  console.log('Collecting DB references…')
  const { urls: referenced, scormLessonIds } = await collectReferencedUrls()
  console.log(`  ${referenced.size} URLs referenced from DB; ${scormLessonIds.size} SCORM lessons`)
  console.log()

  // Classify each blob
  const buckets: Record<string, Blob[]> = {
    referenced: [],
    'tts-cache': [],
    'scorm-active': [],
    'scorm-orphan': [],
    orphan: [],
  }
  for (const b of blobs) buckets[classifyBlob(b, referenced, scormLessonIds)].push(b)

  // Find broken refs (in DB, not in blob)
  const blobUrls = new Set(blobs.map((b) => b.url))
  const broken = [...referenced].filter((u) => !blobUrls.has(u))

  console.log('=== SUMMARY ===')
  for (const [cat, list] of Object.entries(buckets)) {
    const size = list.reduce((a, b) => a + b.size, 0)
    console.log(`  ${cat.padEnd(14)}  ${String(list.length).padStart(5)}  ${fmtBytes(size)}`)
  }
  console.log(`  broken-refs     ${String(broken.length).padStart(5)}  (DB row points at a missing blob)`)
  console.log()

  if (buckets.orphan.length > 0) {
    console.log(`=== ORPHANED BLOBS (${buckets.orphan.length}) — no DB reference ===`)
    for (const b of buckets.orphan) {
      console.log(`  ${b.uploadedAt.toISOString().slice(0, 10)}  ${fmtBytes(b.size).padStart(10)}  ${b.pathname}`)
    }
    console.log()
  }

  if (buckets['scorm-orphan'].length > 0) {
    console.log(`=== ORPHAN SCORM ASSETS (${buckets['scorm-orphan'].length}) — lesson deleted or no longer SCORM ===`)
    // Group by lessonId to keep output short
    const byLesson: Record<string, { count: number; size: number }> = {}
    for (const b of buckets['scorm-orphan']) {
      const lid = b.pathname.split('/')[1] ?? '?'
      if (!byLesson[lid]) byLesson[lid] = { count: 0, size: 0 }
      byLesson[lid].count++
      byLesson[lid].size += b.size
    }
    for (const [lid, s] of Object.entries(byLesson)) {
      console.log(`  scorm/${lid}/  →  ${s.count} files, ${fmtBytes(s.size)}`)
    }
    console.log()
  }

  if (broken.length > 0) {
    console.log(`=== BROKEN REFS (${broken.length}) — DB points at missing blob ===`)
    for (const u of broken) console.log(`  ${u}`)
    console.log()
  }

  console.log('Done. Nothing was deleted.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
