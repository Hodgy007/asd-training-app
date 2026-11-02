import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { generatePlan } from '@/lib/training-gen/plan'
import { checkTrainingPlanLimits } from '@/lib/training-gen/limits'
import { isAiUnavailable } from '@/lib/ai-runner'
import type { ParsedFile } from '@/lib/content-generator-types'

export const maxDuration = 300

// Brief + outline for the generator's Plan step. Lessons are written later by
// generate-content, once the admin has reviewed and edited this.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_TRAINING)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!process.env.AI_GATEWAY_API_KEY) {
    return NextResponse.json({ error: 'AI_GATEWAY_API_KEY is not configured' }, { status: 500 })
  }

  const limited = await checkTrainingPlanLimits(session.user.id)
  if (limited) return limited

  let body: { parsedContent?: ParsedFile[]; programName?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { parsedContent, programName } = body
  if (!parsedContent || !Array.isArray(parsedContent) || parsedContent.length === 0) {
    return NextResponse.json({ error: 'parsedContent is required and must be a non-empty array' }, { status: 400 })
  }
  if (!programName || typeof programName !== 'string' || !programName.trim()) {
    return NextResponse.json({ error: 'programName is required' }, { status: 400 })
  }

  try {
    return NextResponse.json(await generatePlan(parsedContent, programName.trim()))
  } catch (err) {
    const message = isAiUnavailable(err) ? err.message : 'Failed to plan the programme'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
