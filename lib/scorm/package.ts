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
  if (relPath.startsWith('/')) return false
  const normalised = relPath.replace(/\\/g, '/')
  return !normalised.split('/').some((seg) => seg === '..' || seg === '')
}

/**
 * Scan the raw zip central-directory for path traversal sequences before
 * handing the buffer to JSZip (which silently normalises `../` paths).
 * ZIP local-file-header signature: 0x04034b50 (little-endian).
 */
function assertNoZipSlip(buf: Buffer): void {
  const LOCAL_SIG = 0x04034b50
  let offset = 0
  while (offset + 30 <= buf.length) {
    const sig = buf.readUInt32LE(offset)
    if (sig !== LOCAL_SIG) break
    const fnLen = buf.readUInt16LE(offset + 26)
    const extraLen = buf.readUInt16LE(offset + 28)
    const name = buf.subarray(offset + 30, offset + 30 + fnLen).toString('utf8')
    if (!isSafePath(name) && name !== '' && !name.endsWith('/')) {
      throw new Error(`Unsafe path in package: ${name}`)
    }
    const compSize = buf.readUInt32LE(offset + 18)
    offset += 30 + fnLen + extraLen + compSize
  }
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

  for (const entry of entries) {
    if (entry.dir) continue
    if (!isSafePath(entry.name)) {
      throw new Error(`Unsafe path in package: ${entry.name}`)
    }
    const body = Buffer.from(await entry.async('nodebuffer'))
    await upload(`${blobPrefix}/${entry.name}`, body, contentTypeFor(entry.name))
  }

  return { blobPrefix, entryPath, version }
}
