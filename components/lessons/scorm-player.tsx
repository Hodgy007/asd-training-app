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

      if (initialCmi) {
        for (const [k, v] of Object.entries(initialCmi)) {
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
    }

    setup().catch((err) => {
      console.error('SCORM init failed', err)
      setStatus('error')
    })

    return () => {
      cancelled = true
      try { delete (window as any).API } catch {}
    }
  }, [lessonId, moduleId, initialCmi])

  const src = `/api/scorm/${lessonId}/${entryPath}`

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
        <iframe
          title="SCORM content"
          src={src}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          className="h-full w-full"
        />
      </div>
      <p className="text-xs text-muted-foreground" role="status">
        {status === 'saving' && 'Saving progress…'}
        {status === 'saved' && 'Progress saved.'}
        {status === 'error' && 'Could not save progress — check your connection.'}
      </p>
    </div>
  )
}
