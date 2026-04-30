import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { getToolkitLibraryReport } from '@/lib/toolkit'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_LIBRARY)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const range = req.nextUrl.searchParams.get('range') ?? 'all'
  const report = await getToolkitLibraryReport(prisma, { range })

  return NextResponse.json(report)
}
