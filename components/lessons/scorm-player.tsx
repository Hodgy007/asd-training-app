'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * Mirror of the manifest parser's `ScormTocItem`. Kept duplicated as a plain
 * type here so the (server-only) parser code isn't pulled into the client
 * bundle.
 */
export interface ScormTocItem {
  id: string
  title: string
  href?: string
  children: ScormTocItem[]
}

interface ScormPlayerProps {
  lessonId: string
  moduleId: string
  /** Default landing page (path-only, no querystring). */
  entryPath: string
  /** SCORM version: drives runtime + window-global selection. */
  version?: '1.2' | '2004' | null
  /** Optional table of contents from the manifest's `<organization>` tree. */
  toc?: ScormTocItem[] | null
  initialCmi?: Record<string, string>
  /**
   * Saved TOC navigation position from a prior session, persisted in
   * `TrainingProgress.interactionData.navLocation`. When present and it
   * matches a known leaf in the TOC, the player resumes there instead of
   * the manifest-derived entryPath. Stored *outside* the SCO's CMI so we
   * never clobber a SCO that uses `cmi.core.lesson_location` for its own
   * internal state.
   */
  initialNavLocation?: string | null
}

/**
 * Build the iframe URL for a given relative href (which may include a
 * `?querystring`). The path segments are encoded; the querystring is
 * appended verbatim.
 */
function buildIframeSrc(lessonId: string, hrefWithMaybeQuery: string): string {
  const q = hrefWithMaybeQuery.indexOf('?')
  const path = q === -1 ? hrefWithMaybeQuery : hrefWithMaybeQuery.slice(0, q)
  const query = q === -1 ? '' : hrefWithMaybeQuery.slice(q)
  const encoded = path.split('/').map(encodeURIComponent).join('/')
  return `/api/scorm/${lessonId}/${encoded}${query}`
}

function flattenLeaves(items: ScormTocItem[]): ScormTocItem[] {
  const out: ScormTocItem[] = []
  for (const item of items) {
    if (item.href) out.push(item)
    if (item.children.length > 0) out.push(...flattenLeaves(item.children))
  }
  return out
}

