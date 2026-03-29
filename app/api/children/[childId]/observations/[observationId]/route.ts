import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { childId: string; observationId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'CAREGIVER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify child ownership
  const child = await prisma.child.findFirst({
    where: { id: params.childId, userId: session.user.id },
  })
  if (!child) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Verify observation belongs to this child
  const observation = await prisma.observation.findFirst({
    where: { id: params.observationId, childId: params.childId },
  })
  if (!observation) return NextResponse.json({ error: 'Observation not found' }, { status: 404 })

  await prisma.observation.delete({ where: { id: params.observationId } })
  return NextResponse.json({ success: true })
}
