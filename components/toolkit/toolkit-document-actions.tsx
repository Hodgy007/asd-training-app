'use client'

import { Download, ExternalLink } from 'lucide-react'

type ToolkitDocumentActionsProps = {
  documentId: string
  fileUrl: string
  fileName: string
}

async function trackToolkitEvent(documentId: string, action: 'view' | 'download') {
  try {
    await fetch(`/api/toolkit/documents/${documentId}/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
      keepalive: true,
    })
  } catch {
    // Tracking is best-effort so document access is never blocked.
  }
}

export function ToolkitDocumentActions({ documentId, fileUrl, fileName }: ToolkitDocumentActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackToolkitEvent(documentId, 'view')}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#f5821f] focus:ring-offset-2"
      >
        <ExternalLink className="h-4 w-4" />
        Open
      </a>
      <a
        href={fileUrl}
        download={fileName}
        onClick={() => trackToolkitEvent(documentId, 'download')}
        className="inline-flex items-center gap-2 rounded-lg bg-[#f5821f] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#d96f18] focus:outline-none focus:ring-2 focus:ring-[#f5821f] focus:ring-offset-2"
      >
        <Download className="h-4 w-4" />
        Download
      </a>
    </div>
  )
}
