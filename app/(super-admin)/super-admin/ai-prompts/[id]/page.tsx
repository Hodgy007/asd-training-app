import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { AiPromptEditor } from '@/components/super-admin/ai-prompt-editor'
import { AI_MODELS } from '@/lib/ai-models'

export default async function AiPromptEditorPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (!hasPermission(session, CHARITY_PERMISSIONS.MANAGE_AI_PROMPTS)) redirect('/super-admin')

  const prompt = await prisma.aiPrompt.findUnique({
    where: { id: params.id },
    include: {
      contextFiles: {
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          parsedText: true,
          uploadedAt: true,
        },
        orderBy: { uploadedAt: 'asc' },
      },
      updatedByUser: { select: { name: true, email: true } },
    },
  })
  if (!prompt) notFound()

  const plainPrompt = {
    id: prompt.id,
    key: prompt.key,
    name: prompt.name,
    purpose: prompt.purpose,
    category: prompt.category,
    tone: prompt.tone,
    requirements: prompt.requirements,
    exampleOutput: prompt.exampleOutput,
    inputVariables: prompt.inputVariables,
    responseFormat: prompt.responseFormat,
    model: prompt.model,
    enabled: prompt.enabled,
    contextFiles: prompt.contextFiles.map((f) => ({
      id: f.id,
      fileName: f.fileName,
      fileSize: f.fileSize,
      mimeType: f.mimeType,
      parsedText: f.parsedText,
      uploadedAt: f.uploadedAt.toISOString(),
    })),
    updatedByUser: prompt.updatedByUser,
    updatedAt: prompt.updatedAt.toISOString(),
  }

  return <AiPromptEditor prompt={plainPrompt} models={AI_MODELS} />
}
