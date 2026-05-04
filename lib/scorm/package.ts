import JSZip from 'jszip'
import {
  parseScormManifest,
  type ScormVersion,
  type ScormTocItem,
} from './manifest'

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
  version: ScormVersion
  title?: string
  toc: ScormTocItem[]
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

// Hard caps to defend against malicious / accidentally-large SCORM packages.
// MANAGE_TRAINING (super-admin or specific charity employees) is the gate
// for upload, so the trust level is moderate — but a runaway package could
// OOM the Lambda or burn Blob storage spend, which is what these caps stop.
const MAX_ENTRY_COUNT = 5_000
const MAX_TOTAL_UNCOMPRESSED_BYTES = 1_000_000_000 // 1 GB
const MAX_PER_ENTRY_UNCOMPRESSED_BYTES = 200_000_000 // 200 MB

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
 * Walk the zip Central Directory once and validate:
 *   - entry count is within MAX_ENTRY_COUNT (defends against millions of
 *     tiny entries that would each spend a Blob `put()`)
 *   - every entry's path is safe (zip-slip / encoded traversal)
 *   - the CD-claimed total uncompressed size is within
 *     MAX_TOTAL_UNCOMPRESSED_BYTES (zip-bomb defence)
 *   - no individual entry exceeds MAX_PER_ENTRY_UNCOMPRESSED_BYTES
 *
 * Reads sizes from the ZIP64 extra field when the 32-bit CD slot is the
 * "use ZIP64" sentinel (0xFFFFFFFF). Reads `totalEntries` from the ZIP64
 * EOCD when the EOCD short slot is 0xFFFF (some Articulate Rise exports
 * cross 65 535 entries for fonts/icons).
 *
 * Uses the central directory rather than scanning local headers because
 * data-descriptor flags can hide sizes in the local header.
 */
