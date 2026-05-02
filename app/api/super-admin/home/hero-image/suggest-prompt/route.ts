import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { runPrompt, AI_FEATURE_UNAVAILABLE } from '@/lib/ai-runner'

const FALLBACK_BRIEF =
  'A warm, welcoming homepage banner for the Ambitious about Autism platform.'

/**
 * Suggest a starting image prompt for a homepage banner. The caller passes
 * what little context the editor has (target role, block type, any text the
 * admin has already typed into the block) and the AI replies with a
 * descriptive, single-paragraph prompt the admin can edit before generating.
 *
 * Returns `{ prompt: '' }` on AI failure so the modal can still open with
 * an editable textarea (graceful degradation).
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = (await req.json().catch(() => ({}))) as {
    role?: string
    blockKind?: string
    blockTitle?: string
    blockSubtitle?: string
  }

  // Build a short, structured "brief" string from whatever the editor sent.
  // The AiPrompt row's `inputVariables` is `['brief']`, so this string is
  // what the AI sees as the context for its suggestion.
  const parts: string[] = []
  if (body.role && typeof body.role === 'string') {
    parts.push(`Audience: ${body.role}`)
  }
  if (body.blockKind && typeof body.blockKind === 'string') {
    parts.push(`Block type: ${body.blockKind}`)
  }
  if (body.blockTitle && typeof body.blockTitle === 'string' && body.blockTitle.trim()) {
    parts.push(`Title: "${body.blockTitle.trim().slice(0, 200)}"`)
  }
  if (body.blockSubtitle && typeof body.blockSubtitle === 'string' && body.blockSubtitle.trim()) {
    parts.push(`Subtitle: "${body.blockSubtitle.trim().slice(0, 300)}"`)
  }
  const brief = parts.length > 0 ? parts.join('. ') + '.' : FALLBACK_BRIEF

  const result = await runPrompt('homepage.heroImage.suggestPrompt', { brief })
  const prompt = result === AI_FEATURE_UNAVAILABLE ? '' : result.trim()

  return NextResponse.json({ prompt })
}
