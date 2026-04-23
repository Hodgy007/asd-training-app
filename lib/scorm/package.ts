import JSZip from 'jszip'
import { parseScormManifest } from './manifest'

export type BlobUploader = (
  path: string,
  body: Buffer,
  contentType: string,
) => Promise<void>

export interface ExtractArgs {
  zipBuffer: Buffer
  lessonId: string
  upload: BlobUploader
}

export interface ExtractResult {
  blobPrefix: string
  entryPath: string
  version: '1.2'
}

const CONTENT_TYPES: Record<string, string> = {
  html: 'text/html',
  htm: 'text/html',
  js: 'application/javascript',
  css: 'text/css',
  json: 'application/json',
  xml: 'application/xml',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  webm: 'video/webm',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  pdf: 'application/pdf',
  txt: 'text/plain',
}

function contentTypeFor(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  return CONTENT_TYPES[ext] ?? 'application/octet-stream'
}

function isSafePath(relPath: string): boolean {
  if (!relPath) return false
  if (relPath.includes('\0')) return false
  if (relPath.startsWith('/')) return false
  const normalised = relPath.replace(/\\/g, '/')
  if (normalised.split('/').some((seg) => seg === '..' || seg === '')) return false
  // Also check percent-decoded form to catch encoded traversal (e.g. %2e%2e)
  try {
    const decoded = decodeURIComponent(relPath)
    if (decoded.includes('\0')) return false
    const decodedNorm = decoded.replace(/\\/g, '/')
    if (decodedNorm.split('/').some((seg) => seg === '..' || seg === '')) return false
  } catch {
    // decodeURIComponent threw — malformed percent-encoding is not a safe path
    return false
  }
  return true
}

/**
 * Scan the zip central directory for path traversal sequences before
 * handing the buffer to JSZip (which silently normalises `../` paths).
 *
 * Uses the End of Central Directory (EOCD) record to locate the CD, then
 * iterates every CD file header. This is immune to data-descriptor ambiguity
 * that trips up local-header scanning.
 */
function assertNoZipSlip(buf: Buffer): void {
  const EOCD_SIG = 0x06054b50
  const CD_SIG = 0x02014b50

  // Search for EOCD signature in the last 22 + 65535 bytes of the file.
  const searchStart = Math.max(0, buf.length - 22 - 0xffff)
  let eocdOffset = -1
  for (let i = buf.length - 22; i >= searchStart; i--) {
    if (buf.length - i < 22) continue
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      eocdOffset = i
      break
    }
  }
  if (eocdOffset === -1) {
    throw new Error('Malformed zip: End of Central Directory record not found')
  }

  // Read total entries, CD size, and CD offset from EOCD.
  if (eocdOffset + 22 > buf.length) {
    throw new Error('Malformed zip: EOCD record truncated')
  }
  const totalEntries = buf.readUInt16LE(eocdOffset + 10)
  const cdOffset = buf.readUInt32LE(eocdOffset + 16)

  if (cdOffset > buf.length) {
    throw new Error('Malformed zip: Central Directory offset out of bounds')
  }

  // Walk the central directory.
  let pos = cdOffset
  for (let i = 0; i < totalEntries; i++) {
    if (pos + 46 > buf.length) {
      throw new Error('Malformed zip: Central Directory entry truncated')
    }
    const sig = buf.readUInt32LE(pos)
    if (sig !== CD_SIG) {
      throw new Error(`Malformed zip: Expected CD signature at offset ${pos}`)
    }
    const fnLen = buf.readUInt16LE(pos + 28)
    const extraLen = buf.readUInt16LE(pos + 30)
    const commentLen = buf.readUInt16LE(pos + 32)

    if (pos + 46 + fnLen > buf.length) {
      throw new Error('Malformed zip: Central Directory filename out of bounds')
    }
    const name = buf.subarray(pos + 46, pos + 46 + fnLen).toString('utf8')

    // Directories end in '/' — skip them; check everything else.
    if (!name.endsWith('/')) {
      if (!isSafePath(name)) {
        throw new Error(`Unsafe path in package: ${name}`)
      }
    }

    pos += 46 + fnLen + extraLen + commentLen
  }
}

async function uploadAllInParallel(
  uploads: Array<() => Promise<void>>,
  maxConcurrent = 8,
): Promise<void> {
  const queue = [...uploads]
  const workers = Array.from({ length: Math.min(maxConcurrent, queue.length) }, async () => {
    while (queue.length > 0) {
      const task = queue.shift()
      if (task) await task()
    }
  })
  await Promise.all(workers)
}

export async function extractScormPackage({
  zipBuffer,
  lessonId,
  upload,
}: ExtractArgs): Promise<ExtractResult> {
  // Check raw zip entries for path traversal before JSZip normalises them
  assertNoZipSlip(zipBuffer)

  const zip = await JSZip.loadAsync(zipBuffer)

  const manifestFile = zip.file('imsmanifest.xml')
  if (!manifestFile) {
    throw new Error('Package does not contain imsmanifest.xml at root')
  }

  const manifestXml = await manifestFile.async('string')
  const { entryPath, version } = parseScormManifest(manifestXml)

  const blobPrefix = `scorm/${lessonId}`
  const entries = Object.values(zip.files)

  const uploadTasks: Array<() => Promise<void>> = []
  for (const entry of entries) {
    if (entry.dir) continue
    if (!isSafePath(entry.name)) {
      throw new Error(`Unsafe path in package: ${entry.name}`)
    }
    uploadTasks.push(async () => {
      const body = Buffer.from(await entry.async('nodebuffer'))
      await upload(`${blobPrefix}/${entry.name}`, body, contentTypeFor(entry.name))
    })
  }

  await uploadAllInParallel(uploadTasks)

  return { blobPrefix, entryPath, version }
}
