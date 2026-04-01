import { describe, it, expect } from 'vitest'
import {
  validateUpload,
  MAX_FILE_SIZE,
  ALLOWED_EXTENSIONS,
  BLOCKED_EXTENSIONS,
} from '@/lib/upload-validation'

/**
 * Helper to create a mock File object.
 * jsdom's File constructor works for our purposes.
 */
function createFile(name: string, size: number, type: string): File {
  // Create a blob of the desired size
  const content = new Uint8Array(Math.min(size, 1024)) // Don't actually allocate huge buffers
  const blob = new Blob([content], { type })
  // Override the size via Object.defineProperty since Blob size is read-only
  const file = new File([blob], name, { type })
  if (file.size !== size) {
    Object.defineProperty(file, 'size', { value: size, writable: false })
  }
  return file
}

describe('validateUpload', () => {
  // ── Allowed file types ───────────────────────────────────────────────────────

  describe('allowed file types', () => {
    const allowedCases: Array<{ ext: string; mime: string }> = [
      { ext: 'pdf', mime: 'application/pdf' },
      { ext: 'doc', mime: 'application/msword' },
      { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
      { ext: 'xls', mime: 'application/vnd.ms-excel' },
      { ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      { ext: 'ppt', mime: 'application/vnd.ms-powerpoint' },
      { ext: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
      { ext: 'txt', mime: 'text/plain' },
      { ext: 'csv', mime: 'text/csv' },
      { ext: 'png', mime: 'image/png' },
      { ext: 'jpg', mime: 'image/jpeg' },
      { ext: 'jpeg', mime: 'image/jpeg' },
      { ext: 'gif', mime: 'image/gif' },
      { ext: 'svg', mime: 'image/svg+xml' },
      { ext: 'mp4', mime: 'video/mp4' },
      { ext: 'webm', mime: 'video/webm' },
    ]

    it.each(allowedCases)('accepts .$ext files with correct MIME type', ({ ext, mime }) => {
      const file = createFile(`document.${ext}`, 1024, mime)
      expect(validateUpload(file)).toEqual({ valid: true })
    })

    it('accepts files with application/octet-stream MIME type if extension is allowed', () => {
      const file = createFile('document.pdf', 1024, 'application/octet-stream')
      expect(validateUpload(file)).toEqual({ valid: true })
    })

    it('accepts files with empty MIME type if extension is allowed', () => {
      const file = createFile('document.pdf', 1024, '')
      expect(validateUpload(file)).toEqual({ valid: true })
    })
  })

  // ── Blocked extensions ───────────────────────────────────────────────────────

  describe('blocked extensions', () => {
    const blockedCases = ['exe', 'bat', 'cmd', 'sh', 'ps1', 'vbs', 'js', 'html', 'htm', 'php', 'scr', 'msi', 'dll']

    it.each(blockedCases)('rejects .%s files', (ext) => {
      const file = createFile(`malware.${ext}`, 1024, 'application/octet-stream')
      const result = validateUpload(file)
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/not allowed for security reasons/)
    })
  })

  // ── MIME type mismatch ───────────────────────────────────────────────────────

  describe('MIME type mismatch detection', () => {
    it('rejects a .pdf file with image/png MIME type', () => {
      const file = createFile('report.pdf', 1024, 'image/png')
      const result = validateUpload(file)
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/does not match its MIME type/)
    })

    it('rejects a .jpg file with application/pdf MIME type', () => {
      const file = createFile('photo.jpg', 1024, 'application/pdf')
      const result = validateUpload(file)
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/does not match its MIME type/)
    })

    it('rejects a file with a blocked MIME type', () => {
      const file = createFile('file.pdf', 1024, 'application/x-msdownload')
      const result = validateUpload(file)
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/not allowed for security reasons/)
    })

    it('rejects a file with an unsupported MIME type', () => {
      const file = createFile('file.pdf', 1024, 'application/x-unknown-type')
      const result = validateUpload(file)
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/not supported/)
    })
  })

  // ── File size limits ─────────────────────────────────────────────────────────

  describe('file size limits', () => {
    it('accepts a file exactly at the size limit (50 MB)', () => {
      const file = createFile('large.pdf', MAX_FILE_SIZE, 'application/pdf')
      expect(validateUpload(file)).toEqual({ valid: true })
    })

    it('rejects a file 1 byte over the size limit', () => {
      const file = createFile('huge.pdf', MAX_FILE_SIZE + 1, 'application/pdf')
      const result = validateUpload(file)
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/exceeds the maximum allowed size/)
    })

    it('accepts a zero-byte file (with valid extension and MIME)', () => {
      const file = createFile('empty.pdf', 0, 'application/pdf')
      expect(validateUpload(file)).toEqual({ valid: true })
    })

    it('includes the file size in the error message', () => {
      const size = 60 * 1024 * 1024 // 60 MB
      const file = createFile('huge.pdf', size, 'application/pdf')
      const result = validateUpload(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('60.0 MB')
    })
  })

  // ── Edge cases ───────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('rejects a file with no extension', () => {
      const file = createFile('README', 1024, 'text/plain')
      const result = validateUpload(file)
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/no extension/)
    })

    it('rejects a file that ends with a dot (no extension after it)', () => {
      const file = createFile('file.', 1024, 'text/plain')
      const result = validateUpload(file)
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/no extension/)
    })

    it('uses the last extension for double extensions like .pdf.exe', () => {
      const file = createFile('report.pdf.exe', 1024, 'application/octet-stream')
      const result = validateUpload(file)
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/not allowed for security reasons/)
    })

    it('uses the last extension for .doc.js', () => {
      const file = createFile('document.doc.js', 1024, 'application/octet-stream')
      const result = validateUpload(file)
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/not allowed for security reasons/)
    })

    it('rejects an unsupported but non-blocked extension', () => {
      const file = createFile('archive.zip', 1024, 'application/zip')
      const result = validateUpload(file)
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/not supported/)
    })

    it('handles uppercase extensions by normalizing to lowercase', () => {
      const file = createFile('DOCUMENT.PDF', 1024, 'application/pdf')
      expect(validateUpload(file)).toEqual({ valid: true })
    })

    it('handles mixed case extensions', () => {
      const file = createFile('image.JpG', 1024, 'image/jpeg')
      expect(validateUpload(file)).toEqual({ valid: true })
    })

    it('MAX_FILE_SIZE is 50 MB', () => {
      expect(MAX_FILE_SIZE).toBe(50 * 1024 * 1024)
    })

    it('ALLOWED_EXTENSIONS includes expected document types', () => {
      expect(ALLOWED_EXTENSIONS).toContain('pdf')
      expect(ALLOWED_EXTENSIONS).toContain('docx')
      expect(ALLOWED_EXTENSIONS).toContain('xlsx')
    })

    it('BLOCKED_EXTENSIONS includes dangerous types', () => {
      expect(BLOCKED_EXTENSIONS).toContain('exe')
      expect(BLOCKED_EXTENSIONS).toContain('bat')
      expect(BLOCKED_EXTENSIONS).toContain('sh')
    })
  })
})
