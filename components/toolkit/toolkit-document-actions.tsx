'use client'

import { useEffect, useState } from 'react'
import { Download, ExternalLink } from 'lucide-react'
import { ToolkitLeadModal } from './toolkit-lead-modal'

type ToolkitDocumentActionsProps = {
  documentId: string
  documentTitle: string
  fileName: string
}

type GateState = { ready: true; needsForm: boolean } | { ready: false }

// The download/view buttons are gated behind the lead-capture modal for
// anyone who isn't already known (NextAuth session OR toolkit-session
// cookie). One round-trip to /api/toolkit/me on first interaction so we
// don't show the form to repeat visitors.
export function ToolkitDocumentActions({ documentId, documentTitle, fileName }: ToolkitDocumentActionsProps) {
  const [gate, setGate] = useState<GateState>({ ready: false })
  const [pendingAction, setPendingAction] = useState<null | { kind: 'download' | 'view' }>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/toolkit/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled) return
        if (j && (j.authenticated || j.registrant)) {
          setGate({ ready: true, needsForm: false })
        } else {
          setGate({ ready: true, needsForm: true })
        }
      })
      .catch(() => {
        if (!cancelled) setGate({ ready: true, needsForm: true })
      })
    return () => {
      cancelled = true
    }
  }, [])

  function urlFor(kind: 'download' | 'view'): string {
    const base = `/api/toolkit/documents/${documentId}/file`
    return kind === 'view' ? `${base}?disposition=inline` : base
  }

  function handleClick(kind: 'download' | 'view') {
    return (e: React.MouseEvent) => {
      if (!gate.ready) {
        // Don't navigate yet — wait for the gate to resolve.
        e.preventDefault()
        return
      }
      if (gate.needsForm) {
        e.preventDefault()
        setPendingAction({ kind })
        setModalOpen(true)
      }
    }
  }

  function handleSuccess(_fileUrl: string) {
    setModalOpen(false)
    setGate({ ready: true, needsForm: false })
    if (!pendingAction) return
    const url = urlFor(pendingAction.kind)
    if (pendingAction.kind === 'view') {
      window.open(url, '_blank', 'noopener,noreferrer')
    } else {
      window.location.href = url
    }
    setPendingAction(null)
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={urlFor('view')}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick('view')}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#f5821f] focus:ring-offset-2"
        >
          <ExternalLink className="h-4 w-4" />
          View
        </a>
        <a
          href={urlFor('download')}
          download={fileName}
          onClick={handleClick('download')}
          className="inline-flex items-center gap-2 rounded-lg bg-[#f5821f] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#d96f18] focus:outline-none focus:ring-2 focus:ring-[#f5821f] focus:ring-offset-2"
        >
          <Download className="h-4 w-4" />
          Download
        </a>
      </div>

      <ToolkitLeadModal
        open={modalOpen}
        documentId={documentId}
        documentTitle={documentTitle}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  )
}
