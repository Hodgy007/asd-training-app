'use client'

import { useEffect, useRef, useState } from 'react'

interface ScormPlayerProps {
  lessonId: string
  moduleId: string
  entryPath: string
  initialCmi?: Record<string, string>
}

export function ScormPlayer({ lessonId, moduleId, entryPath, initialCmi }: ScormPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const initialCmiRef = useRef(initialCmi)
  const [apiReady, setApiReady] = useState(false)
  const [initFailed, setInitFailed] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'saving' | 'error'>('idle')

  useEffect(() => {
    let cancelled = false
    let api: any = null

    async function setup() {
      const mod = await import('scorm-again')
      if (cancelled) return

      const Scorm12API = (mod as any).Scorm12API ?? (mod as any).default?.Scorm12API
      if (!Scorm12API) throw new Error('scorm-again: Scorm12API not found')

      api = new Scorm12API({
        autocommit: true,
        autocommitSeconds: 30,
        logLevel: 4, // errors only
      })

      const seed = initialCmiRef.current
      if (seed) {
        for (const [k, v] of Object.entries(seed)) {
          try { api.loadFromJSON({ [k]: v }) } catch {}
        }
      }

      ;(window as any).API = api

      api.on('LMSCommit', async () => {
        setStatus('saving')
        const cmi = api.renderCommitCMI(true) ?? api.cmi?.toJSON?.() ?? {}
        try {
          const res = await fetch('/api/training/progress/scorm', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ moduleId, lessonId, cmi }),
          })
          setStatus(res.ok ? 'saved' : 'error')
        } catch {
          setStatus('error')
        }
      })

      setApiReady(true)
    }

    setup().catch((err) => {
      console.error('SCORM init failed', err)
      if (!cancelled) setInitFailed(true)
    })

    return () => {
      cancelled = true
      try { api?.terminate?.('Terminate', true) } catch {}
      try { delete (window as any).API } catch {}
    }
  }, [lessonId, moduleId])

  const src = `/api/scorm/${lessonId}/${entryPath.split('/').map(encodeURIComponent).join('/')}`

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
        {initFailed ? (
          <div
            className="flex h-full w-full flex-col items-center justify-center px-6 text-center text-sm text-white/90"
            role="alert"
            aria-live="polite"
          >
            <p className="font-semibold">This lesson couldn&rsquo;t load.</p>
            <p className="mt-1 text-xs text-white/70">
              Please refresh the page to try again. If it keeps failing, contact your administrator.
            </p>
          </div>
        ) : apiReady ? (
          <iframe
            title="SCORM content"
            src={src}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            className="h-full w-full"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-xs text-white/70"
            role="status"
            aria-live="polite"
          >
            Loading your lesson…
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
        {status === 'saving' && 'Saving progress…'}
        {status === 'saved' && 'Progress saved.'}
        {status === 'error' && 'Could not save progress — check your connection.'}
      </p>
    </div>
  )
}
