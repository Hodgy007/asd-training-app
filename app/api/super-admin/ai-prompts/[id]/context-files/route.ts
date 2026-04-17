import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { put } from '@vercel/blob'

const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_FILES_PER_PROMPT = 3

async function parseToText(buffer: Buffer, mimeType: string, fileName: string): Promise<string> {
  const ext = fileName.toLowerCase().split('.').pop() ?? ''

  if (mimeType === 'application/pdf' || ext === 'pdf') {
    const pdfParseModule = await import('pdf-parse')
    const pdfParse = (pdfParseModule as unknown as { default: (b: Buffer) => Promise<{ text: string }> }).default
      ?? (pdfParseModule as unknown as (b: Buffer) => Promise<{ text: string }>)
    const parsed = await pdfParse(buffer)
    return parsed.text
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === 'docx'
  ) {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  return buffer.toString('utf-8')
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_AI_PROMPTS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const prompt = await prisma.aiPrompt.findUnique({
    where: { id: params.id },
    include: { _count: { select: { contextFiles: true } } },
  })
  if (!prompt) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (prompt._count.contextFiles >= MAX_FILES_PER_PROMPT) {
    return NextResponse.json(
      { error: `Maximum ${MAX_FILES_PER_PROMPT} files per prompt.` },
      { status: 400 },
    )
  }

  const formData = await req.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'File exceeds 5 MB limit' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  let parsedText: string
  try {
    parsedText = await parseToText(buffer, file.type, file.name)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Failed to parse file: ${msg}` }, { status: 400 })
  }

  const blob = await put(
    `ai-prompts/context/${prompt.id}/${Date.now()}-${file.name}`,
    buffer,
    { access: 'public', addRandomSuffix: true, contentType: file.type || 'application/octet-stream' },
  )

  const row = await prisma.aiPromptContextFile.create({
    data: {
      promptId: prompt.id,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      blobUrl: blob.url,
      parsedText,
      uploadedBy: session.user.id,
    },
    select: {
      id: true,
      fileName: true,
      fileSize: true,
      mimeType: true,
      parsedText: true,
      uploadedAt: true,
    },
  })

  return NextResponse.json(row)
}