function assertNoZipSlip(buf: Buffer): void {
  const EOCD_SIG = 0x06054b50
  const CD_SIG = 0x02014b50
  const ZIP64_LOCATOR_SIG = 0x07064b50
  const ZIP64_EOCD_SIG = 0x06064b50

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
  if (eocdOffset + 22 > buf.length) {
    throw new Error('Malformed zip: EOCD record truncated')
  }
  let totalEntries = buf.readUInt16LE(eocdOffset + 10)
  let cdOffset = buf.readUInt32LE(eocdOffset + 16)

  // ZIP64: when the short fields are saturated, look for the ZIP64 EOCD
  // locator immediately before the regular EOCD (always 20 bytes long).
  if (totalEntries === 0xffff || cdOffset === 0xffffffff) {
    const locatorOffset = eocdOffset - 20
    if (locatorOffset < 0 || buf.readUInt32LE(locatorOffset) !== ZIP64_LOCATOR_SIG) {
      throw new Error('Malformed zip: ZIP64 indicators set without ZIP64 locator')
    }
    const zip64EocdOffset = Number(buf.readBigUInt64LE(locatorOffset + 8))
    if (zip64EocdOffset < 0 || zip64EocdOffset + 56 > buf.length) {
      throw new Error('Malformed zip: ZIP64 EOCD out of bounds')
    }
    if (buf.readUInt32LE(zip64EocdOffset) !== ZIP64_EOCD_SIG) {
      throw new Error('Malformed zip: ZIP64 EOCD signature missing')
    }
    totalEntries = Number(buf.readBigUInt64LE(zip64EocdOffset + 32))
    cdOffset = Number(buf.readBigUInt64LE(zip64EocdOffset + 48))
  }

  if (totalEntries > MAX_ENTRY_COUNT) {
    throw new Error(`Package contains too many entries (${totalEntries} > ${MAX_ENTRY_COUNT})`)
  }
  if (cdOffset > buf.length) {
    throw new Error('Malformed zip: Central Directory offset out of bounds')
  }

  // Walk the central directory.
  let pos = cdOffset
  let totalUncompressed = 0
  for (let i = 0; i < totalEntries; i++) {
    if (pos + 46 > buf.length) {
      throw new Error('Malformed zip: Central Directory entry truncated')
    }
    const sig = buf.readUInt32LE(pos)
    if (sig !== CD_SIG) {
      throw new Error(`Malformed zip: Expected CD signature at offset ${pos}`)
    }
    let uncompressed: number = buf.readUInt32LE(pos + 24)
    const fnLen = buf.readUInt16LE(pos + 28)
    const extraLen = buf.readUInt16LE(pos + 30)
    const commentLen = buf.readUInt16LE(pos + 32)

    if (pos + 46 + fnLen > buf.length) {
      throw new Error('Malformed zip: Central Directory filename out of bounds')
    }
    const name = buf.subarray(pos + 46, pos + 46 + fnLen).toString('utf8')

    // ZIP64 per-entry: 0xFFFFFFFF in the size slot means "look in the
    // ZIP64 extra field" (header id 0x0001) for the real 8-byte value.
    if (uncompressed === 0xffffffff) {
      const extraStart = pos + 46 + fnLen
      const extraEnd = extraStart + extraLen
      let cursor = extraStart
      while (cursor + 4 <= extraEnd && cursor + 4 <= buf.length) {
        const headerId = buf.readUInt16LE(cursor)
        const dataSize = buf.readUInt16LE(cursor + 2)
        if (headerId === 0x0001) {
          if (dataSize >= 8 && cursor + 4 + 8 <= buf.length) {
            uncompressed = Number(buf.readBigUInt64LE(cursor + 4))
          }
          break
        }
        cursor += 4 + dataSize
      }
    }

    // Directories end in '/' — skip them; check everything else.
    if (!name.endsWith('/')) {
      if (!isSafePath(name)) {
        throw new Error(`Unsafe path in package: ${name}`)
      }
      if (uncompressed > MAX_PER_ENTRY_UNCOMPRESSED_BYTES) {
        throw new Error(
          `Package entry ${name} exceeds the per-file size cap (${uncompressed} > ${MAX_PER_ENTRY_UNCOMPRESSED_BYTES})`,
        )
      }
      totalUncompressed += uncompressed
      if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED_BYTES) {
        throw new Error(
          `Package decompressed size exceeds the cap (>${MAX_TOTAL_UNCOMPRESSED_BYTES} bytes); refusing to extract`,
        )
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
  const { entryPath, version, title, toc } = parseScormManifest(manifestXml)

  const blobPrefix = `scorm/${lessonId}`
  const entries = Object.values(zip.files)

  // Defence in depth — assertNoZipSlip already capped the CD-claimed
  // total, but the CD is attacker-controlled. Track actual decompressed
  // bytes too and abort mid-extract if a hostile zip lied about its sizes.
  let actualUncompressed = 0

  const uploadTasks: Array<() => Promise<void>> = []
  for (const entry of entries) {
    if (entry.dir) continue
    if (!isSafePath(entry.name)) {
      throw new Error(`Unsafe path in package: ${entry.name}`)
    }
    uploadTasks.push(async () => {
      const body = Buffer.from(await entry.async('nodebuffer'))
      if (body.byteLength > MAX_PER_ENTRY_UNCOMPRESSED_BYTES) {
        throw new Error(
          `Package entry ${entry.name} exceeds the per-file size cap on extract`,
        )
      }
      actualUncompressed += body.byteLength
      if (actualUncompressed > MAX_TOTAL_UNCOMPRESSED_BYTES) {
        throw new Error('Package decompressed size exceeds the cap on extract')
      }
      await upload(`${blobPrefix}/${entry.name}`, body, contentTypeFor(entry.name))
    })
  }

  await uploadAllInParallel(uploadTasks)

  return { blobPrefix, entryPath, version, title, toc }
}
