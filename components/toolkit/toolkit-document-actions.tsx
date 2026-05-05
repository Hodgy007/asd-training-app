'use client'

import { Download, ExternalLink } from 'lucide-react'
import { useToolkitLeadModal } from './toolkit-lead-modal-host'

type ToolkitDocumentActionsProps = {
  documentId: string
  documentTitle: string
  fileName: string
}

// Per-tile action buttons. Modal state + the "is this visitor already
// known" gate live in the page-level <ToolkitLeadModalHost>. When the
// gate is clear we navigate directly; otherwise the host opens its
// shared modal (one instance per page, portaled to body so it escapes
// each tile's overflow:hidden / transform clipping).
export function ToolkitDocumentActions({ documentId, documentTitle, fileName }: ToolkitDocumentActionsProps) {
  const { gate, requestDownload } = useToolkitLeadModal()

  function urlFor(kind: 'download' | 'view'): string {
    const base = `/api/toolkit/documents/${documentId}/file`
    return kind === 'view' ? `${base}?disposition=inline` : base
  }

  function handleClick(kind: 'download' | 'view') {
    return (e: React.MouseEvent) => {
      // While the gate is resolving, don't navigate — the host needs the
      // /api/toolkit/me result to know whether to gate the click.
      if (!gate.ready) {
        e.preventDefault()
        return
      }
      if (gate.needsForm) {
        e.preventDefault()
        requestDownload({ documentId, documentTitle, fileName, kind })
      }
      // gate.ready && !gate.needsForm → let the link's default action navigate.
    }
  }

  return (
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
  )
}
