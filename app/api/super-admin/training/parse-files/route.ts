import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { parseFiles, getSupportedExtensions } from '@/lib/file-parser'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_TRAINING)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const fileEntries = formData.getAll('files')
  if (!fileEntries || fileEntries.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 })
  }

  const supportedExtensions = getSupportedExtensions()
  const files: File[] = []

  for (const entry of fileEntries) {
    if (!(entry instanceof File)) {
      return NextResponse.json({ error: 'Invalid file entry in form data' }, { status: 400 })
    }
    const filename = entry.name
    const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase()
    if (!supportedExtensions.includes(ext)) {
      return NextResponse.json(
        { error: `Unsupported file format "${ext}". Supported formats: ${supportedExtensions.join(', ')}` },
        { status: 400 }
      )
    }
    files.push(entry)
  }

  try {
    const parsedFiles = await parseFiles(files)
    return NextResponse.json({ files: parsedFiles })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to parse files'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
