// Plain-text extraction from a PDF, shared by the training content generator
// and AI prompt context-file uploads. pdf-parse 2 is class-based and holds a
// pdf.js document open, so the parser is always destroyed afterwards.

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  try {
    // pdf-parse 2 marks page breaks with "-- 1 of 3 --" by default; v1 didn't,
    // and the markers would end up in AI prompts and generated lessons.
    const result = await parser.getText({ pageJoiner: '' })
    return result.text
  } finally {
    await parser.destroy()
  }
}
