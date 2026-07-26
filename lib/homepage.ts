import { prisma } from './prisma'
import { homeBlocksSchema, type HomeBlock } from './home-blocks'

/**
 * Fixed id of the platform-wide default homepage row.
 *
 * The default is identified by this id rather than by `organisationId IS NULL`,
 * because PostgreSQL allows multiple NULLs in a unique index — so upserting on
 * organisationId could silently create a second "default". Every write to the
 * default goes through this id, so there can only ever be one.
 */
export const DEFAULT_HOMEPAGE_ID = 'default'

export interface ResolvedHomePage {
  blocks: HomeBlock[]
  /** True when the organisation has its own page; false when showing the default. */
  isOrgSpecific: boolean
  updatedAt: Date | null
}

const EMPTY: ResolvedHomePage = { blocks: [], isOrgSpecific: false, updatedAt: null }

/** Parse a stored blocks payload, tolerating rows written by an older schema. */
function parseBlocks(raw: unknown): HomeBlock[] | null {
  const parsed = homeBlocksSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

/**
 * Resolve the homepage a viewer should see.
 *
 * An organisation's own page wins; otherwise the platform default is used. An
 * org page that exists but holds no blocks is treated as "not set" and falls
 * through to the default, so clearing every block doesn't strand an org on a
 * blank page.
 *
 * Both rows are fetched in one query rather than sequentially — the fallback is
 * the common case, so a second round trip would be paid on nearly every load.
 */
export async function resolveHomePage(
  organisationId: string | null | undefined
): Promise<ResolvedHomePage> {
  const rows = await prisma.homePage.findMany({
    where: {
      OR: [
        { id: DEFAULT_HOMEPAGE_ID },
        ...(organisationId ? [{ organisationId }] : []),
      ],
    },
    select: { id: true, organisationId: true, blocks: true, updatedAt: true },
  })

  const orgRow = organisationId ? rows.find((r) => r.organisationId === organisationId) : undefined
  const orgBlocks = orgRow ? parseBlocks(orgRow.blocks) : null
  if (orgBlocks && orgBlocks.length > 0) {
    return { blocks: orgBlocks, isOrgSpecific: true, updatedAt: orgRow!.updatedAt }
  }

  const defaultRow = rows.find((r) => r.id === DEFAULT_HOMEPAGE_ID)
  const defaultBlocks = defaultRow ? parseBlocks(defaultRow.blocks) : null
  if (!defaultBlocks) return EMPTY

  return { blocks: defaultBlocks, isOrgSpecific: false, updatedAt: defaultRow!.updatedAt }
}

/**
 * Load a homepage for editing. Unlike resolveHomePage this does NOT fall back —
 * an editor opening an org's page must see that org's own content (or an empty
 * canvas), never the default's, or saving would copy the default into the org.
 */
export async function loadHomePageForEdit(organisationId: string | null): Promise<{
  blocks: HomeBlock[]
  updatedAt: Date | null
}> {
  const row = organisationId
    ? await prisma.homePage.findUnique({ where: { organisationId } })
    : await prisma.homePage.findUnique({ where: { id: DEFAULT_HOMEPAGE_ID } })

  if (!row) return { blocks: [], updatedAt: null }
  return { blocks: parseBlocks(row.blocks) ?? [], updatedAt: row.updatedAt }
}

/** Create or replace a homepage. `organisationId` null targets the default. */
export async function saveHomePage(
  organisationId: string | null,
  blocks: HomeBlock[],
  updatedBy: string
): Promise<{ updatedAt: Date }> {
  if (organisationId === null) {
    const row = await prisma.homePage.upsert({
      where: { id: DEFAULT_HOMEPAGE_ID },
      update: { blocks, updatedBy },
      create: { id: DEFAULT_HOMEPAGE_ID, organisationId: null, blocks, updatedBy },
    })
    return { updatedAt: row.updatedAt }
  }

  const row = await prisma.homePage.upsert({
    where: { organisationId },
    update: { blocks, updatedBy },
    create: { organisationId, blocks, updatedBy },
  })
  return { updatedAt: row.updatedAt }
}

/** Remove an organisation's override so its members fall back to the default. */
export async function deleteOrgHomePage(organisationId: string): Promise<void> {
  await prisma.homePage.deleteMany({ where: { organisationId } })
}
