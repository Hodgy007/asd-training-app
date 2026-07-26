import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * Every destination in the navigation must resolve to a real page.
 *
 * The nav items are hand-maintained string literals, so a link can outlive its
 * page (or arrive before it) with nothing failing. That is exactly what
 * happened to the org-admin "Audit Log" item, which pointed at `/admin/audit`
 * — a path with no page, no API and no model anywhere in the repo — and
 * shipped to org admins as a not-found page.
 *
 * These files are `'use client'` components whose nav arrays are module-level
 * constants, not exports, so we read the hrefs out of the source rather than
 * importing them. That keeps the test from forcing a refactor of the
 * components purely to make them testable.
 */

const repoRoot = resolve(__dirname, '../../..')
const appDir = join(repoRoot, 'app')

/**
 * Every URL path the App Router serves a page for.
 *
 * Route groups — `(dashboard)`, `(org-admin)` — are organisational only and
 * contribute nothing to the URL, so they're dropped. Dynamic segments are
 * collected separately: nav items point at static paths, and matching them
 * loosely against `[id]` routes would let a typo through.
 */
function collectRoutes(dir: string, urlPath = ''): { static: Set<string>; dynamic: string[] } {
  const staticRoutes = new Set<string>()
  const dynamicRoutes: string[] = []

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    // Private folders and colocated tests never produce routes.
    if (entry.name.startsWith('_') || entry.name === '__tests__') continue

    const isRouteGroup = entry.name.startsWith('(') && entry.name.endsWith(')')
    const isDynamic = entry.name.startsWith('[')
    const childPath = isRouteGroup ? urlPath : `${urlPath}/${entry.name}`
    const childDir = join(dir, entry.name)

    if (existsSync(join(childDir, 'page.tsx')) || existsSync(join(childDir, 'page.ts'))) {
      if (isDynamic || childPath.includes('[')) dynamicRoutes.push(childPath)
      else staticRoutes.add(childPath)
    }

    const nested = collectRoutes(childDir, childPath)
    nested.static.forEach((r) => staticRoutes.add(r))
    dynamicRoutes.push(...nested.dynamic)
  }

  return { static: staticRoutes, dynamic: dynamicRoutes }
}

/** Pull every `href: '...'` literal out of a nav source file. */
function hrefsIn(relativePath: string): string[] {
  const source = readFileSync(join(repoRoot, relativePath), 'utf8')
  const matches = source.matchAll(/href:\s*'([^']+)'/g)
  return [...matches].map((m) => m[1])
}

const NAV_SOURCES = [
  'components/layout/sidebar.tsx',
  'components/layout/org-admin-sidebar.tsx',
  'components/layout/super-admin-sidebar.tsx',
  'app/(super-admin)/super-admin/products/page.tsx',
]

const routes = collectRoutes(appDir)

describe('navigation links', () => {
  it('finds the app router pages', () => {
    // Guard against the walker silently returning nothing — without this, every
    // assertion below would pass vacuously if the directory layout changed.
    expect(routes.static.size).toBeGreaterThan(20)
    expect(routes.static.has('/admin')).toBe(true)
    expect(routes.static.has('/super-admin')).toBe(true)
  })

  it.each(NAV_SOURCES)('every href in %s resolves to a page', (source) => {
    const hrefs = hrefsIn(source)
    expect(hrefs.length).toBeGreaterThan(0)

    // Template literals (e.g. `/training/${program.id}`) aren't matched by the
    // single-quote pattern above, so everything collected here is static.
    const broken = hrefs
      .map((href) => href.split(/[?#]/)[0])
      .filter((path) => path.startsWith('/'))
      .filter((path) => !routes.static.has(path))

    expect(broken, `no page found for: ${broken.join(', ')}`).toEqual([])
  })

  it('has no dead link left in the org admin sidebar', () => {
    // The specific regression: /admin/audit was in the nav for months with
    // nothing behind it.
    expect(hrefsIn('components/layout/org-admin-sidebar.tsx')).not.toContain('/admin/audit')
  })
})
