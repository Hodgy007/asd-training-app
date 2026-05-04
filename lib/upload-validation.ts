/**
 * Upload validation utilities for file uploads.
 * Validates file size, extension, and MIME type before sending to Vercel Blob.
 */

/** Maximum file size in bytes (50 MB) */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** Allowed file extensions (lowercase, without dot) */
export const ALLOWED_EXTENSIONS = [
  // Documents
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv',
  // Images
  'png', 'jpg', 'jpeg', 'gif',
  // Video
  'mp4', 'webm',
] as const

/**
 * Blocked/dangerous file extensions (lowercase, without dot).
 *
 * SVG is here despite being an image format because SVG files can carry
 * inline <script> tags, foreignObject HTML, and event handlers — opening
 * a saved SVG in a browser executes it in the storage origin. If you need
 * SVG support for admin uploads, sanitise through sanitize-html before
 * storing rather than allowing them through the user-facing upload path.
 */
export const BLOCKED_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'sh', 'ps1', 'vbs', 'js', 'html', 'htm', 'php', 'scr', 'msi', 'dll', 'svg',
] as const

/**
 * Extensions where `application/octet-stream` is acceptable (genuinely
 * binary formats). Text-y formats fall through to the strict MIME check
 * so a malicious `.csv` claiming octet-stream can't slip past sniffing.
 */
const OCTET_STREAM_OK_EXTENSIONS: ReadonlySet<string> = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'png', 'jpg', 'jpeg', 'gif',
  'mp4', 'webm',
])

/** Map of allowed MIME types to their corresponding extensions */
const ALLOWED_MIME_TYPES: Record<string, readonly string[]> = {
  // Documents
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'application/vnd.ms-powerpoint': ['ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
  'text/plain': ['txt', 'csv'],
  'text/csv': ['csv'],
  // Images
  'image/png': ['png'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/gif': ['gif'],
  // Video
  'video/mp4': ['mp4'],
  'video/webm': ['webm'],
  // Common alternative MIME types browsers may send.
  // Octet-stream is checked against OCTET_STREAM_OK_EXTENSIONS — text
  // files or scriptable formats can't slip through with this MIME.
  'application/octet-stream': [],
}

/** Blocked MIME types that should never be accepted */
const BLOCKED_MIME_TYPES = [
  'application/x-msdownload',       // exe, dll
  'application/x-msdos-program',    // exe
  'application/x-batch',            // bat
  'application/x-sh',               // sh
  'application/x-shellscript',      // sh
  'application/x-powershell',       // ps1
  'application/x-vbs',              // vbs
  'text/javascript',                // js
  'application/javascript',         // js
  'text/html',                      // html, htm
  'application/x-httpd-php',        // php
  'application/x-msi',              // msi
  'application/x-ms-installer',     // msi
]

function getExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  if (lastDot === -1 || lastDot === fileName.length - 1) return ''
  return fileName.slice(lastDot + 1).toLowerCase()
}

export interface UploadValidationResult {
  valid: boolean
  error?: string
}

export interface UploadValidationOptions {
  /** Skip the global 50 MB size check. Use when the caller enforces its own size limit (e.g. video uploads at 500 MB). */
  skipSizeCheck?: boolean
}

/**
 * Validates a file upload for size, extension, and MIME type.
 * Should be called BEFORE uploading to Vercel Blob.
 */
export function validateUpload(file: File, options: UploadValidationOptions = {}): UploadValidationResult {
  // 1. Check file size (skipped for video uploads — caller enforces 500 MB client-side)
  if (!options.skipSizeCheck && file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    return {
      valid: false,
      error: `File size (${sizeMB} MB) exceeds the maximum allowed size of 50 MB.`,
    }
  }

  // 2. Check file extension
  const ext = getExtension(file.name)
  if (!ext) {
    return {
      valid: false,
      error: 'File has no extension. Please upload a file with a valid extension.',
    }
  }

  if ((BLOCKED_EXTENSIONS as readonly string[]).includes(ext)) {
    return {
      valid: false,
      error: `File type ".${ext}" is not allowed for security reasons.`,
    }
  }

  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
    return {
      valid: false,
      error: `File type ".${ext}" is not supported. Allowed types: ${ALLOWED_EXTENSIONS.map(e => `.${e}`).join(', ')}.`,
    }
  }

  // 3. Check MIME type
  const mimeType = file.type.toLowerCase()

  if (BLOCKED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `File MIME type "${mimeType}" is not allowed for security reasons.`,
    }
  }

  // application/octet-stream is the browser's "I don't know" MIME. Only
  // accept it when the extension is on a hand-picked list of genuine
  // binary formats — text-y formats (txt, csv) must come with the right
  // text/* MIME so a malicious `.csv` claiming octet-stream doesn't dodge
  // the strict MIME-vs-extension cross-check below.
  if (mimeType === 'application/octet-stream') {
    if (!OCTET_STREAM_OK_EXTENSIONS.has(ext)) {
      return {
        valid: false,
        error: `File extension ".${ext}" requires a specific MIME type, not application/octet-stream.`,
      }
    }
  } else if (mimeType) {
    const allowedExtsForMime = ALLOWED_MIME_TYPES[mimeType]
    if (!allowedExtsForMime) {
      return {
        valid: false,
        error: `File MIME type "${mimeType}" is not supported.`,
      }
    }

    // Verify the extension matches the MIME type (prevents renaming .exe to .pdf)
    if (allowedExtsForMime.length > 0 && !allowedExtsForMime.includes(ext)) {
      return {
        valid: false,
        error: `File extension ".${ext}" does not match its MIME type "${mimeType}".`,
      }
    }
  }

  return { valid: true }
}
