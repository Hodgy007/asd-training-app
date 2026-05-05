'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { ToolkitLeadModal } from './toolkit-lead-modal'

type GateState = { ready: true; needsForm: boolean } | { ready: false }

type PendingDownload = {
  documentId: string
  documentTitle: string
  fileName: string
  kind: 'download' | 'view'
}

type Ctx = {
  gate: GateState
  requestDownload: (req: PendingDownload) => void
}

const ToolkitLeadModalContext = createContext<Ctx | null>(null)

export function useToolkitLeadModal(): Ctx {
  const ctx = useContext(ToolkitLeadModalContext)
  if (!ctx) {
    // Outside the host (or rendering server-side) — return a permissive
    // gate so the link's default href works (server already auth-gates
    // the download endpoint, and the host wires up the modal in CSR).
    return {
      gate: { ready: false },
      requestDownload: () => {},
    }
  }
  return ctx
}

// Page-level host: owns the single modal instance + the "are we already
// known to the toolkit" gate (one /api/toolkit/me roundtrip per page,
// not per tile). Click handlers in tile actions call requestDownload()
// to either navigate directly (gate clear) or open the modal.
export function ToolkitLeadModalHost({ children }: { children: ReactNode }) {
  const [gate, setGate] = useState<GateState>({ ready: false })
  const [pending, setPending] = useState<PendingDownload | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/toolkit/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled) return
        const known = !!(j && (j.authenticated || j.registrant))
        setGate({ ready: true, needsForm: !known })
      })
      .catch(() => {
        if (!cancelled) setGate({ ready: true, needsForm: true })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const navigateTo = useCallback((req: PendingDownload) => {
    const base = `/api/toolkit/documents/${req.documentId}/file`
    const url = req.kind === 'view' ? `${base}?disposition=inline` : base
    if (req.kind === 'view') window.open(url, '_blank', 'noopener,noreferrer')
    else window.location.href = url
  }, [])

  const requestDownload = useCallback((req: PendingDownload) => {
    if (!gate.ready) return
    if (!gate.needsForm) {
      navigateTo(req)
      return
    }
    setPending(req)
    setModalOpen(true)
  }, [gate, navigateTo])

  function handleSuccess(_fileUrl: string) {
    setModalOpen(false)
    setGate({ ready: true, needsForm: false })
    if (pending) navigateTo(pending)
    setPending(null)
  }

  return (
    <ToolkitLeadModalContext.Provider value={{ gate, requestDownload }}>
      {children}
      <ToolkitLeadModal
        open={modalOpen}
        documentId={pending?.documentId ?? ''}
        documentTitle={pending?.documentTitle ?? ''}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </ToolkitLeadModalContext.Provider>
  )
}
