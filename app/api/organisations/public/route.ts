import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const MAX_LIMIT = 50
const DEFAULT_LIMIT = 20

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search = (searchParams.get('search') ?? '').trim()
  const parsedLimit = parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10)
  const limit = Math.min(Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : DEFAULT_LIMIT, MAX_LIMIT)

  // Don't dump the directory: when no search query is provided we return an
  // empty array. The typeahead is only useful when the user has typed
  // something; an empty input means "don't show suggestions yet".
  if (search.length < 2) {
    return NextResponse.json([])
  }

  const where: Prisma.OrganisationWhereInput = {
    active: true,
    pendingApproval: false,
    orgType: 'ORGANISATION',
    name: { contains: search, mode: 'insensitive' },
  }

  const orgs = await prisma.organisation.findMany({
    where,
    select: { id: true, name: true, organisationType: true },
    orderBy: { name: 'asc' },
    take: limit,
  })
  return NextResponse.json(orgs)
}
