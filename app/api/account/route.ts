import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // Prevent admin from self-deleting via this route (use admin panel)
  if (session.user.role === 'SUPER_ADMIN') {
    return NextResponse.json(
      { error: 'Admin accounts cannot be self-deleted. Contact another administrator.' },
      { status: 403 }
    )
  }

  await prisma.user.delete({ where: { id: session.user.id } })

  return NextResponse.json({ message: 'Account deleted.' })
}
