// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { extractPdfText } from '../pdf-text'

// A one-page PDF drawing "Hello from a PDF" in Helvetica. Offsets in the xref
// table are computed so pdf.js reads it without repairing anything.
function minimalPdf(text: string): Buffer {
  const stream = `BT /F1 24 Tf 72 720 Td (${text}) Tj ET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let body = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((obj, i) => {
    offsets.push(body.length)
    body += `${i + 1} 0 obj\n${obj}\nendobj\n`
  })
  const xrefAt = body.length
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) body += `${String(off).padStart(10, '0')} 00000 n \n`
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`
  return Buffer.from(body, 'latin1')
}

describe('extractPdfText', () => {
  it('returns the text on the page', async () => {
    const text = await extractPdfText(minimalPdf('Hello from a PDF'))
    expect(text).toContain('Hello from a PDF')
  })

  it('rejects something that is not a PDF', async () => {
    await expect(extractPdfText(Buffer.from('not a pdf'))).rejects.toThrow()
  })
})
