import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organisationId) {
    return NextResponse.json({ error: 'No organisation' }, { status: 400 })
  }

  const org = await prisma.organisation.findUnique({
    where: { id: session.user.organisationId },
    select: { allowedRoles: true, allowedProgramIds: true, name: true },
  })

  return NextResponse.json(org)
}