export function ScormPlayer({
  lessonId,
  moduleId,
  entryPath,
  version,
  toc,
  initialCmi,
  initialNavLocation,
}: ScormPlayerProps) {
  const initialCmiRef = useRef(initialCmi)
  const apiRef = useRef<any>(null)
  const [apiReady, setApiReady] = useState(false)
  const [initFailed, setInitFailed] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'saving' | 'error'>('idle')

  // Pre-compute the flat list of leaves so the active-row highlight in the
  // sidebar doesn't depend on a recursive search every render.
  const leaves = useMemo(() => flattenLeaves(toc ?? []), [toc])

  // The currently-displayed item's href (may include `?params`). Resumes
  // from `initialNavLocation` if it matches a known leaf, otherwise starts
  // at the manifest-derived entry path.
  const [currentHref, setCurrentHref] = useState<string>(() => {
    if (!initialNavLocation || leaves.length === 0) return entryPath
    const known = leaves.some((l) => l.href === initialNavLocation)
    return known ? initialNavLocation : entryPath
  })
  // Mirror of `currentHref` accessed from the (non-React) commit handler so
  // it captures the freshest value at flush time, not the snapshot from when
  // the handler was registered.
  const currentHrefRef = useRef(currentHref)

  // Pick the leaf whose path matches the iframe's current src. When the
  // entry first loads we may not have a matching leaf (legacy single-SCO
  // packages have no TOC at all, so `leaves` is empty).
  const currentPath = currentHref.split('?')[0]
  const activeLeafId = leaves.find((l) => (l.href ?? '').split('?')[0] === currentPath)?.id ?? null

  const isScorm2004 = version === '2004'

  useEffect(() => {
    let cancelled = false
    let api: any = null
    const globalKey = isScorm2004 ? 'API_1484_11' : 'API'

    async function setup() {
      const mod: any = await import('scorm-again')
      if (cancelled) return

      const ApiCtor = isScorm2004
        ? mod.Scorm2004API ?? mod.default?.Scorm2004API
        : mod.Scorm12API ?? mod.default?.Scorm12API
      if (!ApiCtor) {
        throw new Error(
          `scorm-again: ${isScorm2004 ? 'Scorm2004API' : 'Scorm12API'} not found`,
        )
      }

      api = new ApiCtor({
        autocommit: true,
        autocommitSeconds: 30,
        logLevel: 4,
      })

      const seed = initialCmiRef.current
      if (seed) {
        for (const [k, v] of Object.entries(seed)) {
          try { api.loadFromJSON({ [k]: v }) } catch {}
        }
      }

      // Expose the API on the parent window so SCOs (with allow-same-origin)
      // can find it via the standard SCORM discovery walk through window.parent.
      ;(window as any)[globalKey] = api
      apiRef.current = api

      const persistCommit = async () => {
        setStatus('saving')
        const cmi = api.renderCommitCMI(true) ?? api.cmi?.toJSON?.() ?? {}
        try {
          const res = await fetch('/api/training/progress/scorm', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              moduleId,
              lessonId,
              cmi,
              navLocation: currentHrefRef.current,
            }),
          })
          setStatus(res.ok ? 'saved' : 'error')
        } catch {
          setStatus('error')
        }
      }
      api.on(isScorm2004 ? 'Commit' : 'LMSCommit', persistCommit)

      setApiReady(true)
    }

    setup().catch((err) => {
      console.error('SCORM init failed', err)
      if (!cancelled) setInitFailed(true)
    })

    return () => {
      cancelled = true
      apiRef.current = null
      try { api?.terminate?.('Terminate', true) } catch {}
      try { delete (window as any)[globalKey] } catch {}
    }
  }, [lessonId, moduleId, isScorm2004])

  // Navigate to a TOC item. Updates the iframe src and fires a SCORM Commit
  // so the new nav position is persisted before the user can leave the page.
  const handleSelect = useCallback(
    (href: string) => {
      currentHrefRef.current = href
      setCurrentHref(href)
      const api = apiRef.current
      if (!api) return
      try {
        if (isScorm2004) api.Commit?.('')
        else api.LMSCommit?.('')
      } catch (err) {
        console.warn('SCORM commit-on-nav failed', err)
      }
    },
    [isScorm2004],
  )

  const src = buildIframeSrc(lessonId, currentHref)
  const hasToc = leaves.length > 0

  return (
    <div className="space-y-2">
      <div className={hasToc ? 'flex flex-col gap-3 lg:flex-row' : ''}>
        {hasToc && (
          <nav
            aria-label="Course contents"
            className="w-full shrink-0 rounded-lg border bg-white text-sm dark:bg-slate-800 dark:border-slate-700 lg:w-72"
          >
            <div className="border-b px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Contents
            </div>
            <ul className="max-h-[60vh] overflow-y-auto p-2">
              {(toc ?? []).map((item) => (
                <TocNode
                  key={item.id}
                  item={item}
                  depth={0}
                  activeId={activeLeafId}
                  onSelect={handleSelect}
                />
              ))}
            </ul>
          </nav>
        )}

        <div className="w-full flex-1 min-h-[600px] h-[70vh] overflow-hidden rounded-lg border bg-white dark:bg-slate-900">
          {initFailed ? (
            <div
              className="flex h-full w-full flex-col items-center justify-center px-6 text-center text-sm text-slate-700 dark:text-slate-200"
              role="alert"
              aria-live="polite"
            >
              <p className="font-semibold">This lesson couldn&rsquo;t load.</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Please refresh the page to try again. If it keeps failing, contact your administrator.
              </p>
            </div>
          ) : apiReady ? (
            <iframe
              title="SCORM content"
              src={src}
              // `allow-same-origin` is required so SCO subresource requests
              // (CSS/JS/images served back from /api/scorm/...) carry the
              // session cookie and pass auth. The browser will warn about
              // sandbox-escape risk; tracked separately for a signed-URL
              // hardening pass.
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              className="h-full w-full bg-white"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-xs text-slate-500 dark:text-slate-400"
              role="status"
              aria-live="polite"
            >
              Loading your lesson…
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
        {status === 'saving' && 'Saving progress…'}
        {status === 'saved' && 'Progress saved.'}
        {status === 'error' && 'Could not save progress — check your connection.'}
      </p>
    </div>
  )
}

interface TocNodeProps {
  item: ScormTocItem
  depth: number
  activeId: string | null
  onSelect: (href: string) => void
}

function TocNode({ item, depth, activeId, onSelect }: TocNodeProps) {
  const isLeaf = !!item.href
  const isActive = isLeaf && item.id === activeId
  const indent = { paddingInlineStart: `${0.5 + depth * 0.75}rem` }

  return (
    <li>
      {isLeaf ? (
        <button
          type="button"
          onClick={() => item.href && onSelect(item.href)}
          aria-current={isActive ? 'page' : undefined}
          style={indent}
          className={`block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 ${
            isActive
              ? 'bg-primary-50 font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
              : 'text-slate-700 dark:text-slate-200'
          }`}
        >
          {item.title || 'Untitled'}
        </button>
      ) : (
        <div
          style={indent}
          className="px-2 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400"
        >
          {item.title || 'Section'}
        </div>
      )}
      {item.children.length > 0 && (
        <ul>
          {item.children.map((child) => (
            <TocNode
              key={child.id}
              item={child}
              depth={depth + 1}
              activeId={activeId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
